import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { randomUUID, createHmac } from "node:crypto";
import { recordRevision } from "@/lib/db/revision";
import { editOperation } from "@/lib/auth/edit-actions";
import { sendProviderTest } from "@/lib/auth/email-actions";
const cookieJar = vi.hoisted(() => new Map<string, { value: string; options?: Record<string, unknown> }>());
const emailSend = vi.hoisted(() => vi.fn());
vi.mock("resend", async importOriginal => {
  const original = await importOriginal<typeof import("resend")>();
  return { ...original, Resend: class extends original.Resend { constructor(key?: string) { super(key); this.emails.send = emailSend; } } };
});
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: (key: string) => cookieJar.get(key), set: (key: string, value: string, options: Record<string, unknown>) => cookieJar.set(key,{value,options}), delete: (key: string) => cookieJar.delete(key) }) }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
import { withStore } from "@/lib/db/store";
import { users, addresses, boxes, shipments, invoices, trucks, warehouses } from "@/lib/db/collections";
import { runMutation } from "@/lib/db/mutation";
import { invoiceTotal } from "@/lib/utils/invoices";
import { manageSupportTicket, registerDelivery } from "@/lib/auth/operations-actions";
import { createPrealert, createClientShipment, upsertClientRecipient, createSupportTicket, replySupportTicket, reportInvoicePayment, deleteClientRecipient } from "@/lib/auth/client-actions";
import { removeBoxFromTruck, updateTruck, approvePayment as approvePaymentAction, rejectPayment } from "@/lib/auth/admin-actions";
import { saveSystemConfig } from "@/lib/auth/admin-actions";
import { configService } from "@/lib/services/config";
import { receiveBoxWithPhoto as receiveBoxWithPhotoAction, reportPaymentWithReceipt, collectDestinationPayment as collectDestinationPaymentAction } from "@/lib/auth/file-actions";
import { GET as downloadPrivateFile } from "@/app/api/files/[id]/route";
import { pool } from "@/lib/db/pool";
import { accountById, createAccount, consumeToken, issueToken, findAccount, sql, allowAttempt, synchronizeAccount, setPassword } from "@/lib/auth/repository";
import { authenticate, getSession } from "@/lib/auth/actions";
import { createSessionToken, verifySessionToken, deleteSession } from "@/lib/auth/session";
import { registerAccount, requestPasswordReset, resetPassword, verifyEmail } from "@/lib/auth/user-actions";
import { upsertClientAddress, deleteClientAddress, updateClientProfile, changeClientPassword } from "@/lib/auth/client-actions";
import { toggleCustomerStatus, createCustomerAtReception, receiveBox, createTruck as createNewTruck, assignBoxToTruck, transitionTruckState, saveFlowConfig } from "@/lib/auth/admin-actions";
import { DEFAULT_FLOW_CONFIG } from "@/lib/config/flow";
import { DESTINATION_CITIES } from "@/lib/config/operations";
import { logisticsService } from "@/lib/services/logistics";
import { checkPassword } from "@/lib/auth/crypto";
import { sendEmail, decryptEmail, deliverPendingEmails } from "@/lib/services/email";
import { renderEmail } from "@/lib/services/email-template";
import { POST as webhook } from "@/app/api/webhooks/resend/route";

import { saveWarehouse, saveWarehouseOperator, getWarehouseAdministration, getDestinationDesk, saveTruckStops, scanLoad, scanUnload, saveAdminPrealert, selectPrealertAtWarehouse } from "@/lib/auth/warehouse-actions";
// Existing scenarios exercise historical single-stop trips. New-route tests use createNewTruck directly.
async function createTruck(input: Parameters<typeof createNewTruck>[0]) {
  const result=await createNewTruck(input);
  if(result.ok)await withStore(async()=>{const truck=trucks.find(t=>t.id===result.truck.id)!;delete truck.stops;},true);
  return result;
}
async function receiveBoxWithPhoto(input:unknown,data:FormData,payment?:unknown){return receiveBoxWithPhotoAction(input,data,payment&&typeof payment==="object"?{warehouseId:"qa-location",...payment}:payment);}
async function collectDestinationPayment(id:string,input:unknown,data:FormData){return collectDestinationPaymentAction(id,input&&typeof input==="object"?{warehouseId:"qa-location",...input}:input,data);}
async function approvePayment(id:string,note:string,expected?:string){return approvePaymentAction(id,note,expected,"qa-location");}
const database = `ayl_test_${randomUUID().replaceAll("-", "")}`;
let root: mysql.Connection;
const customer = { firstName:"Prueba",paternalLastName:"Local",email:"test@example.invalid",phone:"5512345678",street:"Prueba",exteriorNumber:"10",neighborhood:"Centro",postalCode:"06000",municipality:"Cuauhtémoc",state:"Ciudad de México" };
const password = "InitialTest123!";
let userId = "";
let locker = "";
let operationClient = "";
let clientSession = "";
let adminSession = "";
let operationInvoice = "";
beforeAll(async () => {
  process.loadEnvFile(".env.local");
  const url = new URL(process.env.DATABASE_URL!);
  root = await mysql.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),multipleStatements:true});
  await root.query(`CREATE DATABASE \`${database}\``);
  await root.changeUser({database});
  await root.query(await readFile(new URL("../migrations/001-real-system.sql",import.meta.url),"utf8"));
  await root.query(await readFile(new URL("../migrations/002-private-files.sql",import.meta.url),"utf8"));
  await root.query(await readFile(new URL("../migrations/003-warehouse-operators.sql",import.meta.url),"utf8"));
  url.pathname=`/${database}`; process.env.DATABASE_URL=url.toString();
  process.env.AUTH_SECRET="integration-only-secret-with-at-least-32-characters";
  process.env.EMAIL_DELIVERY="preview";
  const result = await withStore(() => createAccount(customer,password),true);
  userId=result.user.id; locker=result.user.lockerCode;
  await withStore(async()=>{warehouses.push({id:"qa-location",name:"Ubicación QA",city:DESTINATION_CITIES[0],active:true,arrivalMessage:"Paquete recibido en almacén de pruebas."});},true);
});
afterAll(async () => {
  if (!root) return;
  await pool().end();
  // Only the unique database created by this suite; never ayl_real or an existing database.
  if (/^ayl_test_[a-f0-9]{32}$/.test(database)) await root.query(`DROP DATABASE \`${database}\``);
  await root.end();
});
describe.sequential("Real MySQL authentication and operations", () => {
  it("persists accounts and address without plaintext passwords", async () => {
    const account = await accountById(userId);
    expect(account?.password_hash).toMatch(/^scrypt\$32768\$/);
    expect(await checkPassword(password,account!.password_hash)).toBe(true);
    expect(await checkPassword("wrong",account!.password_hash)).toBe(false);
    expect(await withStore(async () => addresses.filter(item=>item.userId===userId).length)).toBe(1);
    const [records] = await root.query<mysql.RowDataPacket[]>("SELECT payload FROM entities WHERE collection_name='users'");
    expect(JSON.stringify(records)).not.toContain(password);
  });
  it("denies login before verification and removes the fixed demo token", async () => {
    expect((await authenticate(customer.email,password)).ok).toBe(false);
    expect(await consumeToken("demo-token","reset","Updated123!")).toBeNull();
  });
  it("verifies once and logs in by email and locker with remember cookie", async () => {
    const token=await withStore(()=>issueToken(userId,"verify"),true);
    expect((await verifyEmail(token)).ok).toBe(true);
    expect((await verifyEmail(token)).ok).toBe(false);
    expect((await authenticate(customer.email,password)).ok).toBe(true);
    expect(cookieJar.get("ayl_session")?.options?.maxAge).toBeUndefined();
    expect((await authenticate(locker,password,true)).ok).toBe(true);
    expect(cookieJar.get("ayl_session")?.options?.maxAge).toBe(2592000);
    expect((await getSession())?.userId).toBe(userId);
  });
  it("allocates unique lockers in concurrent registrations and rejects duplicates", async () => {
    const input={...customer,email:"parallel@example.invalid",password,confirmPassword:password,acceptedTerms:true};
    const results=await Promise.all([registerAccount(input),registerAccount(input),registerAccount({...input,email:"second@example.invalid"})]);
    expect(results.filter(result=>result.ok)).toHaveLength(2);
    const codes=results.flatMap(result=>result.ok?[result.lockerCode]:[]);
    expect(new Set(codes).size).toBe(2);
  });
  it("keeps rollback atomic across account, profile and queued email", async () => {
    await expect(withStore(async()=>{const result=await createAccount({...customer,email:"rollback@example.invalid"},password);await sendEmail({to:result.user.email,subject:"rollback",heading:"test",body:"test"});throw new Error("rollback");},true)).rejects.toThrow("rollback");
    expect(await findAccount("rollback@example.invalid")).toBeNull();
    expect(await withStore(async()=>users.some(user=>user.email==="rollback@example.invalid"))).toBe(false);
  });
  it("enforces ownership in DAL and action, and denies admin mutations to a client", async () => {
    const other=await withStore(()=>createAccount({...customer,email:"other@example.invalid"},password),true);
    const own=await logisticsService.getAddresses();
    expect(own.every(address=>address.userId===userId)).toBe(true);
    expect((await deleteClientAddress(other.address.id)).ok).toBe(false);
    await expect(toggleCustomerStatus(other.user.id)).rejects.toThrow("REDIRECT");
    expect((await updateClientProfile({...customer,email:"hijack@example.invalid"})).ok).toBe(false);
    const result=await upsertClientAddress({...customer,label:"Nueva"});
    expect(result.ok).toBe(true);
    expect((await logisticsService.getAddresses()).length).toBe(2);
  });
  it("returns the same recovery response for known and unknown addresses", async () => {
    expect(await requestPasswordReset(customer.email)).toEqual(await requestPasswordReset("nobody@example.invalid"));
  });
  it("encrypts queued tokens and does not pretend preview is sent", async () => {
    const [rows]=await root.query<mysql.RowDataPacket[]>("SELECT payload,status FROM email_outbox");
    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(rows)).not.toContain("?token=");
    const payload=typeof rows[0].payload==="string"?JSON.parse(rows[0].payload):rows[0].payload;
    expect(decryptEmail(payload).to).toBeTruthy();
    await deliverPendingEmails();
    const [sent]=await root.query<mysql.RowDataPacket[]>("SELECT id FROM email_outbox WHERE status='sent'");
    expect(sent).toHaveLength(0);
  });
  it("resets exactly once under concurrency and revokes old sessions", async () => {
    const old=cookieJar.get("ayl_session")!.value;
    const token=await withStore(()=>issueToken(userId,"reset"),true);
    const results=await Promise.all([resetPassword({token,password:"Updated123!",confirmPassword:"Updated123!"}),resetPassword({token,password:"Other123!",confirmPassword:"Other123!"})]);
    expect(results.filter(result=>result.ok)).toHaveLength(1);
    expect(await verifySessionToken(old)).toBeNull();
    expect((await authenticate(customer.email,password)).ok).toBe(false);
    expect((await authenticate(customer.email,"Updated123!")).ok).toBe(true);
  });
  it("rejects expired tokens, supports invitation activation and rejects altered sessions", async () => {
    const token=await withStore(()=>issueToken(userId,"reset"),true);
    await sql().execute("UPDATE auth_tokens SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE user_id=? AND purpose='reset'",[userId]);
    expect(await consumeToken(token,"reset","Never123!")).toBeNull();
    const account=await findAccount("other@example.invalid");
    const invite=await withStore(()=>issueToken(account!.user_id,"invite"),true);
    expect(await consumeToken(invite,"reset","Welcome123!")).not.toBeNull();
    expect((await accountById(account!.user_id))?.verified_at).toBeTruthy();
    expect(await verifySessionToken("a".repeat(43))).toBeNull();
  });
  it("changes password using current credential and revokes browser session", async () => {
    const old=cookieJar.get("ayl_session")!.value;
    expect((await changeClientPassword({currentPassword:"bad-password",password:"Final123!",confirmPassword:"Final123!"})).ok).toBe(false);
    expect((await changeClientPassword({currentPassword:"Updated123!",password:"Final123!",confirmPassword:"Final123!"})).ok).toBe(true);
    expect(await verifySessionToken(old)).toBeNull();
  });
  it("disabling accounts revokes sessions permanently, including after reactivation", async () => {
    const token=await createSessionToken(userId,"cliente");
    await withStore(async()=>{const user=users.find(item=>item.id===userId)!;user.active=false;await synchronizeAccount(user);},true);
    expect(await verifySessionToken(token)).toBeNull();
    await withStore(async()=>{const user=users.find(item=>item.id===userId)!;user.active=true;await synchronizeAccount(user);},true);
    expect(await verifySessionToken(token)).toBeNull();
    const next=await createSessionToken(userId,"cliente");await deleteSession(next);expect(await verifySessionToken(next)).toBeNull();
    await setPassword(userId,"Final123!");
  });
  it("persists rate limits and safely escapes premium email HTML", async () => {
    expect(await allowAttempt("limited",1)).toBe(true);expect(await allowAttempt("limited",1)).toBe(false);
    const rendered=renderEmail({to:"x@example.invalid",subject:"test",heading:"<script>bad</script>",body:"A & B",actionUrl:"https://evil.invalid"},"http://localhost:3100");
    expect(rendered.html).not.toContain("<script>");expect(rendered.html).toContain("&lt;script&gt;");expect(rendered.html).not.toContain("https://evil.invalid");expect(rendered.text).toContain("A & B");
  });
  it("delivers the outbox once with idempotency keys and removes secret payloads", async () => {
    process.env.EMAIL_DELIVERY="resend"; process.env.RESEND_API_KEY="mock-not-a-real-key"; process.env.RESEND_FROM_EMAIL="Test <test@example.invalid>";
    emailSend.mockImplementation(async()=>({data:{id:randomUUID()},error:null}));
    await deliverPendingEmails();
    expect(emailSend.mock.calls.length).toBeGreaterThan(0);
    expect(emailSend.mock.calls[0][1].idempotencyKey).toMatch(/^ayl\//);
    emailSend.mockClear();await deliverPendingEmails();expect(emailSend).not.toHaveBeenCalled();
    const [rows]=await root.query<mysql.RowDataPacket[]>("SELECT payload FROM email_outbox WHERE status='sent'");
    expect(rows.every(row=>JSON.stringify(typeof row.payload==='string'?JSON.parse(row.payload):row.payload)==='{}')).toBe(true);
  });
  it("retries failed delivery with a finite limit without losing the notification", async () => {
    const message=await sendEmail({to:"retry@example.invalid",subject:"Test",heading:"Test",body:"Test"});
    emailSend.mockResolvedValue({data:null,error:{name:"validation_error"}});
    for(let attempt=0;attempt<5;attempt++){await root.execute("UPDATE email_outbox SET available_at=UTC_TIMESTAMP() WHERE id=?",[message.id]);await deliverPendingEmails();}
    const [rows]=await root.execute<mysql.RowDataPacket[]>("SELECT status,attempts FROM email_outbox WHERE id=?",[message.id]);
    expect(rows[0]).toMatchObject({status:"failed",attempts:5});
    process.env.EMAIL_DELIVERY="preview";
  });
  it("rejects forged webhooks and deduplicates signed delivery events", async () => {
    const secret=Buffer.from("test-webhook-signing-secret-32bytes").toString("base64");process.env.RESEND_WEBHOOK_SECRET=`whsec_${secret}`;
    expect((await webhook(new Request("http://localhost/api/webhooks/resend",{method:"POST",body:"{}"}))).status).toBe(400);
    const [rows]=await root.query<mysql.RowDataPacket[]>("SELECT provider_id FROM email_outbox WHERE status='sent' LIMIT 1");
    const id=`msg_${randomUUID()}`;const timestamp=String(Math.floor(Date.now()/1000));
    const body=JSON.stringify({type:"email.delivered",created_at:new Date().toISOString(),data:{email_id:rows[0].provider_id,from:"test@example.invalid",to:["test@example.invalid"],subject:"Test",created_at:new Date().toISOString()}});
    const signature=createHmac("sha256",Buffer.from(secret,"base64")).update(`${id}.${timestamp}.${body}`).digest("base64");
    const request=()=>new Request("http://localhost/api/webhooks/resend",{method:"POST",body,headers:{"svix-id":id,"svix-timestamp":timestamp,"svix-signature":`v1,${signature}`}});
    expect((await webhook(request())).status).toBe(200);expect((await webhook(request())).status).toBe(200);
    const [events]=await root.execute<mysql.RowDataPacket[]>("SELECT event_id FROM email_events WHERE event_id=?",[id]);expect(events).toHaveLength(1);
  });
  it("persists reception, invoice, driver, truck and state transitions atomically", async () => {
    await withStore(async()=>{const user=users.find(item=>item.id===userId)!;user.role="admin";await sql().execute("UPDATE accounts SET role='admin' WHERE user_id=?",[userId]);},true);
    cookieJar.set("ayl_session",{value:await createSessionToken(userId,"admin")});
    const registration=await createCustomerAtReception({...customer,email:"reception@example.invalid"});
    expect(registration.ok).toBe(true);if(!registration.ok)throw new Error("registration");
    expect(registration).not.toHaveProperty("temporaryPassword");
    await saveFlowConfig({...DEFAULT_FLOW_CONFIG,billingMoment:"al-recibir"});
    const received=await receiveBox({customer:registration.user.id,length:10,width:16,height:12,weightLb:20,reject:false});
    expect(received.ok).toBe(true);if(!received.ok)throw new Error("reception");
    expect((await logisticsService.getInvoices()).some(invoice=>invoice.userId===registration.user.id)).toBe(true);
    const truck=await createTruck({plate:"TEST-2026",driverId:"new",newDriverName:"Chofer Prueba",newDriverPhone:"5512345678",newDriverLicense:"TEST-12345",departureDate:"2099-01-01",destinationCity:DESTINATION_CITIES[0],capacity:{small:2,medium:0,large:0,"x-large":0,cubo:0}});
    expect(truck.ok).toBe(true);if(!truck.ok)throw new Error("truck");
    expect((await assignBoxToTruck(truck.truck.id,received.box.id)).ok).toBe(true);
    expect((await transitionTruckState(truck.truck.id)).ok).toBe(true);
    expect((await logisticsService.getBoxById(received.box.id))?.truckId).toBe(truck.truck.id);
    expect((await logisticsService.getDrivers()).some(driver=>driver.name==="Chofer Prueba")).toBe(true);
  });
  it("reconciles prealerts and moves a complete client shipment through delivery", async () => {
    adminSession=cookieJar.get("ayl_session")!.value;
    const registered=await withStore(()=>createAccount({...customer,email:"operations@example.invalid"},password),true);
    operationClient=registered.user.id;
    const token=await withStore(()=>issueToken(operationClient,"verify"),true);
    await consumeToken(token,"verify");
    clientSession=await createSessionToken(operationClient,"cliente");
    cookieJar.set("ayl_session",{value:clientSession});
    const prealert=await createPrealert({store:"Tienda QA",tracking:"TRACK-OP-001",description:"Contenido de prueba",declaredValue:100,estimatedCategory:"small"});
    expect(prealert.ok).toBe(true);if(!prealert.ok)throw new Error("prealert");
    await expect(registerDelivery({boxId:prealert.box.id,receivedBy:"Cliente Prueba",note:"Intento sin permisos"})).rejects.toThrow();
    await expect(manageSupportTicket({})).rejects.toThrow();
    cookieJar.set("ayl_session",{value:adminSession});
    const receptionInput={customer:operationClient,prealertId:prealert.box.id,length:10,width:16,height:12,weightLb:20,reject:false};
    expect((await receiveBox({...receptionInput,customer:(await logisticsService.getUsers()).find(user=>user.email==="reception@example.invalid")!.id})).ok).toBe(false);
    const first=await receiveBox(receptionInput);
    const second=await receiveBox({...receptionInput,prealertId:undefined});
    expect(first.ok&&second.ok).toBe(true);if(!first.ok||!second.ok)throw new Error("reception");
    expect(first.box.id).toBe(prealert.box.id);expect(first.box.code).toBe(prealert.box.code);expect(first.box.originTracking).toBe("TRACK-OP-001");
    expect(first.box.timeline[0].to).toBe("pre-alertada");
    expect((await receiveBox(receptionInput)).ok).toBe(false);
    expect((await logisticsService.getBoxes()).filter(box=>box.userId===operationClient)).toHaveLength(2);
    operationInvoice=first.invoice!.id;
    cookieJar.set("ayl_session",{value:clientSession});
    const recipient=await upsertClientRecipient({name:"Destinatario Original",phone:"5512345678",addressId:registered.address.id});
    expect(recipient.ok).toBe(true);if(!recipient.ok)throw new Error("recipient");
    const created=await createClientShipment({boxIds:[first.box.id,second.box.id],recipientId:recipient.recipient.id,deliveryMethod:"sucursal"});
    expect(created.ok).toBe(true);if(!created.ok)throw new Error("shipment");
    expect(created.shipment.recipientSnapshot?.name).toBe("Destinatario Original");
    expect((await deleteClientRecipient(recipient.recipient.id)).ok).toBe(false);
    cookieJar.set("ayl_session",{value:adminSession});
    const truckInput={plate:"TEST-2027",driverId:(await logisticsService.getDrivers())[0].id,departureDate:"2099-01-01",destinationCity:DESTINATION_CITIES[0],capacity:{small:3,medium:0,large:0,"x-large":0,cubo:0},notes:"Nota interna privada"};
    const master=await createTruck(truckInput);const other=await createTruck({...truckInput,plate:"TEST-2028"});
    if(!master.ok||!other.ok)throw new Error("trucks");
    expect((await assignBoxToTruck(master.truck.id,first.box.id)).ok).toBe(true);
    expect((await assignBoxToTruck(other.truck.id,second.box.id)).ok).toBe(false);
    expect((await removeBoxFromTruck(master.truck.id,first.box.id)).ok).toBe(true);
    expect((await logisticsService.getShipments()).find(item=>item.id===created.shipment.id)?.truckId).toBeUndefined();
    expect((await assignBoxToTruck(master.truck.id,first.box.id)).ok).toBe(true);
    expect((await assignBoxToTruck(master.truck.id,second.box.id)).ok).toBe(true);
    expect((await updateTruck(master.truck.id,{...truckInput,capacity:{...truckInput.capacity,small:1}})).ok).toBe(false);
    await removeBoxFromTruck(master.truck.id,second.box.id);
    expect((await transitionTruckState(master.truck.id)).ok).toBe(true);
    expect((await transitionTruckState(master.truck.id)).ok).toBe(false);
    expect((await logisticsService.getBoxById(first.box.id))?.status).toBe("cargada-en-camion");
    await assignBoxToTruck(master.truck.id,second.box.id);
    expect((await transitionTruckState(master.truck.id)).ok).toBe(true);
    expect((await logisticsService.getShipments()).find(item=>item.id===created.shipment.id)?.status).toBe("en-transito");
    cookieJar.set("ayl_session",{value:clientSession});
    const clientTruck=(await logisticsService.getTrucks())[0];
    expect(clientTruck.notes).toBeUndefined();expect(clientTruck.driverName).toBe("");expect(clientTruck.plate).toBe("");
    expect((await logisticsService.getBoxes()).every(box=>box.userId===operationClient)).toBe(true);
    cookieJar.set("ayl_session",{value:adminSession});
    expect((await registerDelivery({boxId:first.box.id,receivedBy:"Persona Real",note:"Todavía no llegó"})).ok).toBe(false);
    await transitionTruckState(master.truck.id);await transitionTruckState(master.truck.id);await transitionTruckState(master.truck.id);
    expect((await logisticsService.getBoxById(first.box.id))?.status).toBe("en-destino");
    const delivery={receivedBy:"Persona Real",note:"Identidad validada en sucursal"};
    expect((await registerDelivery({...delivery,boxId:first.box.id})).ok).toBe(false);
    const linked=(await logisticsService.getInvoices()).filter(i=>i.boxIds?.includes(first.box.id)||i.boxIds?.includes(second.box.id));
    for(const invoice of linked){
      cookieJar.set("ayl_session",{value:clientSession});
      expect((await reportInvoicePayment(invoice.id,{amount:invoiceTotal(invoice),method:"transferencia",reference:"DELIVERY-QA"})).ok).toBe(true);
      cookieJar.set("ayl_session",{value:adminSession});
      expect((await approvePayment(invoice.id,"Saldo verificado antes de entrega")).ok).toBe(true);
    }
    expect((await registerDelivery({...delivery,boxId:first.box.id})).ok).toBe(true);
    expect((await logisticsService.getShipments()).find(item=>item.id===created.shipment.id)?.status).toBe("en-destino");
    expect((await registerDelivery({...delivery,boxId:first.box.id})).ok).toBe(false);
    expect((await registerDelivery({...delivery,boxId:second.box.id})).ok).toBe(true);
    expect((await logisticsService.getShipments()).find(item=>item.id===created.shipment.id)?.status).toBe("entregado");
    expect((await logisticsService.getBoxById(first.box.id))?.deliveryReceipt?.actorId).toBe(userId);
  });
  it("rejects partial payments, enforces ownership and prevents approving invalid legacy reports", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const fresh=await receiveBox({customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false,invoiceNow:true});
    if(!fresh.ok||!fresh.invoice)throw new Error("unpaid invoice fixture");
    operationInvoice=fresh.invoice.id;
    cookieJar.set("ayl_session",{value:clientSession});
    const invoice=(await logisticsService.getInvoices()).find(item=>item.id===operationInvoice)!;
    expect((await reportInvoicePayment(invoice.id,{amount:1,method:"Transferencia",reference:"PAY-001"})).ok).toBe(false);
    expect((await reportInvoicePayment(invoice.id,{amount:invoiceTotal(invoice),method:"Transferencia",reference:"PAY-002"})).ok).toBe(true);
    cookieJar.set("ayl_session",{value:adminSession});
    await withStore(async()=>{invoices.find(item=>item.id===invoice.id)!.paymentReport!.amountUsd=1;},true);
    expect((await approvePayment(invoice.id,"Pago verificado")).ok).toBe(false);
    expect((await rejectPayment(invoice.id,"El importe no corresponde")).ok).toBe(true);
    const foreign=(await logisticsService.getInvoices()).find(item=>item.userId!==operationClient)!;
    cookieJar.set("ayl_session",{value:clientSession});
    expect((await reportInvoicePayment(foreign.id,{amount:invoiceTotal(foreign),method:"Transferencia",reference:"FOREIGN"})).ok).toBe(false);
    await reportInvoicePayment(invoice.id,{amount:invoiceTotal(invoice),method:"Transferencia",reference:"PAY-003"});
    cookieJar.set("ayl_session",{value:adminSession});
    expect((await approvePayment(invoice.id,"Referencia bancaria verificada")).ok).toBe(true);
    expect((await approvePayment(invoice.id,"Intento duplicado")).ok).toBe(false);
  });
  it("supports two-way conversations, stale update protection and closure without duplicate notifications", async () => {
    cookieJar.set("ayl_session",{value:clientSession});
    const created=await createSupportTicket({subject:"Consulta de entrega",message:"Quisiera confirmar la entrega de mi caja."});
    if(!created.ok)throw new Error("ticket");
    cookieJar.set("ayl_session",{value:adminSession});
    const input={ticketId:created.ticket.id,expectedUpdatedAt:created.ticket.updatedAt,body:"La entrega fue registrada. Puedes revisar tu seguimiento.",status:"en-revision"};
    const [first,second]=await Promise.all([manageSupportTicket(input),manageSupportTicket(input)]);
    expect([first,second].filter(result=>result.ok)).toHaveLength(1);
    const current=(await logisticsService.getSupportTickets()).find(item=>item.id===created.ticket.id)!;
    expect(current.messages).toHaveLength(2);
    const closed=await manageSupportTicket({...input,expectedUpdatedAt:current.updatedAt,body:"",status:"cerrado"});
    expect(closed.ok).toBe(true);if(!closed.ok)throw new Error("close");
    cookieJar.set("ayl_session",{value:clientSession});
    expect((await logisticsService.getSupportTickets()).find(item=>item.id===created.ticket.id)?.messages[1].author).toBe("soporte");
    expect((await replySupportTicket(created.ticket.id,{message:"Intento de respuesta cerrada"})).ok).toBe(false);
    expect((await logisticsService.getNotifications()).some(item=>item.title==="Soporte respondió tu consulta")).toBe(true);
    const outsider=await withStore(()=>createAccount({...customer,email:"outsider@example.invalid"},password),true);
    await consumeToken(await withStore(()=>issueToken(outsider.user.id,"verify"),true),"verify");
    cookieJar.set("ayl_session",{value:await createSessionToken(outsider.user.id,"cliente")});
    expect(await logisticsService.getSupportTickets()).toHaveLength(0);
    expect((await replySupportTicket(created.ticket.id,{message:"No es mi ticket"})).ok).toBe(false);
    expect(await logisticsService.getBoxById((await withStore(async()=>boxes.find(box=>box.userId===operationClient)!)).id)).toBeNull();
    cookieJar.set("ayl_session",{value:adminSession});
    expect((await manageSupportTicket({...input,expectedUpdatedAt:closed.ticket.updatedAt,body:"",status:"abierto"})).ok).toBe(true);
  });
  it("rolls back rejected mutations across entity and SQL changes", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const old=await withStore(async()=>shipments[0]?.destinationCity);
    const result=await runMutation("admin",async()=>{shipments[0].destinationCity="NO GUARDAR";await sql().execute("INSERT INTO security_audit(user_id,event_type) VALUES (?,?)",[userId,"rollback.probe"]);return {ok:false as const,error:"Validation rejected"};});
    expect(result.ok).toBe(false);expect(await withStore(async()=>shipments[0]?.destinationCity)).toBe(old);
    const [rows]=await root.query<mysql.RowDataPacket[]>("SELECT * FROM security_audit WHERE event_type='rollback.probe'");expect(rows).toHaveLength(0);
  });
  it("rejects undersized manual categories and can record rejection for physical damage", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const input={customer:operationClient,length:16,width:20,height:15,weightLb:55,overrideCategory:"small",overrideReason:"Solicitado por operaciones",reject:false};
    const before=(await logisticsService.getBoxes()).length;
    expect((await receiveBox(input)).ok).toBe(false);
    expect((await logisticsService.getBoxes()).length).toBe(before);
    const rejected=await receiveBox({...input,reject:true,rejectionReason:"Empaque dañado al llegar"});
    expect(rejected.ok).toBe(true);if(!rejected.ok)throw new Error("rejection");
    expect(rejected.box.status).toBe("rechazada");expect(rejected.invoice).toBeUndefined();
  });
  it("saves flow and rates together and rejects surcharge policies with no configured amount", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const [flow,rates]=await Promise.all([configService.getFlowConfig(),configService.getRateTable()]);
    expect((await saveSystemConfig({...flow,originMode:"entrega-directa"},rates.map((rate,index)=>index===0?{...rate,priceUsd:-1}:rate))).ok).toBe(false);
    expect(await configService.getFlowConfig()).toEqual(flow);
    expect((await saveSystemConfig({...flow,excessPolicy:"recargo"},rates)).ok).toBe(false);
    expect(await configService.getFlowConfig()).toEqual(flow);
    expect((await saveSystemConfig({...flow,originMode:"entrega-directa"},rates)).ok).toBe(true);
    cookieJar.set("ayl_session",{value:clientSession});
    expect((await createPrealert({store:"Test",tracking:"DIRECT-001",description:"Test box",declaredValue:50,estimatedCategory:"small"})).ok).toBe(false);
    cookieJar.set("ayl_session",{value:adminSession});
    await saveSystemConfig(flow,rates);
  });
  it("persists private photo bytes and verifies ownership on every download", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const bytes=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5mQAAAAASUVORK5CYII=","base64");
    const data=new FormData();data.set("file",new File([bytes],"foto.png",{type:"image/png"}));
    const result=await receiveBoxWithPhoto({customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false},data);
    expect(result.ok).toBe(true);if(!result.ok)throw new Error("photo reception");
    expect(result.box.photoFileId).toBeTruthy();
    const id=result.box.photoFileId!;
    const request=()=>downloadPrivateFile(new Request(`http://localhost/api/files/${id}`),{params:Promise.resolve({id})});
    const response=await request();expect(response.status).toBe(200);expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("Content-Disposition")).toContain("attachment");expect(response.headers.get("Cache-Control")).toContain("no-store");
    cookieJar.set("ayl_session",{value:clientSession});expect((await request()).status).toBe(200);
    const outsider=(await withStore(async()=>users.find(user=>user.email==="outsider@example.invalid")!));
    cookieJar.set("ayl_session",{value:await createSessionToken(outsider.id,"cliente")});expect((await request()).status).toBe(404);
    cookieJar.delete("ayl_session");expect((await request()).status).toBe(401);
    cookieJar.set("ayl_session",{value:adminSession});
    expect((await logisticsService.getBoxById(result.box.id))?.photoFileId).toBe(id);
  });
  it("rejects fake images and oversized files without creating boxes or files", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const before=(await logisticsService.getBoxes()).length;
    for(const file of [new File(["<svg onload='alert(1)'/>"],"fake.png",{type:"image/png"}),new File([new Uint8Array(2*1024*1024+1)],"big.jpg",{type:"image/jpeg"})]) {
      const data=new FormData();data.set("file",file);
      expect((await receiveBoxWithPhoto({customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false},data)).ok).toBe(false);
    }
    expect((await logisticsService.getBoxes()).length).toBe(before);
  });
  it("stores payment evidence with the report and retains it after rejection", async () => {
    cookieJar.set("ayl_session",{value:clientSession});
    const invoice=(await logisticsService.getInvoices()).find(item=>item.status==="emitida")!;
    const data=new FormData();data.set("file",new File(["%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"],"comprobante.pdf",{type:"application/pdf"}));
    expect((await reportPaymentWithReceipt(invoice.id,{amount:1,method:"transferencia",reference:"INVALID"},data)).ok).toBe(false);
    const [before]=await root.execute<mysql.RowDataPacket[]>("SELECT id FROM private_files WHERE entity_id=?",[invoice.id]);expect(before).toHaveLength(0);
    const result=await reportPaymentWithReceipt(invoice.id,{amount:invoiceTotal(invoice),method:"transferencia",reference:"RECEIPT-001"},data);
    expect(result.ok).toBe(true);if(!result.ok)throw new Error("receipt");
    const id=result.invoice.paymentReport!.receiptFileId!;expect(id).toBeTruthy();
    cookieJar.set("ayl_session",{value:adminSession});await rejectPayment(invoice.id,"Referencia no coincide con el banco");
    const refreshed=(await logisticsService.getInvoices()).find(item=>item.id===invoice.id)!;
    expect(refreshed.paymentReport).toBeUndefined();expect(refreshed.receiptFiles).toContainEqual({id,name:"comprobante.pdf"});
    expect((await downloadPrivateFile(new Request("http://localhost"),{params:Promise.resolve({id})})).status).toBe(200);
  });
  it("rolls back photo bytes, receipt operation and email together after a late failure", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const counts=async()=>{const [rows]=await root.query<mysql.RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM private_files) AS files,(SELECT COUNT(*) FROM entities WHERE collection_name='boxes') AS boxes,(SELECT COUNT(*) FROM email_outbox) AS emails");return rows[0];};
    const before=await counts();
    const data=new FormData();data.set("file",new File([new Uint8Array([255,216,255,224,255,217])],"photo.jpg",{type:"image/jpeg"}));
    await expect(runMutation("admin",async()=>{const result=await receiveBoxWithPhoto({customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false},data);if(!result.ok)throw new Error(result.error);throw new Error("late-test-failure");})).rejects.toThrow("late-test-failure");
    expect(await counts()).toEqual(before);
  });
  it("persists a maximum-size evidence file without truncation in MySQL", async () => {
    cookieJar.set("ayl_session",{value:clientSession});
    const invoice=(await logisticsService.getInvoices()).find(item=>item.status==="emitida")!;
    const bytes=Buffer.alloc(2*1024*1024,32);bytes.write("%PDF-1.4\n");bytes.write("%%EOF",bytes.length-5);
    const data=new FormData();data.set("file",new File([bytes],"large.pdf",{type:"application/pdf"}));
    const result=await reportPaymentWithReceipt(invoice.id,{amount:invoiceTotal(invoice),method:"transferencia",reference:"MAX-001"},data);
    expect(result.ok).toBe(true);if(!result.ok)throw new Error("large receipt");
    const id=result.invoice.paymentReport!.receiptFileId!;
    const response=await downloadPrivateFile(new Request("http://localhost"),{params:Promise.resolve({id})});
    expect(response.status).toBe(200);expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    cookieJar.set("ayl_session",{value:adminSession});
  });

  it("applies configurable excess fees and due days only to new invoices", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const flow=await configService.getFlowConfig(); const rates=await configService.getRateTable();
    expect((await saveSystemConfig({...flow,excessPolicy:"recargo",excessFeeUsd:12.5,invoiceDueDays:7,billingMoment:"al-recibir"},rates)).ok).toBe(true);
    cookieJar.set("ayl_session",{value:clientSession});
    const pre=await createPrealert({store:"QA",tracking:"FEE-TEST-001",description:"Excedente configurable",declaredValue:100,estimatedCategory:"small"});
    if(!pre.ok)throw new Error("prealert");
    cookieJar.set("ayl_session",{value:adminSession});
    const medium=rates.find(x=>x.id==="medium")!;
    const received=await receiveBox({customer:operationClient,prealertId:pre.box.id,...medium.dimensions,weightLb:medium.maxWeightLb,reject:false});
    expect(received.ok).toBe(true);if(!received.ok||!received.invoice)throw new Error("fee reception");
    expect(received.box.excessFeeUsd).toBe(12.5);
    expect(received.invoice.excessFeeUsd).toBe(12.5);
    expect(invoiceTotal(received.invoice)).toBe(medium.priceUsd+12.5);
    expect(Date.parse(received.invoice.dueAt)-Date.parse(received.invoice.issuedAt)).toBe(7*86400000);
    await saveSystemConfig({...flow,excessFeeUsd:99},rates);
    expect((await logisticsService.getInvoices()).find(x=>x.id===received.invoice!.id)?.excessFeeUsd).toBe(12.5);
    await saveSystemConfig(flow,rates);
  });
  it("authorizes edits, rejects stale versions and retains previous values", async () => {
    cookieJar.set("ayl_session",{value:clientSession});
    const created=await createPrealert({store:"QA",tracking:"EDIT-001",description:"Edición de prealerta",declaredValue:20,estimatedCategory:"small"});
    if(!created.ok)throw new Error("prealert");
    const expected=recordRevision(created.box);
    const values={originTracking:"EDIT-CORRECTED",categoryId:"small",...created.box.dimensions,weightLb:0};
    expect((await editOperation({kind:"box",id:created.box.id,expected,values,reason:"Tracking corregido por el cliente"})).ok).toBe(true);
    expect((await editOperation({kind:"box",id:created.box.id,expected,values,reason:"Intento con versión anterior"})).ok).toBe(false);
    const [rows]=await root.query<mysql.RowDataPacket[]>("SELECT payload FROM entities WHERE collection_name='operationalEdits'");
    const changes=rows.map(row=>typeof row.payload==="string"?JSON.parse(row.payload):row.payload);
    expect(changes.find(x=>x.entityId===created.box.id).before.originTracking).toBe("EDIT-001");
    cookieJar.set("ayl_session",{value:adminSession});
    const other=(await logisticsService.getBoxes()).find(x=>x.userId!==operationClient)!;
    cookieJar.set("ayl_session",{value:clientSession});
    expect((await editOperation({kind:"box",id:other.id,expected:recordRevision(other),values:{},reason:"Intento sobre otro cliente"})).ok).toBe(false);
    cookieJar.set("ayl_session",{value:adminSession});
  });
  it("locks paid invoice amounts but permits a traceable clarification", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const paid=(await logisticsService.getInvoices()).find(x=>x.status==="pagada")!;
    expect(paid).toBeTruthy();
    const expected=recordRevision(paid);
    expect((await editOperation({kind:"invoice",id:paid.id,expected,values:{insuranceUsd:99},reason:"Intento de cambiar pago cerrado"})).ok).toBe(false);
    expect((await editOperation({kind:"invoice",id:paid.id,expected,values:{},reason:"Aclaración documental posterior al pago"})).ok).toBe(true);
    expect(invoiceTotal((await logisticsService.getInvoices()).find(x=>x.id===paid.id)!)).toBe(invoiceTotal(paid));
  });
  it("sends only the explicitly authorized provider test, never the existing queue", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const [before]=await root.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS count FROM email_outbox WHERE status='queued'");
    emailSend.mockClear();emailSend.mockResolvedValue({data:{id:randomUUID()},error:null});
    expect((await sendProviderTest({from:"test@example.invalid",to:"recipient@example.invalid",confirmed:false})).ok).toBe(false);
    expect(emailSend).not.toHaveBeenCalled();
    expect((await sendProviderTest({from:"test@example.invalid",to:"recipient@example.invalid",confirmed:true})).ok).toBe(true);
    expect(emailSend).toHaveBeenCalledTimes(1);
    const [after]=await root.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS count FROM email_outbox WHERE status='queued'");
    expect(after[0].count).toBe(before[0].count);
    expect(process.env.EMAIL_DELIVERY).toBe("preview");
  });
  it("completes registration to delivery without photos or payment attachments", async () => {
    cookieJar.clear();
    const email="journey@example.invalid";
    expect((await registerAccount({...customer,email,password,confirmPassword:password,acceptedTerms:true})).ok).toBe(true);
    const account=await findAccount(email);if(!account)throw new Error("account");
    const [queued]=await root.query<mysql.RowDataPacket[]>("SELECT payload FROM email_outbox WHERE status='queued' ORDER BY created_at DESC");
    const verification=queued.map(row=>decryptEmail(typeof row.payload==="string"?JSON.parse(row.payload):row.payload)).find(x=>x.to===email&&x.actionUrl?.includes("/verificar"));
    const token=new URL(verification!.actionUrl!).searchParams.get("token")!;
    expect((await verifyEmail(token)).ok).toBe(true);
    expect((await authenticate(email,password)).ok).toBe(true);
    const journeySession=cookieJar.get("ayl_session")!.value;
    const pre=await createPrealert({store:"QA",tracking:"JOURNEY-001",description:"Recorrido integral aislado",declaredValue:60,estimatedCategory:"small"});
    if(!pre.ok)throw new Error("prealert");
    cookieJar.set("ayl_session",{value:adminSession});
    const previous=await configService.getFlowConfig();
    await saveFlowConfig({...previous,billingMoment:"al-despachar"});
    const reception=await receiveBoxWithPhoto({customer:account.user_id,prealertId:pre.box.id,length:10,width:12,height:16,weightLb:10,reject:false},new FormData());
    expect(reception.ok).toBe(true);if(!reception.ok)throw new Error("receive");
    expect(reception.box.photoFileId).toBeUndefined();
    cookieJar.set("ayl_session",{value:journeySession});
    const address=(await logisticsService.getAddresses())[0];
    const recipient=await upsertClientRecipient({name:"Destinatario Recorrido",phone:"5512345678",addressId:address.id});
    if(!recipient.ok)throw new Error("recipient");
    const shipment=await createClientShipment({boxIds:[pre.box.id],recipientId:recipient.recipient.id,deliveryMethod:"sucursal"});
    expect(shipment.ok).toBe(true);
    cookieJar.set("ayl_session",{value:adminSession});
    const truck=await createTruck({plate:"FLOW-2099",driverId:(await logisticsService.getDrivers())[0].id,departureDate:"2099-01-01",destinationCity:DESTINATION_CITIES[0],capacity:{small:2,medium:0,large:0,"x-large":0,cubo:0}});
    if(!truck.ok)throw new Error("truck");
    expect((await assignBoxToTruck(truck.truck.id,pre.box.id)).ok).toBe(true);
    expect((await transitionTruckState(truck.truck.id)).ok).toBe(true);
    expect((await transitionTruckState(truck.truck.id)).ok).toBe(true);
    const invoice=(await logisticsService.getInvoices()).find(x=>x.userId===account.user_id)!;
    expect(invoice).toBeTruthy();
    cookieJar.set("ayl_session",{value:journeySession});
    const payment=await reportPaymentWithReceipt(invoice.id,{amount:invoiceTotal(invoice),method:"transferencia",reference:"FLOW-PAYMENT"},new FormData());
    expect(payment.ok).toBe(true);if(!payment.ok)throw new Error("payment");
    expect(payment.invoice.paymentReport?.receiptFileId).toBeUndefined();
    cookieJar.set("ayl_session",{value:adminSession});
    expect((await approvePayment(invoice.id,"Transferencia cotejada en la cuenta de prueba")).ok).toBe(true);
    expect((await transitionTruckState(truck.truck.id)).ok).toBe(true);
    expect((await transitionTruckState(truck.truck.id)).ok).toBe(true);
    expect((await registerDelivery({boxId:pre.box.id,receivedBy:"Destinatario Recorrido",note:"Identidad validada sin fotografía obligatoria"})).ok).toBe(true);
    expect((await transitionTruckState(truck.truck.id)).ok).toBe(true);
    expect((await logisticsService.getBoxById(pre.box.id))?.status).toBe("entregada");
    expect((await logisticsService.getShipments()).find(x=>x.userId===account.user_id)?.status).toBe("entregado");
    expect((await logisticsService.getInvoices()).find(x=>x.id===invoice.id)?.status).toBe("pagada");
    await saveFlowConfig(previous);
  });


  it("corrects a pending payment and blocks approval/rejection of the stale report", async () => {
    cookieJar.set("ayl_session",{value:clientSession});
    const invoice=(await logisticsService.getInvoices()).find(x=>x.status==="pago-reportado")!;
    expect(invoice).toBeTruthy();
    const oldReportedAt=invoice.paymentReport!.reportedAt;
    expect((await editOperation({kind:"payment",id:invoice.id,expected:recordRevision(invoice),values:{method:"Transferencia",reference:"REFERENCIA-CORREGIDA"},reason:"Corregí el número de referencia bancaria"})).ok).toBe(true);
    cookieJar.set("ayl_session",{value:adminSession});
    expect((await approvePayment(invoice.id,"Validación sobre una versión anterior",oldReportedAt)).ok).toBe(false);
    expect((await rejectPayment(invoice.id,"Rechazo sobre una versión anterior",oldReportedAt)).ok).toBe(false);
    const current=(await logisticsService.getInvoices()).find(x=>x.id===invoice.id)!;
    expect(current.paymentReport?.reference).toBe("REFERENCIA-CORREGIDA");
    expect(current.paymentReport?.receiptFileId).toBe(invoice.paymentReport?.receiptFileId);
    expect(current.status).toBe("pago-reportado");
  });
  it("edits invoice prices safely and rolls back invalid totals", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const invoice=(await logisticsService.getInvoices()).find(x=>x.status==="emitida")!;
    const values={dueAt:"2099-01-01",insuranceUsd:5,homeDeliveryUsd:10,excessFeeUsd:2,...Object.fromEntries(invoice.lines.map((_,i)=>[`price${i}`,20]))};
    expect((await editOperation({kind:"invoice",id:invoice.id,expected:recordRevision(invoice),values,reason:"Tarifa acordada y confirmada por operaciones"})).ok).toBe(true);
    const updated=(await logisticsService.getInvoices()).find(x=>x.id===invoice.id)!;
    expect(invoiceTotal(updated)).toBe(invoice.lines.reduce((n,x)=>n+x.quantity*20,0)+17);
    const zero={...values,insuranceUsd:0,homeDeliveryUsd:0,excessFeeUsd:0,...Object.fromEntries(invoice.lines.map((_,i)=>[`price${i}`,0]))};
    expect((await editOperation({kind:"invoice",id:invoice.id,expected:recordRevision(updated),values:zero,reason:"Intento con total inválido"})).ok).toBe(false);
    expect(recordRevision((await logisticsService.getInvoices()).find(x=>x.id===invoice.id)!)).toBe(recordRevision(updated));
  });
  it("edits drivers, planned trucks and support subjects without deleting history", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const driver=(await logisticsService.getDrivers())[0];
    expect((await editOperation({kind:"driver",id:driver.id,expected:recordRevision(driver),values:{name:"Chofer Corregido",phone:driver.phone,license:driver.license,active:true},reason:"Actualización del nombre del chofer"})).ok).toBe(true);
    const planned=(await logisticsService.getTrucks()).find(x=>x.status==="planificado")!;
    expect(planned).toBeTruthy();
    expect((await editOperation({kind:"truck",id:planned.id,expected:recordRevision(planned),values:{plate:"EDIT-2099",driverId:driver.id,notes:"Nota actualizada"},reason:"Corrección de unidad antes del despacho"})).ok).toBe(true);
    const changed=(await logisticsService.getTrucks()).find(x=>x.id===planned.id)!;
    expect(changed.plate).toBe("EDIT-2099");expect(changed.driverName).toBe("Chofer Corregido");expect(changed.timeline.length).toBe(planned.timeline.length+1);
    const currentDriver=(await logisticsService.getDrivers()).find(x=>x.id===driver.id)!;
    expect((await editOperation({kind:"driver",id:driver.id,expected:recordRevision(currentDriver),values:{name:currentDriver.name,phone:driver.phone,license:driver.license,active:false},reason:"Intento de desactivar con viajes activos"})).ok).toBe(false);
    const ticket=(await logisticsService.getSupportTickets())[0];
    expect((await editOperation({kind:"support",id:ticket.id,expected:recordRevision(ticket),values:{subject:"Asunto corregido por soporte"},reason:"Se precisó el asunto sin modificar mensajes"})).ok).toBe(true);
    const updated=(await logisticsService.getSupportTickets()).find(x=>x.id===ticket.id)!;
    expect(updated.subject).toBe("Asunto corregido por soporte");expect(updated.messages.length).toBe(ticket.messages.length+1);
  });


  it("does not send expired account links or release old preview messages", async () => {
    process.env.EMAIL_DELIVERY="resend";
    emailSend.mockClear();emailSend.mockImplementation(async()=>({data:{id:randomUUID()},error:null}));
    await root.execute("UPDATE email_outbox SET available_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY) WHERE status IN ('queued','retry')");
    const expired=await sendEmail({to:"expired@example.invalid",subject:"Expired link",heading:"Expired",body:"Do not send",expiresAt:new Date(Date.now()-1000).toISOString()});
    const old=await sendEmail({to:"old@example.invalid",subject:"Old preview",heading:"Old",body:"Do not send"});
    await root.execute("UPDATE email_outbox SET created_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 DAY) WHERE id=?",[old.id]);
    await deliverPendingEmails();
    expect(emailSend.mock.calls.some(call=>["expired@example.invalid","old@example.invalid"].includes(call[0].to))).toBe(false);
    const [rows]=await root.query<mysql.RowDataPacket[]>("SELECT id,status,payload FROM email_outbox WHERE id IN (?,?)",[expired.id,old.id]);
    expect(rows.every(row=>row.status==="failed")).toBe(true);
    expect(rows.every(row=>JSON.stringify(typeof row.payload==="string"?JSON.parse(row.payload):row.payload)==="{}")).toBe(true);
    process.env.EMAIL_DELIVERY="preview";
  });


  it("manages a dynamic category through reception, truck capacity, archival and invoice history", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const flow=await configService.getFlowConfig(), initial=await configService.getCatalog();
    const custom={id:"especial-qa",name:"Especial QA",active:true,dimensions:{length:40,width:40,height:40},maxWeightLb:400,priceUsd:345.67};
    const unused={...custom,id:"temporal-qa",name:"Temporal QA"};
    expect((await saveSystemConfig({...flow,billingMoment:"al-despachar"},[...initial,custom,unused])).ok).toBe(true);
    expect((await configService.getRateTable()).some(rate=>rate.id===custom.id)).toBe(true);
    cookieJar.set("ayl_session",{value:clientSession});
    const pre=await createPrealert({store:"QA",tracking:"DYNAMIC-001",description:"Categoría agregada desde catálogo",declaredValue:100,estimatedCategory:custom.id});
    if(!pre.ok)throw new Error("dynamic prealert");
    cookieJar.set("ayl_session",{value:adminSession});
    const received=await receiveBox({customer:operationClient,prealertId:pre.box.id,...custom.dimensions,weightLb:200,reject:false});
    expect(received.ok).toBe(true);if(!received.ok)throw new Error("dynamic reception");
    expect(received.box.categoryId).toBe(custom.id);
    const oldTruck=(await logisticsService.getTrucks()).find(truck=>truck.status==="planificado")!;
    expect((await assignBoxToTruck(oldTruck.id,received.box.id)).ok).toBe(false);
    const master=await createTruck({plate:"DYN-2099",driverId:(await logisticsService.getDrivers())[0].id,departureDate:"2099-01-01",destinationCity:DESTINATION_CITIES[0],capacity:{[custom.id]:1}});
    expect(master.ok).toBe(true);if(!master.ok)throw new Error("dynamic truck");
    const currentFlow=await configService.getFlowConfig();
    expect((await saveSystemConfig(currentFlow,initial)).ok).toBe(false);
    const archived=[...initial,{...custom,active:false}];
    expect((await saveSystemConfig(currentFlow,archived)).ok).toBe(true);
    expect((await configService.getCatalog()).some(rate=>rate.id===unused.id)).toBe(false);
    expect((await configService.getRateTable()).some(rate=>rate.id===custom.id)).toBe(false);
    cookieJar.set("ayl_session",{value:clientSession});
    expect((await createPrealert({store:"QA",tracking:"DYNAMIC-002",description:"Categoría archivada",declaredValue:10,estimatedCategory:custom.id})).ok).toBe(false);
    cookieJar.set("ayl_session",{value:adminSession});
    expect((await assignBoxToTruck(master.truck.id,received.box.id)).ok).toBe(true);
    expect((await transitionTruckState(master.truck.id)).ok).toBe(true);
    expect((await transitionTruckState(master.truck.id)).ok).toBe(true);
    const invoice=(await logisticsService.getInvoices()).find(item=>item.boxIds?.includes(received.box.id))!;
    expect(invoice.lines[0].categoryName).toBe(custom.name);expect(invoiceTotal(invoice)).toBe(345.67);
    expect((await saveSystemConfig(flow,[...initial,{...custom,name:"Especial Renombrada",priceUsd:400,active:false}])).ok).toBe(true);
    const preserved=(await logisticsService.getInvoices()).find(item=>item.id===invoice.id)!;
    expect(preserved.lines[0].categoryName).toBe(custom.name);expect(invoiceTotal(preserved)).toBe(345.67);
  });
  it("rejects stale catalog saves, duplicate categories and an empty active catalog", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const flow=await configService.getFlowConfig(),rates=await configService.getCatalog();
    const revision=recordRevision({flow,rates});
    expect((await saveSystemConfig(flow,rates.map(rate=>({...rate,active:false})),revision)).ok).toBe(false);
    expect((await saveSystemConfig(flow,[...rates,rates[0]],revision)).ok).toBe(false);
    expect((await saveSystemConfig({...flow,invoiceDueDays:21},rates,revision)).ok).toBe(true);
    expect((await saveSystemConfig(flow,rates,revision)).ok).toBe(false);
    await saveSystemConfig(flow,rates);
  });


  it("records warehouse payments atomically and collects destination debt exactly once", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const flow = await configService.getFlowConfig();
    await saveFlowConfig({...flow,billingMoment:"al-despachar"});
    const input={customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false};
    const receipt = (key="receipt") => { const data=new FormData(); data.set(key,new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5mQAAAAASUVORK5CYII=","base64")],"receipt.png",{type:"image/png"})); return data; };
    const before=(await logisticsService.getBoxes()).length;
    expect((await receiveBoxWithPhoto(input,new FormData(),{method:"efectivo",warehouseId:"inexistente"})).ok).toBe(false);
    expect((await receiveBoxWithPhoto(input,receipt(),{method:"tarjeta",amount:0.01})).ok).toBe(false);
    expect((await logisticsService.getBoxes()).length).toBe(before);
    const cash=await receiveBoxWithPhoto(input,receipt(),{method:"efectivo"});
    expect(cash.ok).toBe(true); if(!cash.ok)throw new Error(cash.error);
    expect(cash.invoice?.status).toBe("pagada");
    expect(cash.invoice?.paymentReport?.method).toBe("efectivo");
    const card=await receiveBoxWithPhoto(input,receipt(),{method:"tarjeta",amount:invoiceTotal(cash.invoice!)});
    expect(card.ok).toBe(true); if(!card.ok)throw new Error(card.error);
    expect(card.invoice?.status).toBe("pagada");
    const destination=await receiveBoxWithPhoto(input,receipt(),{method:"destino"});
    expect(destination.ok).toBe(true); if(!destination.ok)throw new Error(destination.error);
    expect(destination.invoice?.status).toBe("pendiente-pago-destino");
    expect(destination.invoice?.paymentReport).toBeUndefined();
    const id=destination.invoice!.id;
    const collected=await collectDestinationPayment(id,{method:"efectivo"},receipt("file"));
    expect(collected.ok).toBe(true); if(!collected.ok)throw new Error(collected.error);
    expect(collected.invoice.status).toBe("pagada");
    expect(collected.invoice.receiptFiles).toHaveLength(2);
    expect((await collectDestinationPayment(id,{method:"efectivo"},receipt("file"))).ok).toBe(false);
    cookieJar.set("ayl_session",{value:clientSession});
    await expect(collectDestinationPayment(id,{method:"efectivo"},receipt("file"))).rejects.toThrow();
    cookieJar.set("ayl_session",{value:adminSession});
    await saveFlowConfig(flow);
  });

  it("records text payment references without images and preserves the destination agreement", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const input={customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false};
    expect((await receiveBoxWithPhoto(input,new FormData(),{method:"efectivo",reference:"   "})).ok).toBe(true);
    const cash=await receiveBoxWithPhoto(input,new FormData(),{method:"efectivo",reference:" REC-001 "});
    expect(cash.ok).toBe(true);if(!cash.ok)throw new Error(cash.error);
    expect(cash.invoice?.status).toBe("pagada");
    expect(cash.invoice?.paymentReport?.reference).toMatch(/^PAG-/);
    expect(cash.invoice?.receiptFiles??[]).toHaveLength(0);
    expect((await receiveBoxWithPhoto(input,new FormData(),{method:"tarjeta",amount:0.01,reference:"CARD-001"})).ok).toBe(false);
    const card=await receiveBoxWithPhoto(input,new FormData(),{method:"tarjeta",amount:invoiceTotal(cash.invoice!),reference:"CARD-001"});
    expect(card.ok).toBe(true);if(!card.ok)throw new Error(card.error);
    expect(card.invoice?.status).toBe("pagada");
    const destination=await receiveBoxWithPhoto(input,new FormData(),{method:"destino",reference:"ACUERDO-001"});
    expect(destination.ok).toBe(true);if(!destination.ok)throw new Error(destination.error);
    expect(destination.invoice?.status).toBe("pendiente-pago-destino");
    expect(destination.invoice?.paymentReport).toBeUndefined();
    const collected=await collectDestinationPayment(destination.invoice!.id,{method:"efectivo",reference:"COBRO-001"},new FormData());
    expect(collected.ok).toBe(true);if(!collected.ok)throw new Error(collected.error);
    const persisted=(await logisticsService.getInvoices()).find(i=>i.id===collected.invoice.id)!;
    expect(persisted.status).toBe("pagada");
    expect(persisted.collectionReferences?.[0].reference).toBe("ACUERDO-001");
    expect(persisted.collectionReferences?.[1].reference).toMatch(/^PAG-/);
    expect(persisted.payments?.map(p=>p.status)).toEqual(["acuerdo","confirmado"]);
    expect((await collectDestinationPayment(persisted.id,{method:"efectivo",reference:"DUPLICADO"},new FormData())).ok).toBe(false);
  });

  it("scopes destination operators, scans multi-stop trips and hides financial data", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const cities=(await configService.getFlowConfig()).destinationCities;
    const first=await saveWarehouse({name:"Almacén Norte QA",city:cities[0],active:true,arrivalMessage:"{codigo} recibido en {almacen}, {destino}."});
    const second=await saveWarehouse({name:"Almacén Sur QA",city:cities[1]??cities[0],active:true,arrivalMessage:"Tu paquete {codigo} ya está en {almacen}, {destino}."});
    expect(first.ok).toBe(true);expect(second.ok).toBe(true);if(!first.ok||!second.ok)throw new Error("warehouses");
    const a=first.warehouse,b=second.warehouse;
    const pre=await saveAdminPrealert({userId:operationClient,store:"Tienda QA",tracking:"OP-PREALERT-QA",description:"Paquete de prueba",declaredValue:25,estimatedCategory:"small"});
    expect(pre.ok).toBe(true);if(!pre.ok)throw new Error(pre.error);
    expect((await selectPrealertAtWarehouse(pre.box.id,userId)).ok).toBe(false);
    expect((await selectPrealertAtWarehouse(pre.box.id,operationClient)).ok).toBe(true);
    const [before]=await root.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM email_outbox");
    expect((await selectPrealertAtWarehouse(pre.box.id,operationClient)).ok).toBe(true);
    const [after]=await root.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM email_outbox");expect(after[0].n).toBe(before[0].n);
    const packageA=await receiveBox({customer:operationClient,prealertId:pre.box.id,length:10,width:16,height:12,weightLb:20,reject:false});
    const packageB=await receiveBox({customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false});
    if(!packageA.ok||!packageB.ok)throw new Error("receive");
    // Two confirmed shipments, one for each destination; fixtures remain in this disposable DB.
    await withStore(async()=>{
      for(const [box,warehouse] of [[packageA.box,a],[packageB.box,b]] as const){
        const id=crypto.randomUUID();
        shipments.push({id,code:`SH-${id}`,userId:operationClient,recipientId:"qa-recipient",boxIds:[box.id],status:"confirmado",destinationCity:warehouse.city,timeline:[]});
        boxes.find(p=>p.id===box.id)!.shipmentId=id;
      }
    },true);
    const trip=await createNewTruck({plate:"MULT-2099",driverId:(await logisticsService.getDrivers())[0].id,departureDate:"2099-01-01",destinationCity:cities[0],capacity:{small:10}});
    if(!trip.ok)throw new Error(trip.error);
    expect((await assignBoxToTruck(trip.truck.id,packageA.box.id)).ok).toBe(false);
    expect((await saveTruckStops(trip.truck.id,[{warehouseId:a.id,arrivalDate:"invalid"}])).ok).toBe(false);
    expect((await saveTruckStops(trip.truck.id,[{warehouseId:a.id,arrivalDate:"2099-01-02"},{warehouseId:b.id,arrivalDate:"2099-01-03"}])).ok).toBe(true);
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(true);
    expect((await assignBoxToTruck(trip.truck.id,packageA.box.id)).ok).toBe(false);
    expect((await scanLoad(trip.truck.id,packageA.box.code,a.id)).ok).toBe(true);
    expect((await scanLoad(trip.truck.id,packageA.box.code,a.id)).ok).toBe(false);
    expect((await scanLoad(trip.truck.id,packageB.box.code,b.id)).ok).toBe(true);
    expect((await saveTruckStops(trip.truck.id,[{warehouseId:a.id,arrivalDate:"2099-01-02"}])).ok).toBe(false);
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(true);
    const profile={firstName:"Operador",paternalLastName:"Norte",email:"warehouse@example.invalid",phone:"+502 5555 1234",active:true,grants:[{warehouseId:a.id,receive:true,viewContacts:true}]};
    expect((await saveWarehouseOperator(profile)).ok).toBe(true);
    const operator=(await getWarehouseAdministration()).operators.find(o=>o.email===profile.email)!;
    expect(operator.phone).toBe("+50255551234");
    await withStore(async()=>{await sql().execute("UPDATE accounts SET verified_at=UTC_TIMESTAMP(3) WHERE user_id=?",[operator.id]);},true);
    const token=await createSessionToken(operator.id,"operador");
    cookieJar.set("ayl_session",{value:token});
    expect((await getSession())?.role).toBe("operador");
    const desk=await getDestinationDesk();
    expect(desk.warehouses.map(w=>w.id)).toEqual([a.id]);
    expect(desk.boxes.map(p=>p.id)).toContain(packageA.box.id);
    expect(desk.boxes.map(p=>p.id)).not.toContain(packageB.box.id);
    expect(desk.boxes.find(p=>p.id===packageA.box.id)?.customer?.email).toBeTruthy();
    expect(JSON.stringify(desk)).not.toMatch(/priceUsd|paymentReport|receiptFiles|invoiceId|declaredValue/);
    await expect(getWarehouseAdministration()).rejects.toThrow("REDIRECT");
    await expect(approvePayment(operationInvoice,"operator-denied")).rejects.toThrow();
    expect(await logisticsService.getInvoices()).toEqual([]);
    expect((await scanUnload(trip.truck.id,b.id,packageB.box.code)).ok).toBe(false);
    expect((await scanUnload(trip.truck.id,a.id,packageB.box.code)).ok).toBe(false);
    const unloaded=await scanUnload(trip.truck.id,a.id,packageA.box.code);
    expect(unloaded.ok).toBe(true);if(unloaded.ok)expect(unloaded.message).toContain(a.name);
    expect((await scanUnload(trip.truck.id,a.id,packageA.box.code)).ok).toBe(false);
    cookieJar.set("ayl_session",{value:adminSession});
    expect((await logisticsService.getBoxById(packageB.box.id))?.status).toBe("en-transito");
    expect((await logisticsService.getShipments()).find(s=>s.boxIds.includes(packageA.box.id))?.status).toBe("en-destino");
    expect((await logisticsService.getShipments()).find(s=>s.boxIds.includes(packageB.box.id))?.status).toBe("en-transito");
    expect((await logisticsService.getTruckById(trip.truck.id))?.status).toBe("despachado");
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(true);
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(false);
    expect((await scanUnload(trip.truck.id,b.id,packageB.box.code)).ok).toBe(true);
    expect((await logisticsService.getTruckById(trip.truck.id))?.status).toBe("en-destino");
    expect((await saveWarehouseOperator({...profile,id:operator.id,grants:[{warehouseId:a.id,receive:true,viewContacts:false}]})).ok).toBe(true);
    expect(await verifySessionToken(token)).toBeNull();
    cookieJar.set("ayl_session",{value:await createSessionToken(operator.id,"operador")});
    expect((await getDestinationDesk()).boxes.every(p=>p.customer===null)).toBe(true);
    cookieJar.set("ayl_session",{value:adminSession});
  });

  it("receives oversized custom cargo and invoices its individual agreed prices at dispatch", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const flow=await configService.getFlowConfig();
    await saveFlowConfig({...flow,billingMoment:"al-despachar"});
    const input={customer:operationClient,length:250,width:300,height:300,weightLb:500,reject:false};
    expect((await receiveBox(input)).ok).toBe(false);
    const first=await receiveBox({...input,customPriceUsd:325.50});
    const second=await receiveBox({...input,customPriceUsd:410});
    expect(first.ok).toBe(true);expect(second.ok).toBe(true);
    if(!first.ok||!second.ok)throw new Error("custom reception");
    expect(first.box.status).toBe("en-bodega");
    expect(first.box.categoryName).toBe("Carga personalizada");
    expect(first.box.customPriceUsd).toBe(325.50);
    expect(first.invoice).toBeUndefined();
    const warehouse=(await getWarehouseAdministration()).warehouses[0];
    const trip=await createNewTruck({plate:"CUST-2099",driverId:(await logisticsService.getDrivers())[0].id,departureDate:"2099-01-01",destinationCity:warehouse.city,capacity:{"custom-cargo":2}});
    expect(trip.ok).toBe(true);if(!trip.ok)throw new Error(trip.error);
    expect((await saveTruckStops(trip.truck.id,[{warehouseId:warehouse.id,arrivalDate:"2099-01-02"}])).ok).toBe(true);
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(true);
    expect((await scanLoad(trip.truck.id,first.box.code,warehouse.id)).ok).toBe(true);
    expect((await scanLoad(trip.truck.id,second.box.code,warehouse.id)).ok).toBe(true);
    const dispatched=await transitionTruckState(trip.truck.id);
    expect(dispatched.ok).toBe(true);if(!dispatched.ok)throw new Error(dispatched.error);
    expect(dispatched.generatedInvoices).toHaveLength(1);
    expect(dispatched.generatedInvoices[0].lines.map(l=>l.unitPriceUsd)).toEqual([325.50,410]);
    expect(invoiceTotal(dispatched.generatedInvoices[0])).toBe(735.50);
    expect((await scanUnload(trip.truck.id,warehouse.id,first.box.code)).ok).toBe(true);
    await saveFlowConfig(flow);
  });

  it("persists dimensional billing, configurable rates and immutable issued charges", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const flow=await configService.getFlowConfig();
    await saveFlowConfig({...flow,pricePerLbUsd:3.2,dimensionalBase:1000,dimensionalFactor:19});
    const input={customer:operationClient,length:10,width:10,height:10,weightLb:50.2,reject:false,billingMode:"peso"};
    const receipt=await receiveBoxWithPhoto(input,new FormData(),{method:"destino",reference:"PESO-QA"});
    expect(receipt.ok).toBe(true);if(!receipt.ok||!receipt.invoice)throw new Error("weight receipt");
    expect(receipt.box.billing).toMatchObject({dimensionalWeightLb:19,billableWeightLb:51,amountUsd:163.2});
    expect(invoiceTotal(receipt.invoice)).toBe(163.2);
    expect(receipt.invoice.lines[0].description).toContain("51 lb");
    await saveFlowConfig({...flow,pricePerLbUsd:4,dimensionalBase:1000,dimensionalFactor:20});
    const stored=await logisticsService.getBoxById(receipt.box.id);
    expect(stored?.billing?.pricePerLbUsd).toBe(3.2);
    expect(invoiceTotal((await logisticsService.getInvoices()).find(x=>x.id===receipt.invoice!.id)!)).toBe(163.2);
    const next=await receiveBox({...input,length:20,width:20,height:20,invoiceNow:true});
    expect(next.ok).toBe(true);if(!next.ok||!next.invoice)throw new Error("second weight receipt");
    expect(next.box.billing).toMatchObject({dimensionalWeightLb:160,billableWeightLb:160,amountUsd:640});
    expect(invoiceTotal(next.invoice)).toBe(640);
    const manual=await receiveBox({...input,billingMode:"manual",customPriceUsd:125,invoiceNow:true});
    expect(manual.ok).toBe(true);if(!manual.ok||!manual.invoice)throw new Error("manual receipt");
    expect(invoiceTotal(manual.invoice)).toBe(125);
    const fixed=await receiveBox({...input,weightLb:1,billingMode:"fijo",invoiceNow:true});
    expect(fixed.ok).toBe(true);if(!fixed.ok)throw new Error("fixed receipt");
    expect(fixed.box.billing?.mode).toBe("fijo");
    expect(fixed.box.customPriceUsd).toBe((await configService.getCatalog()).find(r=>r.id===fixed.box.categoryId)?.priceUsd);
    await expect(saveFlowConfig({...flow,dimensionalBase:0})).rejects.toThrow();
    await saveFlowConfig({...flow,billingMoment:"al-despachar",pricePerLbUsd:3.2,dimensionalBase:1000,dimensionalFactor:19});
    const deferred=await receiveBox({...input,weightLb:20});
    expect(deferred.ok).toBe(true);if(!deferred.ok)throw new Error("deferred receipt");
    expect(deferred.invoice).toBeUndefined();
    await saveFlowConfig({...flow,pricePerLbUsd:9});
    expect((await editOperation({kind:"box",id:deferred.box.id,expected:recordRevision(deferred.box),reason:"Corregir peso medido",values:{originTracking:"",categoryId:deferred.box.categoryId,length:10,width:10,height:10,weightLb:21}})).ok).toBe(true);
    expect((await logisticsService.getBoxById(deferred.box.id))?.billing).toMatchObject({pricePerLbUsd:3.2,billableWeightLb:21,amountUsd:67.2});
    await saveFlowConfig(flow);
  });

  it("issues unique automatic payment folios and records bank references separately", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const input={customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false,billingMode:"manual",customPriceUsd:125};
    const results=await Promise.all([
      receiveBoxWithPhoto(input,new FormData(),{method:"efectivo"}),
      receiveBoxWithPhoto(input,new FormData(),{method:"transferencia",amount:125,reference:"BANK-EXTERNAL"}),
      receiveBoxWithPhoto(input,new FormData(),{method:"deposito",amount:125})
    ]);
    const folios:string[]=[];
    for(const result of results){
      expect(result.ok).toBe(true);if(!result.ok||!result.invoice)throw new Error("payment capture");
      const payment=result.invoice.payments!.at(-1)!;
      expect(payment).toMatchObject({status:"confirmado",amountUsd:125,warehouseId:"qa-location",customerId:operationClient,actorId:userId,confirmedBy:userId,boxIds:[result.box.id]});
      expect(payment.recordedAt).toBeTruthy();expect(payment.folio).toMatch(/^PAG-\d{4}-\d{6}$/);folios.push(payment.folio);
    }
    expect(new Set(folios).size).toBe(3);
    if(results[0].ok)expect(results[0].invoice?.payments?.[0].externalReference).toBeUndefined();
    if(results[1].ok)expect(results[1].invoice?.payments?.[0].externalReference).toBe("BANK-EXTERNAL");
    expect((await receiveBoxWithPhoto(input,new FormData(),{method:"deposito",amount:1})).ok).toBe(false);
  });

  it("configures new destinations and preserves routes after removing them from new travel options", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const flow=await configService.getFlowConfig(),rates=await configService.getCatalog();
    const destination="Destino configurable QA";
    expect((await saveSystemConfig({...flow,destinationCities:[...flow.destinationCities,destination]},rates)).ok).toBe(true);
    const input={plate:"ROUT-2099",driverId:(await logisticsService.getDrivers())[0].id,departureDate:"2099-01-01",destinationCity:destination,capacity:{small:1}};
    const created=await createTruck(input);
    expect(created.ok).toBe(true);if(!created.ok)throw new Error("new route");
    await saveSystemConfig(flow,rates);
    expect((await createTruck({...input,plate:"ROUT-2098"})).ok).toBe(false);
    expect((await logisticsService.getTruckById(created.truck.id))?.destinationCity).toBe(destination);
    expect((await updateTruck(created.truck.id,{...input,notes:"Se conserva el destino histórico"})).ok).toBe(true);
  });

});
