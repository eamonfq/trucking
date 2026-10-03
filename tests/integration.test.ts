import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

import {saveAdministrativeStaff,getAdministrativeStaff,inviteAdministrativeStaff} from "@/lib/auth/staff-actions";
import {requireAdminUser} from "@/lib/auth/actions";
import {getDeletionDirectory,previewDeletion,deleteTestRecord} from "@/lib/auth/deletion-actions";
import {correctInvoice} from "@/lib/auth/invoice-actions";
import {previewCustomerArchive,archiveCustomerBoxes,restoreCustomerBoxes,getCustomerArchives} from "@/lib/auth/customer-archive-actions";
import {invoiceCorrectionDraft} from "@/lib/utils/invoice-correction";
import {createCustomerAsAdmin,updateCustomerProfile} from "@/lib/auth/admin-actions";
import {GET as previewEmail} from "@/app/api/emails/preview/route";
import {GET as invoicePdf} from "@/app/api/facturas/[id]/pdf/route";
import mysql from "mysql2/promise";
import sharp from 'sharp';
import {normalizePhoto} from '@/lib/files/normalize-photo';
const r2Files=vi.hoisted(()=>new Map<string,Buffer>());
const r2Put=vi.hoisted(()=>vi.fn(async(key:string,bytes:Buffer)=>{r2Files.set(key,Buffer.from(bytes));}));
const r2Get=vi.hoisted(()=>vi.fn(async(key:string)=>{const bytes=r2Files.get(key);if(!bytes)throw new Error('Missing');return bytes;}));
const r2Delete=vi.hoisted(()=>vi.fn(async(key:string)=>{r2Files.delete(key);}));
vi.mock('@/lib/files/r2',()=>({putPhoto:r2Put,getPhoto:r2Get,deletePhoto:r2Delete}));
import { readFile } from "node:fs/promises";
import { randomUUID, createHmac, createHash } from "node:crypto";
import { recordRevision } from "@/lib/db/revision";
import { editOperation } from "@/lib/auth/edit-actions";
import { sendProviderTest } from "@/lib/auth/email-actions";
const cookieJar = vi.hoisted(() => new Map<string, { value: string; options?: Record<string, unknown> }>());
const emailSend = vi.hoisted(() => vi.fn());
const pushSend=vi.hoisted(()=>vi.fn(async()=>({statusCode:201})));
vi.mock('web-push',()=>({default:{sendNotification:pushSend}}));
import {subscribePush,unsubscribePush,pushSettings} from '@/lib/auth/push-actions';
import {deliverPendingPush,allowedPushEndpoint,operationalEmail} from '@/lib/services/push';
vi.mock("resend", async importOriginal => {
  const original = await importOriginal<typeof import("resend")>();
  return { ...original, Resend: class extends original.Resend { constructor(key?: string) { super(key); this.emails.send = emailSend; } } };
});
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: (key: string) => cookieJar.get(key), set: (key: string, value: string, options: Record<string, unknown>) => cookieJar.set(key,{value,options}), delete: (key: string) => cookieJar.delete(key) }) }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
import { withStore,collection } from "@/lib/db/store";
import { users, addresses, recipients, boxes, shipments, invoices, trucks, warehouses } from "@/lib/db/collections";
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
import {receptionPhotoAttachment} from '@/lib/services/email-photo';
import {chargeClover,quoteClover,reconcileClover} from '@/lib/payments/clover';
import {receivePackageGroup,completeReceptionPayment} from "@/lib/auth/file-actions";
import {deleteCustomerRecipient,upsertCustomerRecipient} from "@/lib/auth/admin-actions";
import {getReceptionContacts} from "@/lib/auth/reception-contacts";
import {registerPendingCargoWeight} from '@/lib/auth/cargo-weight-actions';
import {getPackageDelivery,savePackageDelivery} from '@/lib/auth/package-delivery-actions';
import { POST as webhook } from "@/app/api/webhooks/resend/route";

import { saveWarehouse, saveWarehouseOperator, getWarehouseAdministration, getDestinationDesk, saveTruckStops, scanLoad, scanUnload, saveAdminPrealert, selectPrealertAtWarehouse, loadSelectedPackages } from "@/lib/auth/warehouse-actions";
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
  process.env.PHOTO_STORAGE='mysql';
  process.env.R2_PRIVATE_CONFIRMED='false';
  const url = new URL(process.env.DATABASE_URL!);
  root = await mysql.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),multipleStatements:true});
  await root.query(`CREATE DATABASE \`${database}\``);
  await root.changeUser({database});
  await root.query(await readFile(new URL("../migrations/001-real-system.sql",import.meta.url),"utf8"));
  await root.query(await readFile(new URL("../migrations/002-private-files.sql",import.meta.url),"utf8"));
  await root.query(await readFile(new URL("../migrations/005-r2-photos.sql",import.meta.url),"utf8"));
  await root.query(await readFile(new URL("../migrations/006-web-push.sql",import.meta.url),"utf8"));
  await root.query(await readFile(new URL("../migrations/003-warehouse-operators.sql",import.meta.url),"utf8"));
  await root.query(await readFile(new URL("../migrations/004-warehouse-kinds.sql",import.meta.url),"utf8"));
  await root.query(await readFile(new URL("../migrations/007-optional-customer-contact.sql",import.meta.url),"utf8"));
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
    expect((await updateTruck(master.truck.id,{...truckInput,capacity:{...truckInput.capacity,small:1}})).ok).toBe(true);
    expect((await updateTruck(master.truck.id,{...truckInput,maxWeightLb:1})).ok).toBe(false);
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
    const bytes=await sharp({create:{width:32,height:32,channels:3,background:'red'}}).png().toBuffer();
    const data=new FormData();data.set("file",new File([bytes],"foto.png",{type:"image/png"}));
    const result=await receiveBoxWithPhoto({customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false},data);
    expect(result.ok).toBe(true);if(!result.ok)throw new Error("photo reception");
    expect(result.box.photoFileId).toBeTruthy();
    const id=result.box.photoFileId!;
    const request=()=>downloadPrivateFile(new Request(`http://localhost/api/files/${id}`),{params:Promise.resolve({id})});
    const response=await request();expect(response.status).toBe(200);expect(Buffer.from(await response.arrayBuffer())).toEqual(await normalizePhoto(bytes));
    const preview=await downloadPrivateFile(new Request(`http://localhost/api/files/${id}?inline=1`),{params:Promise.resolve({id})});expect(preview.headers.get('Content-Disposition')).toBe('inline');expect(preview.headers.get('Content-Type')).toBe('image/jpeg');
    expect((await receptionPhotoAttachment({fileId:id,ownerId:operationClient})).content).toBe((await normalizePhoto(bytes)).toString('base64'));
    expect(response.headers.get("Content-Disposition")).toContain("attachment");expect(response.headers.get("Cache-Control")).toContain("no-store");
    cookieJar.set("ayl_session",{value:clientSession});expect((await request()).status).toBe(200);
    const outsider=(await withStore(async()=>users.find(user=>user.email==="outsider@example.invalid")!));
    cookieJar.set("ayl_session",{value:await createSessionToken(outsider.id,"cliente")});expect((await request()).status).toBe(404);
    cookieJar.delete("ayl_session");expect((await request()).status).toBe(401);
    cookieJar.set("ayl_session",{value:adminSession});
    expect((await logisticsService.getBoxById(result.box.id))?.photoFileId).toBe(id);
  });
  it("stores reception photos in R2 with private authorization and rolls back external uploads",async()=>{
    cookieJar.set('ayl_session',{value:adminSession});
    process.env.PHOTO_STORAGE='r2';process.env.R2_PRIVATE_CONFIRMED='true';
    const photo=new FormData();photo.set('file',new File([new Uint8Array(await sharp({create:{width:100,height:50,channels:3,background:'orange'}}).png().toBuffer())],'tablet.png',{type:'image/png'}));
    const input={customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false};
    try{
      const result=await receiveBoxWithPhoto(input,photo);expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error);
      const id=result.box.photoFileId!;
      const [rows]=await root.query<mysql.RowDataPacket[]>('SELECT * FROM private_files WHERE id=?',[id]);
      expect(rows[0].storage_provider).toBe('r2');expect(rows[0].content).toBeNull();expect(rows[0].object_key).toMatch(/^ayl\/reception\//);
      const request=()=>downloadPrivateFile(new Request('http://localhost'),{params:Promise.resolve({id})});
      expect((await request()).status).toBe(200);
      cookieJar.delete('ayl_session');r2Get.mockClear();expect((await request()).status).toBe(401);expect(r2Get).not.toHaveBeenCalled();
      const outsider=await withStore(async()=>users.find(u=>u.email==='outsider@example.invalid')!);
      cookieJar.set('ayl_session',{value:await createSessionToken(outsider.id,'cliente')});expect((await request()).status).toBe(404);expect(r2Get).not.toHaveBeenCalled();
      cookieJar.set('ayl_session',{value:adminSession});
      r2Get.mockRejectedValueOnce(new Error('network'));expect((await request()).status).toBe(503);
      const before=r2Files.size;
      await expect(runMutation('admin',async()=>{const saved=await receiveBoxWithPhoto(input,photo);if(!saved.ok)throw new Error(saved.error);throw new Error('rollback-r2');})).rejects.toThrow('rollback-r2');
      expect(r2Files.size).toBe(before);expect(r2Delete).toHaveBeenCalled();
      r2Put.mockRejectedValueOnce(new Error('upload failed'));
      const boxCount=(await logisticsService.getBoxes()).length;
      await expect(receiveBoxWithPhoto(input,photo)).rejects.toThrow('upload failed');
      expect((await logisticsService.getBoxes()).length).toBe(boxCount);
    }finally{process.env.PHOTO_STORAGE='mysql';process.env.R2_PRIVATE_CONFIRMED='false';}
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
    const data=new FormData();data.set("file",new File([new Uint8Array(await sharp({create:{width:32,height:32,channels:3,background:'red'}}).jpeg().toBuffer())],"photo.jpg",{type:"image/jpeg"}));
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
    expect((await assignBoxToTruck(oldTruck.id,received.box.id)).ok).toBe(true);
    expect((await removeBoxFromTruck(oldTruck.id,received.box.id)).ok).toBe(true);
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
      receiveBoxWithPhoto(input,new FormData(),{method:"deposito",amount:125}),
      receiveBoxWithPhoto(input,new FormData(),{method:"cheque",amount:125,reference:"CH-0042"})
    ]);
    const folios:string[]=[];
    for(const result of results){
      expect(result.ok).toBe(true);if(!result.ok||!result.invoice)throw new Error("payment capture");
      const payment=result.invoice.payments!.at(-1)!;
      expect(payment).toMatchObject({status:"confirmado",amountUsd:125,warehouseId:"qa-location",customerId:operationClient,actorId:userId,confirmedBy:userId,boxIds:[result.box.id]});
      expect(payment.recordedAt).toBeTruthy();expect(payment.folio).toMatch(/^PAG-\d{4}-\d{6}$/);folios.push(payment.folio);
    }
    expect(new Set(folios).size).toBe(4);
    if(results[0].ok)expect(results[0].invoice?.payments?.[0].externalReference).toBeUndefined();
    if(results[1].ok)expect(results[1].invoice?.payments?.[0].externalReference).toBe("BANK-EXTERNAL");
    if(results[3].ok)expect(results[3].invoice?.payments?.[0]).toMatchObject({method:"cheque",externalReference:"CH-0042"});
    expect((await receiveBoxWithPhoto(input,new FormData(),{method:"deposito",amount:1})).ok).toBe(false);
  });

  it("validates cheque totals atomically, supports split collection and keeps client reports pending review",async()=>{
    cookieJar.set("ayl_session",{value:adminSession});
    const item={customer:operationClient,length:10,width:16,height:12,weightLb:20,reject:false,billingMode:"manual",customPriceUsd:125};
    const before=await withStore(async()=>boxes.length);
    expect((await receivePackageGroup([item,item],new FormData(),{method:"cheque",amount:125,warehouseId:"qa-location"})).ok).toBe(false);
    expect(await withStore(async()=>boxes.length)).toBe(before);
    const group=await receivePackageGroup([item,item],new FormData(),{method:"cheque",amount:250,warehouseId:"qa-location"});
    expect(group.ok).toBe(true);if(!group.ok)throw new Error(group.error);
    for(const row of group.results){expect(row.invoice?.collectionMethod).toBe("cheque");expect(row.invoice?.payments?.at(-1)).toMatchObject({method:"cheque",status:"confirmado",amountUsd:125});}
    const pending=await receiveBoxWithPhoto(item,new FormData(),{method:"destino"});
    if(!pending.ok||!pending.invoice)throw new Error("pending cheque invoice");
    const mixed=await collectDestinationPayment(pending.invoice.id,{method:"mixto",parts:[{method:"efectivo",amount:50},{method:"cheque",amount:75,reference:"CH-MIXED"}]},new FormData());
    expect(mixed.ok).toBe(true);if(!mixed.ok)throw new Error(mixed.error);
    expect(mixed.invoice.payments?.find(p=>p.method==="cheque")).toMatchObject({status:"confirmado",amountUsd:75,externalReference:"CH-MIXED"});
    const reportable=await receiveBoxWithPhoto(item,new FormData(),{method:"destino"});
    if(!reportable.ok||!reportable.invoice)throw new Error("client cheque invoice");
    cookieJar.set("ayl_session",{value:clientSession});
    const reported=await reportInvoicePayment(reportable.invoice.id,{amount:125,method:"Cheque",reference:"CH-CLIENT"});
    expect(reported.ok).toBe(true);if(!reported.ok)throw new Error(reported.error);
    expect(reported.invoice.status).toBe("pago-reportado");
    expect(reported.invoice.payments?.at(-1)).toMatchObject({method:"cheque",status:"pendiente",externalReference:"CH-CLIENT"});
    cookieJar.set("ayl_session",{value:adminSession});
    const approved=await approvePayment(reported.invoice.id,"Cheque confirmado por operaciones",reported.invoice.paymentReport!.reportedAt);
    expect(approved.ok).toBe(true);if(!approved.ok)throw new Error(approved.error);
    expect(approved.invoice.payments?.at(-1)).toMatchObject({method:"cheque",status:"confirmado"});
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

  it("separates warehouse geography, origins and unloading destinations", async () => {
    cookieJar.set("ayl_session",{value:adminSession});
    const base={active:true,arrivalMessage:"{codigo} recibido en {almacen}, {destino}."};
    const a=await saveWarehouse({...base,name:"Origen Chicago QA",kind:"origen",country:"Estados Unidos",state:"Illinois",city:"Arlington Heights QA"});
    const b=await saveWarehouse({...base,name:"Origen El Paso QA",kind:"origen",country:"Estados Unidos",state:"Texas",city:"El Paso QA"});
    const d=await saveWarehouse({...base,name:"Destino Jalisco QA",kind:"destino",country:"México",state:"Jalisco",city:"Valle de Juárez QA"});
    expect(a.ok&&b.ok&&d.ok).toBe(true);if(!a.ok||!b.ok||!d.ok)throw new Error("warehouse setup");
    expect((await configService.getFlowConfig()).destinationCities).not.toContain(a.warehouse.city);
    expect((await configService.getFlowConfig()).destinationCities).toContain(d.warehouse.city);
    const trip=await createTruck({plate:"ORIG-2099",driverId:(await logisticsService.getDrivers())[0].id,departureDate:"2099-01-01",destinationCity:d.warehouse.city,capacity:{small:10}});
    expect(trip.ok).toBe(true);if(!trip.ok)throw new Error("origin trip");
    const stops=[{warehouseId:d.warehouse.id,arrivalDate:"2099-01-02"}];
    expect((await saveTruckStops(trip.truck.id,stops)).ok).toBe(false);
    expect((await saveTruckStops(trip.truck.id,[{warehouseId:b.warehouse.id,arrivalDate:"2099-01-02"}],a.warehouse.id)).ok).toBe(false);
    expect((await saveTruckStops(trip.truck.id,stops,a.warehouse.id)).ok).toBe(true);
    expect((await logisticsService.getTruckById(trip.truck.id))?.originWarehouseId).toBe(a.warehouse.id);
    expect((await saveWarehouse({...a.warehouse,kind:"destino"})).ok).toBe(false);
    expect((await saveWarehouse({...a.warehouse,active:false})).ok).toBe(false);
    const desk=await getDestinationDesk();
    expect(desk.warehouses.some(w=>w.id===a.warehouse.id)).toBe(false);
    expect(desk.warehouses.some(w=>w.id===d.warehouse.id)).toBe(true);
    const input={customer:operationClient,length:10,width:10,height:10,weightLb:10,reject:false,billingMode:"peso"};
    expect((await receiveBox(input)).ok).toBe(false);
    expect((await receiveBox({...input,originWarehouseId:d.warehouse.id})).ok).toBe(false);
    const receipt=await receiveBox({...input,originWarehouseId:b.warehouse.id});
    expect(receipt.ok).toBe(true);if(!receipt.ok)throw new Error("origin receipt");
    expect(receipt.box.originWarehouseId).toBe(b.warehouse.id);
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(true);
    const load=await scanLoad(trip.truck.id,receipt.box.code,d.warehouse.id);
    expect(load.ok).toBe(false);if(!load.ok)expect(load.error).toContain("otro almacén de origen");
  });

  it("persists reception recipients with new or existing addresses and rejects invalid cross-client writes",async()=>{
    cookieJar.set("ayl_session",{value:adminSession});
    const created=await createCustomerAtReception({...customer,email:"recipient-address@example.invalid"});
    if(!created.ok)throw new Error("customer");
    const id=created.user.id, initial=await getReceptionContacts(id);
    expect(initial.recipients).toHaveLength(0);
    const newAddress={...customer,label:"Casa destino",street:"Destino nuevo"};
    const result=await upsertCustomerRecipient(id,{name:"Juan Perez",phone:"+15551234567",addressId:""},undefined,newAddress);
    expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error);
    const persisted=await getReceptionContacts(id);
    expect(persisted.recipients.find(r=>r.id===result.recipient.id)?.addressId).toBe(result.address?.id);
    expect(persisted.addresses.find(a=>a.id===result.address?.id)?.street).toBe("Destino nuevo");
    const pickup=await upsertCustomerRecipient(id,{name:"María Retiro",phone:"5512345678",addressId:""},undefined,{label:"Bodega Valle de Juárez"});
    expect(pickup.ok).toBe(true);if(!pickup.ok)throw new Error(pickup.error);
    expect((await getReceptionContacts(id)).addresses.find(a=>a.id===pickup.address?.id)).toMatchObject({label:"Bodega Valle de Juárez",street:"",municipality:""});
    const origin=(await getWarehouseAdministration()).warehouses.find(w=>w.kind==="origen")!;
    const received=await receiveBox({customer:id,recipientId:pickup.recipient.id,originWarehouseId:origin.id,length:10,width:10,height:10,weightLb:10,billingMode:"manual",customPriceUsd:25,reject:false});
    expect(received.ok).toBe(true);if(!received.ok)throw new Error(received.error);
    expect(received.box.recipientSnapshot?.address.label).toBe("Bodega Valle de Juárez");
    const bad=await upsertCustomerRecipient(id,{name:"X",phone:"bad",addressId:""},undefined,newAddress);
    expect(bad.ok).toBe(false);expect((await getReceptionContacts(id)).addresses).toHaveLength(initial.addresses.length+2);
    const other=(await getReceptionContacts(userId)).addresses[0];
    expect((await upsertCustomerRecipient(id,{name:"Juan Perez",phone:"5512345678",addressId:other.id})).ok).toBe(false);
    const edited=await upsertCustomerRecipient(id,{name:"Juan actualizado",phone:"5512345678",addressId:initial.addresses[0].id},result.recipient.id);
    expect(edited.ok).toBe(true);expect((await getReceptionContacts(id)).recipients[0].name).toBe("Juan actualizado");
    expect((await upsertCustomerRecipient(id,{name:"Persona válida",phone:"5512345678",addressId:""},"missing",newAddress)).ok).toBe(false);
    expect((await getReceptionContacts(id)).addresses).toHaveLength(initial.addresses.length+2);
  });
  it("creates multiple recipients and receives individually numbered packages atomically",async()=>{
    cookieJar.set("ayl_session",{value:adminSession});
    const created=await createCustomerAtReception({...customer,email:"group-reception@example.invalid",recipients:[{name:"María López",phone:"+525512345678"},{name:"Juan López",phone:"+525587654321"}]});
    expect(created.ok).toBe(true);if(!created.ok)throw new Error("customer with recipients");
    const contacts=(await logisticsService.getRecipients()).filter(r=>r.userId===created.user.id);
    expect(contacts).toHaveLength(2);
    const origin=(await getWarehouseAdministration()).warehouses.find(w=>w.kind==="origen")!;
    const item={customer:created.user.id,recipientId:contacts[0].id,originWarehouseId:origin.id,length:10,width:10,height:10,weightLb:10,billingMode:"manual",customPriceUsd:25,reject:false};
    const before=(await logisticsService.getBoxes()).length;
    const [mailBefore]=await root.query<mysql.RowDataPacket[]>("SELECT id FROM email_outbox");
    const bad=await receivePackageGroup([item,{...item,customPriceUsd:35}],new FormData(),{method:"tarjeta",amount:1,warehouseId:"qa-location"});
    expect(bad.ok).toBe(false);expect((await logisticsService.getBoxes()).length).toBe(before);
    const [mailAfterFailure]=await root.query<mysql.RowDataPacket[]>("SELECT id FROM email_outbox");
    expect(mailAfterFailure.length).toBe(mailBefore.length);
    const received=await receivePackageGroup([item,{...item,length:20,weightLb:30,customPriceUsd:35}],new FormData(),{method:"tarjeta",amount:60,warehouseId:"qa-location"});
    expect(received.ok).toBe(true);if(!received.ok)throw new Error("batch receipt");
    expect(received.results).toHaveLength(2);expect(received.total).toBe(60);
    const [mailAfter]=await root.query<mysql.RowDataPacket[]>("SELECT id,payload FROM email_outbox");
    const added=mailAfter.filter(m=>!mailBefore.some(b=>b.id===m.id));
    expect(added).toHaveLength(1);
    const summary=decryptEmail(typeof added[0].payload==="string"?JSON.parse(added[0].payload):added[0].payload);
    expect(summary.to).toBe("group-reception@example.invalid");expect(summary.body).toContain("2 unidad(es)");expect(summary.body).toContain("USD 60.00");
    const receiptCode=received.results[0].box.receptionGroup!.code!;
    expect(receiptCode).toBeTruthy();expect(summary.subject).toContain(receiptCode);
    const saved=await logisticsService.getBoxes();
    for(const [i,r] of received.results.entries()){
      const box=saved.find(b=>b.id===r.box.id)!;
      expect(box.receptionGroup).toMatchObject({code:receiptCode,index:i+1,total:2});
      expect(box.code).toBe(`${receiptCode}-${String(i+1).padStart(2,"0")}`);
      expect(r.invoice?.lines[0].description).toContain(box.code);
      expect(box.recipientSnapshot).toMatchObject({name:"María López",phone:"+525512345678"});
      expect(r.invoice?.status).toBe("pagada");
    }
    expect(received.results[0].box.code).not.toBe(received.results[1].box.code);
    expect((await deleteCustomerRecipient(created.user.id,contacts[0].id)).ok).toBe(false);
    const foreign=await receivePackageGroup([{...item,customer:operationClient}],new FormData());
    expect(foreign.ok).toBe(false);
    await root.execute("UPDATE accounts SET verified_at=UTC_TIMESTAMP(3) WHERE user_id=?",[created.user.id]);
    cookieJar.set("ayl_session",{value:await createSessionToken(created.user.id,"cliente")});
    expect((await upsertClientRecipient({name:"Contacto actualizado",phone:"+525500001111",addressId:contacts[0].addressId},contacts[0].id)).ok).toBe(true);
    const mode=(await configService.getFlowConfig()).deliveryMode;
    const shipment=await createClientShipment({boxIds:received.results.map(r=>r.box.id),recipientId:contacts[0].id,deliveryMethod:mode==="domicilio"?"domicilio":"sucursal"});
    expect(shipment.ok).toBe(true);if(!shipment.ok)throw new Error("client group shipment");
    expect(shipment.shipment.recipientSnapshot?.name).toBe("María López");
    expect(shipment.shipment.recipientSnapshot?.phone).toBe("+525512345678");
    expect((await logisticsService.getBoxes()).every(b=>b.userId===created.user.id)).toBe(true);
    const correction={kind:"shipment",id:shipment.shipment.id,expected:recordRevision(shipment.shipment),reason:"Corregir receptor de todas las piezas",values:{recipientId:contacts[1].id,deliveryMethod:mode==="domicilio"?"domicilio":"sucursal"}};
    expect((await editOperation(correction)).ok).toBe(false);
    cookieJar.set("ayl_session",{value:adminSession});
    expect((await editOperation(correction)).ok).toBe(true);
    const corrected=(await logisticsService.getShipments()).find(s=>s.id===shipment.shipment.id)!;
    const packages=(await logisticsService.getBoxes()).filter(b=>corrected.boxIds.includes(b.id));
    expect(packages.every(b=>b.recipientSnapshot?.name===contacts[1].name&&b.recipientId===contacts[1].id)).toBe(true);
    const destination=await saveWarehouse({name:"Entrega integral QA",city:corrected.destinationCity,kind:"destino",active:true,arrivalMessage:"{codigo} recibido en {almacen}, {destino}."});
    if(!destination.ok)throw new Error("destination setup");
    const trip=await createNewTruck({plate:"FULL-2099",driverId:(await logisticsService.getDrivers())[0].id,departureDate:"2099-01-01",destinationCity:corrected.destinationCity,capacity:{[packages[0].categoryId]:5}});
    if(!trip.ok)throw new Error("trip setup");
    expect((await saveTruckStops(trip.truck.id,[{warehouseId:destination.warehouse.id,arrivalDate:"2099-01-02"}],origin.id)).ok).toBe(true);
    expect((await scanLoad(trip.truck.id,packages[0].code,destination.warehouse.id)).ok).toBe(false);
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(true);
    expect((await scanLoad(trip.truck.id,packages[0].code,destination.warehouse.id)).ok).toBe(true);
    expect((await scanLoad(trip.truck.id,packages[0].code,destination.warehouse.id)).ok).toBe(false);
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(false);
    expect((await scanLoad(trip.truck.id,packages[1].code,destination.warehouse.id)).ok).toBe(true);
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(true);
    expect((await registerDelivery({boxId:packages[0].id,receivedBy:contacts[1].name,note:"Entrega antes de descargar"})).ok).toBe(false);
    for(const box of packages)expect((await scanUnload(trip.truck.id,destination.warehouse.id,box.code)).ok).toBe(true);
    expect((await scanUnload(trip.truck.id,destination.warehouse.id,packages[0].code)).ok).toBe(false);
    for(const box of packages)expect((await registerDelivery({boxId:box.id,receivedBy:contacts[1].name,note:"Identidad y pago comprobados"})).ok).toBe(true);
    expect((await logisticsService.getShipments()).find(s=>s.id===corrected.id)?.status).toBe("entregado");
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(true);
    expect((await logisticsService.getTruckById(trip.truck.id))?.status).toBe("cerrado");
  });

  it("consolidates cash and destination groups independently under concurrent reception",async()=>{
    cookieJar.set("ayl_session",{value:adminSession});
    const origin=(await getWarehouseAdministration()).warehouses.find(w=>w.kind==="origen")!;
    const item={customer:operationClient,originWarehouseId:origin.id,length:10,width:10,height:10,weightLb:10,billingMode:"manual",customPriceUsd:25,reject:false};
    const [before]=await root.query<mysql.RowDataPacket[]>("SELECT id FROM email_outbox");
    const results=await Promise.all(["efectivo","destino"].map(method=>receivePackageGroup([item,item,item],new FormData(),{method,warehouseId:"qa-location"})));
    expect(results.every(r=>r.ok)).toBe(true);
    const codes=results.flatMap(r=>r.ok?[r.results[0].box.receptionGroup!.code]:[]);
    expect(new Set(codes).size).toBe(2);
    const [after]=await root.query<mysql.RowDataPacket[]>("SELECT id,payload FROM email_outbox");
    const added=after.filter(m=>!before.some(b=>b.id===m.id));expect(added).toHaveLength(2);
    const messages=added.map(m=>decryptEmail(typeof m.payload==="string"?JSON.parse(m.payload):m.payload));
    for(const code of codes)expect(messages.filter(m=>m.subject.includes(code!))).toHaveLength(1);
    expect(messages.every(m=>m.body.includes("3 unidad(es)")&&m.body.includes("USD 75.00"))).toBe(true);
    expect(messages.some(m=>m.body.includes("pendiente-pago-destino"))).toBe(true);
    expect(messages.some(m=>m.body.includes("pagada"))).toBe(true);
  });
  it("persists catalog fixed prices per box independently of volume and weight rates",async()=>{
    cookieJar.set("ayl_session",{value:adminSession});
    const origin=(await getWarehouseAdministration()).warehouses.find(w=>w.kind==="origen")!;
    const rates=await configService.getRateTable();
    const categories=[rates[0],rates[0],rates[1],rates[2]];
    const base={customer:operationClient,originWarehouseId:origin.id,billingMode:"fijo",overrideReason:"Selección de precio fijo por caja del catálogo.",contentsNote:"  Herramientas y ropa  ",reject:false};
    const items=categories.map((category,index)=>({...base,...category.dimensions,overrideCategory:category.id,weightLb:index+1}));
    const result=await receivePackageGroup(items,new FormData(),{method:"destino",warehouseId:"qa-location"});
    expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error);
    expect(result.total).toBe(categories.reduce((sum,category)=>sum+category.priceUsd,0));
    expect(result.results).toHaveLength(4);
    const groupCode=result.results[0].box.receptionGroup!.code;
    for(const [index,item] of result.results.entries()){
      const category=categories[index];
      const saved=await logisticsService.getBoxById(item.box.id);
      expect(saved?.billing).toMatchObject({mode:"fijo",amountUsd:category.priceUsd});
      expect(saved?.categoryId).toBe(category.id);
      expect(saved?.dimensions).toEqual(category.dimensions);
      expect(saved?.weightLb).toBe(index+1);
      expect(saved?.receptionGroup).toMatchObject({code:groupCode,index:index+1,total:4});
      expect(saved?.contentsNote).toBe("Herramientas y ropa");
    }
    const before=(await logisticsService.getBoxes()).length;
    const invalid=await receivePackageGroup([items[0],{...items[1],weightLb:rates[0].maxWeightLb+1}],new FormData(),{method:"destino",warehouseId:"qa-location"});
    expect(invalid.ok).toBe(false);
    expect((await logisticsService.getBoxes()).length).toBe(before);
  });
  it("persists independent weight, volume and manual receipts without inventing dimensions",async()=>{
    cookieJar.set("ayl_session",{value:adminSession});
    const origin=(await getWarehouseAdministration()).warehouses.find(w=>w.kind==="origen")!;
    const base={customer:operationClient,originWarehouseId:origin.id,weightLb:50.2,reject:false};
    const settings=await configService.getFlowConfig();
    const result=await receivePackageGroup([
      {...base,billingMode:"peso-real",contentsNote:"Equipo deportivo"},
      {...base,billingMode:"volumen",length:16,width:26,height:15,weightLb:500,contentsNote:"Repuestos"},
      {...base,billingMode:"manual",customPriceUsd:125,contentsNote:"Motocicleta con accesorios"},
    ],new FormData(),{method:"destino",warehouseId:"qa-location"});
    expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error);
    const volumeAmount=Math.round(16*26*15/settings.dimensionalBase*settings.dimensionalFactor*100)/100;
    expect(result.results.map(r=>r.box.billing?.billableWeightLb).slice(0,2)).toEqual([51,0]);
    expect(result.results[1].box.billing).toMatchObject({volumePricing:"direct-usd",amountUsd:volumeAmount});
    expect(result.total).toBeCloseTo(51*settings.pricePerLbUsd+volumeAmount+125,2);
    const saved=await logisticsService.getBoxById(result.results[0].box.id);
    expect(saved?.dimensions).toEqual({length:0,width:0,height:0});
    expect(saved?.billing?.mode).toBe("peso-real");
    expect(saved?.contentsNote).toBe("Equipo deportivo");
    expect((await logisticsService.getBoxById(result.results[1].box.id))?.contentsNote).toBe("Repuestos");
    expect((await logisticsService.getBoxById(result.results[2].box.id))?.contentsNote).toBe("Motocicleta con accesorios");
    expect((await logisticsService.getBoxById(result.results[1].box.id))?.weightLb).toBe(500);
    const invalid=await receivePackageGroup([{...base,billingMode:"volumen",length:16,width:26,height:15,weightLb:0}],new FormData());
    expect(invalid.ok).toBe(false);
  });
  it("sends only the first private R2 photo in one consolidated reception email",async()=>{
    cookieJar.set('ayl_session',{value:adminSession});
    const previousMode=process.env.EMAIL_DELIVERY;
    process.env.PHOTO_STORAGE='r2';process.env.R2_PRIVATE_CONFIRMED='true';
    try{
      const origin=(await getWarehouseAdministration()).warehouses.find(w=>w.kind==='origen')!;
      const input={customer:operationClient,originWarehouseId:origin.id,billingMode:'peso-real',weightLb:20};
      const data=new FormData();data.set('file',new File([new Uint8Array(await sharp({create:{width:100,height:50,channels:3,background:'blue'}}).jpeg().toBuffer())],'first.jpg',{type:'image/jpeg'}));
      const [before]=await root.query<mysql.RowDataPacket[]>('SELECT id FROM email_outbox');
      const received=await receivePackageGroup([input,input],data,{method:'destino',warehouseId:'qa-location'});
      expect(received.ok).toBe(true);if(!received.ok)throw new Error(received.error);
      const [after]=await root.query<mysql.RowDataPacket[]>('SELECT id,payload FROM email_outbox');
      const added=after.filter(row=>!before.some(b=>b.id===row.id));expect(added).toHaveLength(1);
      const mail=decryptEmail(typeof added[0].payload==='string'?JSON.parse(added[0].payload):added[0].payload);
      expect(mail.receptionPhoto).toEqual({fileId:received.results[0].box.photoFileId,ownerId:operationClient});
      expect(mail.receptionPhoto?.fileId).not.toBe(received.results[1].box.photoFileId);
      await expect(receptionPhotoAttachment({...mail.receptionPhoto!,ownerId:'not-the-owner'})).rejects.toThrow();
      const image=await receptionPhotoAttachment(mail.receptionPhoto!);expect(image.contentId).toBe('reception-photo');expect(image.content.length).toBeGreaterThan(0);
      // Isolate this delivery from the queue produced by the other workflow scenarios.
      await root.execute("UPDATE email_outbox SET available_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY) WHERE id<>? AND status IN ('queued','retry')",[added[0].id]);
      await root.execute('UPDATE email_outbox SET available_at=UTC_TIMESTAMP(),created_at=UTC_TIMESTAMP() WHERE id=?',[added[0].id]);
      process.env.EMAIL_DELIVERY='resend';emailSend.mockClear();emailSend.mockResolvedValue({data:{id:'photo-email-qa'},error:null});
      await deliverPendingEmails();
      const sent=emailSend.mock.calls.map(call=>call[0]).find(message=>message.subject===mail.subject);
      expect(sent.attachments).toHaveLength(1);expect(sent.attachments[0]).toEqual(image);expect(sent.html).toContain('src="cid:reception-photo"');
      const [status]=await root.query<mysql.RowDataPacket[]>('SELECT status FROM email_outbox WHERE id=?',[added[0].id]);expect(status[0].status).toBe('sent');
    }finally{process.env.PHOTO_STORAGE='mysql';process.env.R2_PRIVATE_CONFIRMED='false';process.env.EMAIL_DELIVERY=previousMode;}
  });
  it("loads warehouse selections atomically, records manual loading and allows dispatch without rescanning",async()=>{
    cookieJar.set("ayl_session",{value:adminSession});
    const locations=(await getWarehouseAdministration()).warehouses;
    const origin=locations.find(w=>w.kind==="origen")!,destination=locations.find(w=>w.active&&(w.kind??"destino")==="destino")!;
    const trip=await createNewTruck({plate:"MNL-2099",driverId:(await logisticsService.getDrivers())[0].id,departureDate:"2099-01-01",destinationCity:destination.city,maxWeightLb:30});
    if(!trip.ok)throw new Error(trip.error);
    const input={customer:operationClient,originWarehouseId:origin.id,length:10,width:10,height:10,weightLb:20,billingMode:"peso",reject:false};
    const a=await receiveBox(input),b=await receiveBox(input);if(!a.ok||!b.ok)throw new Error("manual receipts");
    expect((await saveTruckStops(trip.truck.id,[{warehouseId:destination.id,arrivalDate:"2099-01-02"}],origin.id)).ok).toBe(true);
    const [before]=await root.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM email_outbox");
    expect((await loadSelectedPackages(trip.truck.id,[],destination.id)).ok).toBe(false);
    expect((await loadSelectedPackages(trip.truck.id,[a.box.id],"wrong-destination")).ok).toBe(false);
    const over=await loadSelectedPackages(trip.truck.id,[a.box.id,b.box.id],destination.id);
    expect(over.ok).toBe(false);if(!over.ok)expect(over.error).toContain("peso real");
    expect((await logisticsService.getTruckById(trip.truck.id))?.status).toBe("planificado");
    expect((await logisticsService.getTruckById(trip.truck.id))?.boxIds).toEqual([]);
    expect((await logisticsService.getBoxById(a.box.id))?.status).toBe("en-bodega");
    await withStore(async()=>{trucks.find(t=>t.id===trip.truck.id)!.maxWeightLb=50;boxes.find(box=>box.id===b.box.id)!.originWarehouseId="other-origin";},true);
    expect((await loadSelectedPackages(trip.truck.id,[a.box.id,b.box.id],destination.id)).ok).toBe(false);
    expect((await logisticsService.getBoxById(a.box.id))?.truckId).toBeUndefined();
    await withStore(async()=>{boxes.find(box=>box.id===b.box.id)!.originWarehouseId=origin.id;},true);
    const [failed]=await root.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM email_outbox");expect(failed[0].n).toBe(before[0].n);
    const loaded=await loadSelectedPackages(trip.truck.id,[a.box.id,a.box.id,b.box.id],destination.id);
    expect(loaded.ok).toBe(true);if(!loaded.ok)throw new Error(loaded.error);
    expect(loaded.count).toBe(2);expect(loaded.truck.status).toBe("cargando");
    expect(loaded.truck.boxIds).toEqual([a.box.id,b.box.id]);
    for(const box of loaded.assigned){expect(box.loadScan?.method).toBe("manual");expect(box.destinationWarehouseId).toBe(destination.id);expect(box.status).toBe("cargada-en-camion");}
    const [after]=await root.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM email_outbox");expect(Number(after[0].n)-Number(before[0].n)).toBe(1);
    expect((await loadSelectedPackages(trip.truck.id,[a.box.id],destination.id)).ok).toBe(false);
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(true);
    expect((await loadSelectedPackages(trip.truck.id,[a.box.id],destination.id)).ok).toBe(false);
    cookieJar.set("ayl_session",{value:clientSession});
    await expect(loadSelectedPackages(trip.truck.id,[a.box.id],destination.id)).rejects.toThrow();
    cookieJar.set("ayl_session",{value:adminSession});
  });
  it("loads without category quotas and enforces an optional real-weight limit",async()=>{
    cookieJar.set("ayl_session",{value:adminSession});
    const locations=(await getWarehouseAdministration()).warehouses;
    const origin=locations.find(w=>w.kind==="origen")!,destination=locations.find(w=>w.active&&(w.kind??"destino")==="destino")!;
    const trip=await createNewTruck({plate:"WGHT-2099",driverId:(await logisticsService.getDrivers())[0].id,departureDate:"2099-01-01",destinationCity:destination.city,maxWeightLb:30});
    expect(trip.ok).toBe(true);if(!trip.ok)throw new Error("weight truck");
    expect(trip.truck.capacity).toEqual({});
    const input={customer:operationClient,originWarehouseId:origin.id,length:10,width:10,height:10,weightLb:20,billingMode:"peso",reject:false};
    const a=await receiveBox(input),b=await receiveBox(input);if(!a.ok||!b.ok)throw new Error("weight receipts");
    expect((await saveTruckStops(trip.truck.id,[{warehouseId:destination.id,arrivalDate:"2099-01-02"}],origin.id)).ok).toBe(true);
    expect((await transitionTruckState(trip.truck.id)).ok).toBe(true);
    expect((await scanLoad(trip.truck.id,a.box.code,destination.id)).ok).toBe(true);
    const blocked=await scanLoad(trip.truck.id,b.box.code,destination.id);
    expect(blocked.ok).toBe(false);if(!blocked.ok)expect(blocked.error).toContain("peso real");
    expect((await logisticsService.getTruckById(trip.truck.id))?.boxIds).toHaveLength(1);
    expect((await removeBoxFromTruck(trip.truck.id,a.box.id)).ok).toBe(true);
    expect((await scanLoad(trip.truck.id,b.box.code,destination.id)).ok).toBe(true);
  });

});

describe.sequential('Web Push with real MySQL and mocked delivery',()=>{
 it('binds subscriptions to the session, queues operational emails only and delivers once per device',async()=>{
  const previous={...process.env};
  Object.assign(process.env,{PUSH_ENABLED:'true',VAPID_PUBLIC_KEY:'public-test',VAPID_PRIVATE_KEY:'private-test',VAPID_SUBJECT:'mailto:test@example.invalid'});
  try{
   const token=await createSessionToken(operationClient,'cliente',true);cookieJar.set('ayl_session',{value:token});
   const sub={endpoint:'https://fcm.googleapis.com/fcm/send/test-device',keys:{auth:'a'.repeat(22),p256dh:'B'.repeat(87)}};
   expect((await subscribePush({...sub,endpoint:'http://127.0.0.1/private'})).ok).toBe(false);
   expect((await subscribePush(sub)).ok).toBe(true);expect((await pushSettings(sub.endpoint)).active).toBe(true);
   const account=await accountById(operationClient);const origin=process.env.NEXT_PUBLIC_SITE_URL??'http://localhost:3100';
   const mail={to:account!.email!,subject:'Recepción de 3 unidades',heading:'Novedades',body:'Datos privados no deben salir en el push',actionUrl:new URL('/cliente/cajas',origin).href};
   await withStore(()=>sendEmail(mail),true);
   await withStore(()=>sendEmail({...mail,actionUrl:new URL('/restablecer?token=secret',origin).href}),true);
   await deliverPendingPush();await deliverPendingPush();expect(pushSend).toHaveBeenCalledTimes(1);expect(pushSend.mock.calls[0]).not.toContain('Datos privados');
   expect((await unsubscribePush(sub.endpoint)).ok).toBe(true);expect((await pushSettings(sub.endpoint)).active).toBe(false);
   expect((await subscribePush(sub)).ok).toBe(true);await deleteSession(token);
   const [rows]=await root.query<mysql.RowDataPacket[]>('SELECT id FROM push_subscriptions WHERE user_id=?',[operationClient]);expect(rows).toHaveLength(0);
   expect(allowedPushEndpoint('https://fcm.googleapis.com.evil.test/test')).toBe(false);
   expect(operationalEmail({...mail,expiresAt:new Date(Date.now()+10000).toISOString()})).toBe(false);
  }finally{for(const key of ['PUSH_ENABLED','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}cookieJar.set('ayl_session',{value:adminSession});}
 });
});
describe.sequential('Clover with real MySQL and mocked bank requests',()=>{
 it('recovers the same reception and allows cash after decline, but blocks uncertain charges',async()=>sandbox(async fetch=>{
  cookieJar.set('ayl_session',{value:adminSession});
  const origin=(await getWarehouseAdministration()).warehouses.find(w=>w.kind==='origen')!;
  const items=[{customer:operationClient,originWarehouseId:origin.id,billingMode:'peso-real',weightLb:10,invoiceNow:true}];
  for(const uncertain of [false,true]){
   const request=crypto.randomUUID();
   const first=await receivePackageGroup(items,new FormData(),undefined,request);
   if(!first.ok)throw new Error(first.error);
   const replay=await receivePackageGroup(items,new FormData(),undefined,request);
   expect(replay.ok&&replay.results.map(r=>r.box.id)).toEqual(first.results.map(r=>r.box.id));
   if(uncertain)fetch.mockRejectedValueOnce(new Error('timeout'));else fetch.mockResolvedValueOnce(new Response(JSON.stringify({error:{type:'card_error'}}),{status:400}));
   await chargeClover(first.results.map(r=>r.invoice!.id),'clv_'+request,first.total,'127.0.0.1',origin.id);
   const fallback=await completeReceptionPayment(request,{method:'efectivo',warehouseId:origin.id});
   expect(fallback.ok).toBe(!uncertain);
   if(fallback.ok){expect(fallback.results[0].invoice?.status).toBe('pagada');expect(fallback.results[0].box.id).toBe(first.results[0].box.id);expect((await completeReceptionPayment(request,{method:'efectivo',warehouseId:origin.id})).ok).toBe(true);}
  }
 }));
 async function setup(){
  cookieJar.set('ayl_session',{value:adminSession});
  const origin=(await getWarehouseAdministration()).warehouses.find(w=>w.kind==='origen')!;
  const item={customer:operationClient,originWarehouseId:origin.id,billingMode:'peso-real',weightLb:10,invoiceNow:true};
  const result=await receivePackageGroup([item,item],new FormData());
  if(!result.ok)throw new Error(result.error);
  return {ids:result.results.map(r=>r.invoice!.id),amount:result.total,location:origin.id};
 }
 async function sandbox(work:(fetch:ReturnType<typeof vi.fn>)=>Promise<void>){
  const previous={...process.env};const originalFetch=globalThis.fetch;
  Object.assign(process.env,{CLOVER_ENABLED:'true',CLOVER_ENVIRONMENT:'sandbox',CLOVER_PUBLIC_KEY:'public-test',CLOVER_PRIVATE_KEY:'private-test',CLOVER_MERCHANT_ID:'merchant-test',EMAIL_DELIVERY:'preview'});
  const fetch=vi.fn();globalThis.fetch=fetch;
  try{await work(fetch);}finally{globalThis.fetch=originalFetch;for(const key of ['CLOVER_ENABLED','CLOVER_ENVIRONMENT','CLOVER_PUBLIC_KEY','CLOVER_PRIVATE_KEY','CLOVER_MERCHANT_ID','EMAIL_DELIVERY']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}cookieJar.set('ayl_session',{value:adminSession});}
 }
 function paid(amount:number,source='clv_testsource',id='CHARGE123'){return {id,amount,currency:'usd',status:'succeeded',paid:true,captured:true,source:{id:source}};}
 it('charges a multi-piece reception once under concurrency and persists every invoice, reference and one email',async()=>sandbox(async fetch=>{
  const batch=await setup();fetch.mockImplementation(async()=>new Response(JSON.stringify(paid(Math.round(batch.amount*100))),{status:200}));
  const quote=await quoteClover([batch.ids[0]]);expect(quote.invoiceIds).toEqual(batch.ids);expect(quote.amountUsd).toBe(batch.amount);expect(JSON.stringify(quote)).not.toContain('private-test');
  const [mailBefore]=await root.query<mysql.RowDataPacket[]>('SELECT id FROM email_outbox');
  const results=await Promise.all([1,2].map(()=>chargeClover(batch.ids,'clv_testsource',batch.amount,'127.0.0.1',batch.location)));
  expect(fetch).toHaveBeenCalledTimes(1);expect(results.some(r=>r.status==='paid')).toBe(true);
  const request=JSON.parse(fetch.mock.calls[0][1].body);expect(request.amount).toBe(Math.round(batch.amount*100));expect(request.ecomind).toBe('moto');
  for(const id of batch.ids){const invoice=(await logisticsService.getInvoices()).find(i=>i.id===id)!;expect(invoice.status).toBe('pagada');expect(invoice.collectionMethod).toBe('clover');expect(invoice.payments?.at(-1)).toMatchObject({method:'clover',externalReference:'CHARGE123',status:'confirmado',warehouseId:batch.location});}
  const [mailAfter]=await root.query<mysql.RowDataPacket[]>('SELECT id FROM email_outbox');expect(mailAfter.length-mailBefore.length).toBe(1);
  expect((await chargeClover(batch.ids,'clv_anothersource',batch.amount,'127.0.0.1',batch.location)).status).toBe('paid');expect(fetch).toHaveBeenCalledTimes(1);
  const [stored]=await root.query<mysql.RowDataPacket[]>("SELECT payload FROM entities WHERE collection_name='cloverAttempts'");expect(JSON.stringify(stored)).not.toContain('clv_testsource');expect(JSON.stringify(stored)).not.toContain('private-test');
 }));
 it('rejects forged amounts, manual Clover reports, missing location and cross-client access without charging',async()=>sandbox(async fetch=>{
  const batch=await setup();await expect(chargeClover(batch.ids,'clv_wrongtotal',0.01,'127.0.0.1',batch.location)).rejects.toThrow('total');
  await expect(chargeClover(batch.ids,'clv_nolocation',batch.amount,'127.0.0.1','bad-location')).rejects.toThrow('almacén');
  const other=await createCustomerAtReception({...customer,email:'clover-other@example.invalid'});if(!other.ok)throw new Error('client');await root.execute('UPDATE accounts SET verified_at=UTC_TIMESTAMP(3) WHERE user_id=?',[other.user.id]);cookieJar.set('ayl_session',{value:await createSessionToken(other.user.id,'cliente')});
  await expect(quoteClover(batch.ids)).rejects.toThrow('permisos');await expect(chargeClover(batch.ids,'clv_unauthorized',batch.amount,'127.0.0.1')).rejects.toThrow('permisos');
  expect((await reportInvoicePayment(batch.ids[0],{amount:batch.amount,method:'clover'})).ok).toBe(false);expect(fetch).not.toHaveBeenCalled();
 }));
 it('preserves unpaid invoices on explicit decline and allows a new card attempt',async()=>sandbox(async fetch=>{
  const batch=await setup();fetch.mockResolvedValueOnce(new Response(JSON.stringify({error:{type:'card_error'}}),{status:400}));
  expect((await chargeClover(batch.ids,'clv_declinedcard',batch.amount,'127.0.0.1',batch.location)).status).toBe('declined');
  expect((await logisticsService.getInvoices()).find(i=>i.id===batch.ids[0])).toMatchObject({status:'emitida'});
  fetch.mockResolvedValueOnce(new Response(JSON.stringify(paid(Math.round(batch.amount*100),'clv_secondcard','CHARGE456')),{status:200}));
  expect((await chargeClover(batch.ids,'clv_secondcard',batch.amount,'127.0.0.1',batch.location)).status).toBe('paid');expect(fetch).toHaveBeenCalledTimes(2);
 }));
 it('locks ambiguous charges, blocks edits and alternate payments, then reconciles by GET without charging again',async()=>sandbox(async fetch=>{
  const batch=await setup();fetch.mockRejectedValueOnce(new Error('network timeout'));
  expect((await chargeClover(batch.ids,'clv_uncertainsource',batch.amount,'127.0.0.1',batch.location)).status).toBe('review');
  expect((await chargeClover(batch.ids,'clv_retriedsource',batch.amount,'127.0.0.1',batch.location)).status).toBe('review');expect(fetch).toHaveBeenCalledTimes(1);
  const invoice=(await logisticsService.getInvoices()).find(i=>i.id===batch.ids[0])!;
  expect((await editOperation({kind:'invoice',id:invoice.id,expected:recordRevision(invoice),reason:'Intento de modificar cobro pendiente',values:{}})).ok).toBe(false);
  await root.execute('UPDATE accounts SET verified_at=UTC_TIMESTAMP(3) WHERE user_id=?',[operationClient]);cookieJar.set('ayl_session',{value:await createSessionToken(operationClient,'cliente')});
  expect((await reportInvoicePayment(invoice.id,{amount:invoiceTotal(invoice),method:'efectivo'})).ok).toBe(false);
  await expect(reconcileClover(batch.ids,'CHARGE789')).rejects.toThrow('administración');cookieJar.set('ayl_session',{value:adminSession});
  fetch.mockResolvedValueOnce(new Response(JSON.stringify(paid(Math.round(batch.amount*100),'clv_wrongsource','CHARGE789')),{status:200}));await expect(reconcileClover(batch.ids,'CHARGE789')).rejects.toThrow('coincide');
  fetch.mockResolvedValue(new Response(JSON.stringify(paid(Math.round(batch.amount*100),'clv_uncertainsource','CHARGE789')),{status:200}));
  expect((await reconcileClover(batch.ids,'CHARGE789')).status).toBe('paid');expect(fetch.mock.calls.at(-1)?.[1].method).toBe('GET');
 }));
 it('lets the owner pay online without warehouse privileges and records the portal as location',async()=>sandbox(async fetch=>{
  const batch=await setup();await root.execute('UPDATE accounts SET verified_at=UTC_TIMESTAMP(3) WHERE user_id=?',[operationClient]);cookieJar.set('ayl_session',{value:await createSessionToken(operationClient,'cliente')});
  fetch.mockResolvedValue(new Response(JSON.stringify(paid(Math.round(batch.amount*100),'clv_clientcard','CHARGECUSTOMER')),{status:200}));
  expect((await chargeClover(batch.ids,'clv_clientcard',batch.amount,'127.0.0.1')).status).toBe('paid');
  expect(JSON.parse(fetch.mock.calls[0][1].body).ecomind).toBe('ecom');expect((await logisticsService.getInvoices()).find(i=>i.id===batch.ids[0])?.payments?.at(-1)?.warehouseName).toContain('Portal del cliente');
 }));
});

describe.sequential("Administrative staff permissions in MySQL",()=>{
 it("persists invitations and permissions, isolates invoices, and enforces revocation",async()=>{
  cookieJar.set("ayl_session",{value:adminSession});
  const beforeInvoices=await logisticsService.getInvoices();
  const foreignInvoice=beforeInvoices[0];expect(foreignInvoice).toBeDefined();
  const input={firstName:"Recepción",paternalLastName:"Prueba",email:"rbac-reception@example.invalid",phone:"",active:true,fullAccess:false,permissions:["recepcion","prealertas","clientes","pendientes"]};
  expect((await saveAdministrativeStaff(input)).ok).toBe(true);
  expect((await saveAdministrativeStaff(input)).ok).toBe(false);
  const staff=(await getAdministrativeStaff()).find(u=>u.email===input.email)!;
  expect(staff.permissions).toEqual(input.permissions);
  expect((await accountById(staff.id))?.verified_at).toBeNull();
  const invitation=await withStore(()=>issueToken(staff.id,"invite"),true);
  expect((await consumeToken(invitation,"reset",password))?.id).toBe(staff.id);
  const token=await createSessionToken(staff.id,"admin");
  cookieJar.set("ayl_session",{value:token});
  expect((await requireAdminUser(["recepcion"])).id).toBe(staff.id);
  await expect(requireAdminUser(["facturas"])).rejects.toThrow("REDIRECT:");
  await expect(getAdministrativeStaff()).rejects.toThrow("REDIRECT:");
  await expect(saveAdministrativeStaff({...input,id:staff.id,fullAccess:true})).rejects.toThrow("REDIRECT:");
  await expect(inviteAdministrativeStaff(staff.id)).rejects.toThrow("REDIRECT:");
  await expect(saveFlowConfig(DEFAULT_FLOW_CONFIG)).rejects.toThrow("REDIRECT:");
  await expect(createNewTruck({})).rejects.toThrow("REDIRECT:");
  await expect(getWarehouseAdministration()).rejects.toThrow("REDIRECT:");
  expect(await logisticsService.getInvoices()).toEqual([]);
  expect((await logisticsService.getUsers()).every(u=>u.role==="cliente")).toBe(true);
  expect((await previewEmail(new Request("http://localhost/api/emails/preview?template=reset"))).status).toBe(401);
  expect((await invoicePdf(new Request("http://localhost/api/facturas/id/pdf"),{params:Promise.resolve({id:foreignInvoice.id})})).status).toBe(404);
  await expect(quoteClover([foreignInvoice.id])).rejects.toThrow("permisos");
  expect((await approvePaymentAction(foreignInvoice.id,"Intento no autorizado")).ok).toBe(false);
  const origin=await withStore(async()=>warehouses.find(w=>w.active&&(w.kind==="origen"||w.kind==="ambos"))!);
  expect(origin).toBeDefined();
  const reception=await receivePackageGroup([{customer:operationClient,originWarehouseId:origin.id,billingMode:"peso-real",weightLb:10,invoiceNow:true}],new FormData(),{method:"efectivo",warehouseId:origin.id});
  expect(reception.ok).toBe(true);
  if(!reception.ok)throw new Error(reception.error);
  expect(reception.results[0].invoice).toMatchObject({status:"pagada",receptionActorId:staff.id});
  expect((await logisticsService.getInvoices()).map(i=>i.id)).toEqual([reception.results[0].invoice!.id]);
  cookieJar.set("ayl_session",{value:adminSession});
  expect((await saveAdministrativeStaff({...staff,permissions:["prealertas"]})).ok).toBe(true);
  expect(await verifySessionToken(token)).toBeNull();
  const newToken=await createSessionToken(staff.id,"admin");cookieJar.set("ayl_session",{value:newToken});
  await expect(requireAdminUser(["recepcion"])).rejects.toThrow("REDIRECT:");
  expect((await requireAdminUser(["prealertas"])).id).toBe(staff.id);
  expect(await logisticsService.getInvoices()).toEqual([]);
  cookieJar.set("ayl_session",{value:adminSession});
 });
 it("protects the current full administrator from self-lockout",async()=>{
  cookieJar.set("ayl_session",{value:adminSession});
  const current=await requireAdminUser(),staff=(await getAdministrativeStaff()).find(u=>u.id===current.id)!;
  expect((await saveAdministrativeStaff({...staff,fullAccess:false,permissions:["recepcion"]})).ok).toBe(false);
  expect((await saveAdministrativeStaff({...staff,active:false})).ok).toBe(false);
  expect((await requireAdminUser()).id).toBe(current.id);
 });
});
describe.sequential("Full-admin invoice corrections and recoverable duplicate packages",()=>{
 let customerId="",originId="",packageIds:string[]=[],invoiceId="",receptionCode="";
 it("creates an isolated four-package reception for correction tests",async()=>{
  cookieJar.set("ayl_session",{value:adminSession});
  const customer=await createCustomerAsAdmin({firstName:"Corrección",paternalLastName:"Duplicados",phone:"5512345678"});
  if(!customer.ok)throw new Error(customer.error);customerId=customer.user.id;
  originId=await withStore(async()=>warehouses.find(w=>w.active&&(w.kind==="origen"||w.kind==="ambos"))!.id);
  const item={customer:customerId,originWarehouseId:originId,billingMode:"manual",customPriceUsd:80,weightLb:10,invoiceNow:true};
  const received=await receivePackageGroup([item,item,item,item],new FormData(),{method:"efectivo",warehouseId:originId});
  if(!received.ok)throw new Error(received.error);
  packageIds=received.results.map(r=>r.box.id);invoiceId=received.results[0].invoice!.id;receptionCode=received.results[0].box.receptionGroup!.code!;
  expect(received.total).toBe(320);expect(await getCustomerArchives(customerId)).toEqual([]);
  // Test-only activation so the client inventory can be checked independently of invitation delivery.
  await root.execute("UPDATE accounts SET verified_at=UTC_TIMESTAMP(3) WHERE user_id=?",[customerId]);
 });
 it("edits paid items and payment method atomically, preserving identifiers and an audit snapshot",async()=>{
  const before=await withStore(async()=>structuredClone(invoices.find(i=>i.id===invoiceId)!));
  const values=invoiceCorrectionDraft(before);values.lines[0]={...values.lines[0],categoryName:"Servicio corregido",description:"Carga descrita",quantity:2,unitPriceUsd:50};
  values.payments[0]={...values.payments[0],amountUsd:100,method:"cheque",externalReference:"CHEQUE-QA"};
  const result=await correctInvoice({id:invoiceId,expected:recordRevision(before),reason:"Ajuste documental autorizado",values});
  expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error);
  expect(result.invoice).toMatchObject({id:before.id,number:before.number,userId:customerId,boxIds:before.boxIds,status:"pagada",collectionMethod:"cheque"});
  expect(invoiceTotal(result.invoice)).toBe(100);
  expect(result.invoice.payments?.[0]).toMatchObject({folio:before.payments![0].folio,actorId:before.payments![0].actorId,method:"cheque",amountUsd:100,externalReference:"CHEQUE-QA"});
  expect(result.invoice.paymentReport?.amountUsd).toBe(100);
  expect(await withStore(async()=>collection<{id:string;kind:string;entityId:string;reason:string}>("operationalEdits").some(e=>e.kind==="invoice"&&e.entityId===invoiceId))).toBe(true);
  const persisted=await withStore(async()=>structuredClone(invoices.find(i=>i.id===invoiceId)!));
  expect(recordRevision(persisted)).toBe(recordRevision(result.invoice));
  expect((await correctInvoice({id:invoiceId,expected:recordRevision(before),reason:"Intento de edición desactualizado",values})).ok).toBe(false);
  const invalid=invoiceCorrectionDraft(persisted);invalid.lines[0].unitPriceUsd=70;
  expect((await correctInvoice({id:invoiceId,expected:recordRevision(persisted),reason:"Importes inconsistentes",values:invalid})).ok).toBe(false);
  expect(await withStore(async()=>recordRevision(invoices.find(i=>i.id===invoiceId)))).toBe(recordRevision(persisted));
 });
 it("protects Clover provider confirmation while allowing same-total text corrections",async()=>{
  const cloverId=await withStore(async()=>{const invoice=invoices.find(i=>i.boxIds?.includes(packageIds[1]))!;invoice.cloverPaymentId="fixture-provider-charge";invoice.collectionMethod="clover";invoice.payments![0].method="clover";delete invoice.payments![0].warehouseId;delete invoice.payments![0].warehouseName;return invoice.id;},true);
  const original=await withStore(async()=>structuredClone(invoices.find(i=>i.id===cloverId)!));
  const values=invoiceCorrectionDraft(original);values.lines[0].description="Descripción corregida sin nuevo cargo";
  const result=await correctInvoice({id:cloverId,expected:recordRevision(original),reason:"Precisar descripción",values});expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error);
  expect(result.invoice.payments).toEqual(original.payments);expect(result.invoice.paymentReport).toEqual(original.paymentReport);
  values.lines[0].unitPriceUsd=90;
  expect((await correctInvoice({id:cloverId,expected:recordRevision(result.invoice),reason:"Cambio de cargo bloqueado",values})).ok).toBe(false);
 });
 it("removes a package at the customer request without assuming a duplicate or changing payments",async()=>{
  const before=await withStore(async()=>recordRevision(invoices.filter(i=>i.userId===customerId)));
  const preview=await previewCustomerArchive({id:packageIds[0],scope:"piece"});if(!preview.ok)throw new Error(preview.error);
  expect(preview.count).toBe(1);expect(preview.paidInvoicesKept).toBe(1);
  expect((await archiveCustomerBoxes({id:packageIds[0],scope:"piece",revision:preview.revision,reason:"Caja asignada dos veces",confirmation:"incorrecta"})).ok).toBe(false);
  const removed=await archiveCustomerBoxes({id:packageIds[0],scope:"piece",revision:preview.revision,reason:"Cancelación a solicitud del cliente",confirmation:"RETIRAR"});if(!removed.ok)throw new Error(removed.error);
  const activity=await withStore(async()=>users.find(u=>u.id===customerId)!.activity[0].description);
  expect(activity).toContain("Cancelación a solicitud del cliente");expect(activity).not.toMatch(/duplicad/i);
  expect(await withStore(async()=>boxes.find(b=>b.id===packageIds[1])!.timeline.at(-1)?.note)).not.toMatch(/duplicad/i);
  expect(await withStore(async()=>recordRevision(invoices.filter(i=>i.userId===customerId)))).toBe(before);
  const active=await withStore(async()=>boxes.filter(b=>b.userId===customerId));expect(active).toHaveLength(3);
  expect(active.map(b=>b.receptionGroup!.index).sort()).toEqual([1,2,3]);expect(active.every(b=>b.receptionGroup!.total===3)).toBe(true);
  cookieJar.set("ayl_session",{value:await createSessionToken(customerId,"cliente")});
  expect(await logisticsService.getBoxes()).toHaveLength(3);
  await expect(getCustomerArchives(customerId)).rejects.toThrow("REDIRECT:");
  cookieJar.set("ayl_session",{value:adminSession});
  expect((await getCustomerArchives(customerId))[0]).toMatchObject({id:removed.archiveId,count:1});
  expect((await restoreCustomerBoxes(removed.archiveId)).ok).toBe(true);
  expect((await restoreCustomerBoxes(removed.archiveId)).ok).toBe(false);
  expect(await withStore(async()=>boxes.filter(b=>b.userId===customerId).map(b=>b.id).sort())).toEqual([...packageIds].sort());
 });
 it("removes and restores a complete reception and never reuses archived codes",async()=>{
  cookieJar.set("ayl_session",{value:adminSession});
  const before=await withStore(async()=>recordRevision(invoices.filter(i=>i.userId===customerId)));
  const preview=await previewCustomerArchive({id:packageIds[0],scope:"reception"});if(!preview.ok)throw new Error(preview.error);expect(preview.count).toBe(4);
  const removed=await archiveCustomerBoxes({id:packageIds[0],scope:"reception",revision:preview.revision,reason:"Recepción duplicada completa",confirmation:"RETIRAR"});if(!removed.ok)throw new Error(removed.error);
  expect(await withStore(async()=>boxes.filter(b=>b.userId===customerId))).toEqual([]);
  expect(await withStore(async()=>recordRevision(invoices.filter(i=>i.userId===customerId)))).toBe(before);
  const next=await receivePackageGroup([{customer:customerId,originWarehouseId:originId,billingMode:"peso-real",weightLb:1}],new FormData());if(!next.ok)throw new Error(next.error);
  expect(next.results[0].box.receptionGroup!.code).not.toBe(receptionCode);
  expect((await restoreCustomerBoxes(removed.archiveId)).ok).toBe(true);
  expect(await getCustomerArchives(customerId)).toEqual([]);
 });
 it("rejects stale previews, moved packages and limited administrators",async()=>{
  cookieJar.set("ayl_session",{value:adminSession});
  const preview=await previewCustomerArchive({id:packageIds[0],scope:"piece"});if(!preview.ok)throw new Error(preview.error);
  await withStore(async()=>{boxes.find(b=>b.id===packageIds[0])!.weightLb=11;},true);
  expect((await archiveCustomerBoxes({id:packageIds[0],scope:"piece",revision:preview.revision,reason:"Vista previa vieja",confirmation:"RETIRAR"})).ok).toBe(false);
  await withStore(async()=>{trucks[0].boxIds.push(packageIds[0]);},true);
  expect((await previewCustomerArchive({id:packageIds[0],scope:"piece"})).ok).toBe(false);
  await withStore(async()=>{trucks[0].boxIds=trucks[0].boxIds.filter(id=>id!==packageIds[0]);},true);
  const staff=(await getAdministrativeStaff()).find(u=>u.email==="rbac-reception@example.invalid")!;
  cookieJar.set("ayl_session",{value:await createSessionToken(staff.id,"admin")});
  await expect(previewCustomerArchive({id:packageIds[0],scope:"piece"})).rejects.toThrow("REDIRECT:");
  await expect(archiveCustomerBoxes({})).rejects.toThrow("REDIRECT:");
  await expect(restoreCustomerBoxes("any")).rejects.toThrow("REDIRECT:");
  await expect(correctInvoice({})).rejects.toThrow("REDIRECT:");
  cookieJar.set("ayl_session",{value:adminSession});
 });
});

describe.sequential("Optional customer contact and full-admin test cleanup",()=>{
 it('resolves an empty label address from the linked recipient without changing reception history',async()=>{
  cookieJar.set('ayl_session',{value:adminSession});
  const account=await withStore(()=>createAccount({...customer,email:'label-address@example.invalid'},password),true);
  const personId=randomUUID();
  await withStore(async()=>{recipients.push({id:personId,userId:account.user.id,name:'Destinatario QA',phone:'15550000000',addressId:''});},true);
  const origin=await withStore(async()=>warehouses.find(w=>w.active&&(w.kind==='origen'||w.kind==='ambos'))!);
  const result=await receiveBox({customer:account.user.id,recipientId:personId,originWarehouseId:origin.id,billingMode:'manual',customPriceUsd:30,weightLb:20,invoiceNow:true});
  if(!result.ok)throw new Error(result.error);
  const snapshot=JSON.stringify(result.box.recipientSnapshot);
  await withStore(async()=>{const address=addresses.find(a=>a.id===account.address.id)!;address.references='Bodega Valle de Juárez';recipients.find(r=>r.id===personId)!.addressId=address.id;},true);
  const printed=await logisticsService.getPackageLabelRecipients([result.box.id]);
  expect(printed[0].recipient?.address?.references).toBe('Bodega Valle de Juárez');
  expect((await logisticsService.getBoxById(result.box.id))?.recipientSnapshot).toEqual(JSON.parse(snapshot));
  cookieJar.set('ayl_session',{value:clientSession});
  await expect(logisticsService.getPackageLabelRecipients([result.box.id])).rejects.toThrow('REDIRECT:');
  cookieJar.set('ayl_session',{value:adminSession});
 });
 it('persists a mixed reception without assigning box weight or cost to the motorcycle and replays safely',async()=>{
  cookieJar.set('ayl_session',{value:adminSession});
  const origin=await withStore(async()=>warehouses.find(w=>w.active&&(w.kind==='origen'||w.kind==='ambos'))!);
  const base={customer:operationClient,originWarehouseId:origin.id,invoiceNow:true};
  const concepts=[{id:'moto',description:'Moto Honda · VIN 201285',quantity:1,mode:'manual',priceUsd:3000,weightLb:0,weightUnknown:true},{id:'boxes',description:'Cajas extras',quantity:5,mode:'peso-personalizado',weightScope:'grupo',weightLb:117,rateUsd:3.2}];
  const payment={method:'mixto',warehouseId:origin.id,parts:[{method:'efectivo',amount:1000},{method:'zelle',amount:2374.4,reference:'MIXED-QA'}]},request=randomUUID();
  const [beforeEmails]=await root.query<mysql.RowDataPacket[]>('SELECT id FROM email_outbox');
  const before=await withStore(async()=>({boxes:boxes.length,invoices:invoices.length}));
  const invalid=await receivePackageGroup([base],new FormData(),payment,randomUUID(),undefined,[concepts[0],{...concepts[1],weightLb:0}]);expect(invalid.ok).toBe(false);
  expect(await withStore(async()=>({boxes:boxes.length,invoices:invoices.length}))).toEqual(before);
  const result=await receivePackageGroup([base],new FormData(),payment,request,undefined,concepts);
  expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error);
  expect(result.total).toBe(3374.4);expect(result.results).toHaveLength(6);
  const moto=result.results[0];expect(moto.box).toMatchObject({weightLb:0,weightUnknown:true,receptionConcept:{description:'Moto Honda · VIN 201285',totalAmountUsd:3000,totalWeightLb:0},billing:{amountUsd:3000}});expect(moto.box.billing?.groupWeight).toBeUndefined();
  for(const row of result.results.slice(1)){expect(row.box.billing).toMatchObject({amountUsd:74.88,groupWeight:{totalWeightLb:117,pieces:5,totalAmountUsd:374.4}});expect(row.box.weightLb).toBe(23.4);}
  expect(new Set(result.results.map(r=>r.box.code)).size).toBe(6);expect(new Set(result.results.map(r=>r.box.receptionGroup?.id)).size).toBe(1);
  expect(moto.invoice?.lines[0].description).toContain('Moto Honda');
  const replay=await receivePackageGroup([base],new FormData(),payment,request,undefined,concepts);expect(replay.ok).toBe(true);expect(await withStore(async()=>boxes.length)).toBe(before.boxes+6);
  expect((await receivePackageGroup([base],new FormData(),payment,request,undefined,[{...concepts[0],description:'Changed'},concepts[1]])).ok).toBe(false);
  const stored=await logisticsService.getBoxById(moto.box.id);expect(stored?.receptionConcept?.totalAmountUsd).toBe(3000);
  const [messages]=await root.query<mysql.RowDataPacket[]>('SELECT id,payload FROM email_outbox');
  const emails=messages.filter(row=>!beforeEmails.some(previous=>previous.id===row.id)).map(row=>decryptEmail(typeof row.payload==='string'?JSON.parse(row.payload):row.payload));
  expect(emails).toHaveLength(1);expect(emails[0].reception?.concepts).toMatchObject([{amountUsd:3000,count:1},{amountUsd:374.4,count:5}]);
  const originalInvoice=JSON.stringify(await withStore(async()=>invoices.find(i=>i.id===moto.invoice!.id)));
  expect((await registerPendingCargoWeight(moto.box.id,250)).ok).toBe(true);
  expect((await logisticsService.getBoxById(moto.box.id))?.weightUnknown).toBe(false);
  expect(JSON.stringify(await withStore(async()=>invoices.find(i=>i.id===moto.invoice!.id)))).toBe(originalInvoice);
  expect((await registerPendingCargoWeight(moto.box.id,260)).ok).toBe(false);
 });
 it("receives 13 jointly weighed packages with a custom rate and cash plus Zelle exactly once",async()=>{
  cookieJar.set('ayl_session',{value:adminSession});
  const origin=await withStore(async()=>warehouses.find(w=>w.active&&(w.kind==='origen'||w.kind==='ambos'))!);
  const item={customer:operationClient,originWarehouseId:origin.id,billingMode:'peso-personalizado',customRatePerLbUsd:3.5,weightLb:726,invoiceNow:true};
  const items=Array.from({length:13},()=>({...item}));
  const payment={method:'mixto',warehouseId:origin.id,parts:[{method:'efectivo',amount:1000},{method:'zelle',amount:1541,reference:'ZELLE-QA'}]};
  const request=randomUUID(),scope={totalWeightLb:726};
  const before=await withStore(async()=>boxes.length);
  const short=await receivePackageGroup(items,new FormData(),{...payment,parts:[{method:'efectivo',amount:1000},{method:'zelle',amount:1540}]},randomUUID(),scope);
  expect(short.ok).toBe(false);expect(await withStore(async()=>boxes.length)).toBe(before);
  const received=await receivePackageGroup(items,new FormData(),payment,request,scope);
  expect(received.ok).toBe(true);if(!received.ok)throw new Error(received.error);
  expect(received.total).toBe(2541);expect(received.results).toHaveLength(13);
  expect(received.results.reduce((s,r)=>s+Math.round(r.box.weightLb*1000),0)).toBe(726000);
  for(const row of received.results){expect(row.box.billing?.groupWeight).toMatchObject({totalWeightLb:726,totalAmountUsd:2541,pieces:13});expect(row.invoice?.status).toBe('pagada');expect(row.invoice?.collectionMethod).toBe('mixto');}
  const payments=received.results.flatMap(r=>r.invoice!.payments!.filter(p=>p.status==='confirmado'));
  expect(payments.filter(p=>p.method==='efectivo').reduce((s,p)=>s+Math.round(p.amountUsd*100),0)).toBe(100000);
  expect(payments.filter(p=>p.method==='zelle').reduce((s,p)=>s+Math.round(p.amountUsd*100),0)).toBe(154100);
  expect(payments.filter(p=>p.method==='zelle').every(p=>p.externalReference==='ZELLE-QA')).toBe(true);
  const replay=await receivePackageGroup(items,new FormData(),payment,request,scope);expect(replay.ok).toBe(true);
  expect(await withStore(async()=>boxes.length)).toBe(before+13);
  const stored=await withStore(async()=>invoices.filter(i=>received.results.some(r=>r.invoice?.id===i.id)).flatMap(i=>i.payments??[]));expect(stored).toHaveLength(payments.length);
  expect((await receivePackageGroup([{...item,customRatePerLbUsd:undefined}],new FormData())).ok).toBe(false);
 });
 it("lets full admin delete warehouse operators and administrative users and revokes their sessions",async()=>{
  cookieJar.set("ayl_session",{value:adminSession});
  const warehouse=await withStore(async()=>warehouses.find(w=>w.active)!);
  expect((await saveWarehouseOperator({firstName:"Operador",paternalLastName:"Eliminar",email:"delete-operator@example.invalid",phone:"",active:true,grants:[{warehouseId:warehouse.id,receive:true,viewContacts:true}]})).ok).toBe(true);
  for(const fullAccess of [false,true])expect((await saveAdministrativeStaff({firstName:"Admin",paternalLastName:"Eliminar",email:`delete-admin-${fullAccess}@example.invalid`,phone:"",active:true,fullAccess,permissions:["recepcion"]})).ok).toBe(true);
  for(const email of ["delete-operator@example.invalid","delete-admin-false@example.invalid","delete-admin-true@example.invalid"]){
   const user=await withStore(async()=>users.find(u=>u.email===email)!);
   const token=await createSessionToken(user.id,user.role);
   expect((await getDeletionDirectory()).people.some(p=>p.id===user.id)).toBe(true);
   const preview=await previewDeletion({kind:"user",id:user.id});expect(preview.ok).toBe(true);if(!preview.ok)throw new Error(preview.error);
   const result=await deleteTestRecord({kind:"user",id:user.id,revision:preview.revision,testData:true,confirmation:"ELIMINAR",reason:"Usuario de pruebas"});expect(result.ok).toBe(true);
   expect(await verifySessionToken(token)).toBeNull();expect((await accountById(user.id))?.active).toBe(0);
   expect((await getDeletionDirectory()).people.some(p=>p.id===user.id)).toBe(false);
  }
 });
 let customerId="",boxId="",originalCode="";
 const minimal={firstName:"Sin correo",paternalLastName:"Prueba",phone:"5512345678"};
 it("creates multiple customers without email or address and skips email/token generation",async()=>{
  cookieJar.set("ayl_session",{value:adminSession});
  for(let n=0;n<2;n++){
   const result=await createCustomerAtReception({...minimal,recipients:[{name:"Recibe Prueba",phone:"5512345678"}]});
   expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error);
   customerId=result.user.id;expect(result.user.email).toBe("");expect(result.address.id).toBe("");
   expect((await accountById(customerId))?.email).toBeNull();
   expect(await withStore(async()=>addresses.filter(a=>a.userId===customerId))).toEqual([]);
   const [tokens]=await root.query<mysql.RowDataPacket[]>("SELECT * FROM auth_tokens WHERE user_id=?",[customerId]);expect(tokens).toHaveLength(0);
  }
  expect((await sendEmail({to:"",subject:"Ignored",heading:"Ignored",body:"Ignored"})).status).toBe("skipped-no-email");
  expect((await createCustomerAsAdmin({...minimal,email:"invalid"})).ok).toBe(false);
  expect((await createCustomerAsAdmin({...minimal,postalCode:"abc"})).ok).toBe(false);
  const partial=await createCustomerAsAdmin({...minimal,state:"Jalisco"});expect(partial.ok).toBe(true);
  if(partial.ok)expect(partial.address.state).toBe("Jalisco");
 });
 it("receives a group for a recipient without address and previews all its units",async()=>{
  const contacts=await getReceptionContacts(customerId);expect(contacts.addresses).toHaveLength(0);expect(contacts.recipients).toHaveLength(1);
  expect((await upsertCustomerRecipient(customerId,{name:"Otro contacto",phone:"5512345678",addressId:""})).ok).toBe(true);
  expect((await upsertCustomerRecipient(customerId,{name:"Contacto ajeno",phone:"5512345678",addressId:"foreign"})).ok).toBe(false);
  const origin=await withStore(async()=>warehouses.find(w=>w.active&&(w.kind==="origen"||w.kind==="ambos"))!);
  const item={customer:customerId,recipientId:contacts.recipients[0].id,originWarehouseId:origin.id,billingMode:"peso-real",weightLb:10,invoiceNow:true};
  const received=await receivePackageGroup([item,item],new FormData(),{method:"efectivo",warehouseId:origin.id});
  expect(received.ok).toBe(true);if(!received.ok)throw new Error(received.error);
  boxId=received.results[0].box.id;originalCode=received.results[0].box.receptionGroup!.code!;
  expect(received.results[0].box.recipientSnapshot?.name).toBe("Recibe Prueba");
  const preview=await previewDeletion({kind:"order",id:boxId});
  expect(preview.ok).toBe(true);if(preview.ok){expect(preview.counts.packages).toBe(2);expect(preview.paidInvoices).toBeGreaterThan(0);}
  expect((await previewDeletion({kind:"user",id:customerId})).ok).toBe(false);
 });
 it("requires full admin and rejects self deletion and stale previews",async()=>{
  const me=await requireAdminUser();expect((await previewDeletion({kind:"user",id:me.id})).ok).toBe(false);
  const preview=await previewDeletion({kind:"order",id:boxId});if(!preview.ok)throw new Error(preview.error);
  await withStore(async()=>{boxes.find(b=>b.id===boxId)!.weightLb=11;},true);
  expect((await deleteTestRecord({kind:"order",id:boxId,revision:preview.revision,confirmation:"ELIMINAR",testData:true,reason:"Pruebas automatizadas"})).ok).toBe(false);
  const staff=(await getAdministrativeStaff()).find(u=>u.email==="rbac-reception@example.invalid")!;
  cookieJar.set("ayl_session",{value:await createSessionToken(staff.id,"admin")});
  await expect(getDeletionDirectory()).rejects.toThrow("REDIRECT:");
  await expect(deleteTestRecord({})).rejects.toThrow("REDIRECT:");
  cookieJar.set("ayl_session",{value:adminSession});
 });
 it("blocks Clover records, removes a reception atomically and never reuses its code",async()=>{
  const fileId=randomUUID(),bytes=Buffer.from("test photo");
  await root.execute("INSERT INTO private_files(id,owner_id,entity_type,entity_id,original_name,mime_type,byte_size,sha256,content) VALUES (?,?,'box',?,'test.jpg','image/jpeg',?,?,?)",[fileId,customerId,boxId,bytes.length,createHash('sha256').update(bytes).digest('hex'),bytes]);
  const truckId=await withStore(async()=>{const truck=trucks[0];truck.boxIds.push(boxId);return truck.id;},true);
  expect((await downloadPrivateFile(new Request('http://localhost/api/files/'+fileId),{params:Promise.resolve({id:fileId})})).status).toBe(200);
  const invoiceId=await withStore(async()=>invoices.find(i=>i.boxIds?.includes(boxId))!.id);
  await withStore(async()=>{invoices.find(i=>i.id===invoiceId)!.collectionMethod="clover";},true);
  expect((await previewDeletion({kind:"order",id:boxId})).ok).toBe(false);
  await withStore(async()=>{invoices.find(i=>i.id===invoiceId)!.collectionMethod="efectivo";},true);
  const preview=await previewDeletion({kind:"order",id:boxId});if(!preview.ok)throw new Error(preview.error);
  const result=await deleteTestRecord({kind:"order",id:boxId,revision:preview.revision,confirmation:"ELIMINAR",testData:true,reason:"Pruebas automatizadas"});
  expect(result.ok).toBe(true);
  expect((await downloadPrivateFile(new Request('http://localhost/api/files/'+fileId),{params:Promise.resolve({id:fileId})})).status).toBe(404);
  expect(await withStore(async()=>trucks.find(t=>t.id===truckId)!.boxIds.includes(boxId))).toBe(false);
  expect(await withStore(async()=>boxes.some(b=>b.userId===customerId)||invoices.some(i=>i.userId===customerId))).toBe(false);
  const origin=await withStore(async()=>warehouses.find(w=>w.active&&(w.kind==="origen"||w.kind==="ambos"))!);
  const next=await receivePackageGroup([{customer:customerId,originWarehouseId:origin.id,billingMode:"peso-real",weightLb:10}],new FormData());
  expect(next.ok).toBe(true);if(!next.ok)throw new Error(next.error);
  expect(next.results[0].box.receptionGroup!.code).not.toBe(originalCode);
  const nextPreview=await previewDeletion({kind:"order",id:next.results[0].box.id});if(!nextPreview.ok)throw new Error(nextPreview.error);
  expect((await deleteTestRecord({kind:"order",id:next.results[0].box.id,revision:nextPreview.revision,confirmation:"ELIMINAR",testData:true,reason:"Pruebas automatizadas"})).ok).toBe(true);
 });
 it("adds email later, invites the customer, then disables the deleted account and frees email",async()=>{
  const email="optional-added@example.invalid";
  expect((await updateCustomerProfile(customerId,{...minimal,email})).ok).toBe(true);
  expect((await accountById(customerId))?.verified_at).toBeNull();
  const [tokens]=await root.query<mysql.RowDataPacket[]>("SELECT * FROM auth_tokens WHERE user_id=? AND purpose='invite'",[customerId]);expect(tokens).toHaveLength(1);
  const preview=await previewDeletion({kind:"user",id:customerId});if(!preview.ok)throw new Error(preview.error);
  expect((await deleteTestRecord({kind:"user",id:customerId,revision:preview.revision,confirmation:"ELIMINAR",testData:true,reason:"Pruebas automatizadas"})).ok).toBe(true);
  expect((await accountById(customerId))?.active).toBe(0);
  expect(await withStore(async()=>users.some(u=>u.id===customerId))).toBe(false);
  expect(await findAccount(email)).toBeNull();
  const [messages]=await root.query<mysql.RowDataPacket[]>("SELECT payload FROM email_outbox WHERE status IN ('queued','retry')");
  expect(messages.map(row=>decryptEmail(typeof row.payload==='string'?JSON.parse(row.payload):row.payload).to)).not.toContain(email);
  expect((await createCustomerAsAdmin({...minimal,email})).ok).toBe(true);
 });
});

describe.sequential('Package-specific delivery assignment',()=>{
 let packageId='',otherPackageId='',addressId='',personId='',customerId='';
 it('assigns an existing address explicitly and persists the snapshot without modifying payments or other pieces',async()=>{
  cookieJar.set('ayl_session',{value:adminSession});
  const account=await withStore(()=>createAccount({...customer,email:'delivery-edit@example.invalid'},password),true);
  customerId=account.user.id;addressId=account.address.id;personId=randomUUID();
  await withStore(async()=>recipients.push({id:personId,userId:customerId,name:'Guadalupe QA',phone:'3332388900',addressId:''}),true);
  const origin=await withStore(async()=>warehouses.find(w=>w.active&&(w.kind==='origen'||w.kind==='ambos'))!);
  const input={customer:customerId,recipientId:personId,originWarehouseId:origin.id,billingMode:'manual',customPriceUsd:50,weightLb:67,invoiceNow:true};
  const received=await receiveBox(input),other=await receiveBox(input);
  if(!received.ok||!other.ok)throw new Error('Could not set up test reception');
  packageId=received.box.id;otherPackageId=other.box.id;
  const original=JSON.stringify(await logisticsService.getBoxById(otherPackageId));
  const financial=JSON.stringify(await withStore(async()=>invoices.filter(i=>i.userId===customerId)));
  const directory=JSON.stringify(await withStore(async()=>({addresses:addresses.filter(a=>a.userId===customerId),recipients:recipients.filter(r=>r.userId===customerId)})));
  const data=await getPackageDelivery(packageId);expect(data?.recipient?.address?.street).toBe('');
  const result=await savePackageDelivery(packageId,{revision:data!.revision,recipientId:personId,name:'Guadalupe QA',phone:'3332388900',addressId,reason:'Completar dirección pendiente'});
  expect(result.ok).toBe(true);
  expect((await logisticsService.getBoxById(packageId))?.recipientSnapshot?.address.id).toBe(addressId);
  expect((await logisticsService.getPackageLabelRecipients([packageId]))[0].recipient?.address?.street).toBe(customer.street);
  expect(JSON.stringify(await logisticsService.getBoxById(otherPackageId))).toBe(original);
  expect(JSON.stringify(await withStore(async()=>invoices.filter(i=>i.userId===customerId)))).toBe(financial);
  expect(JSON.stringify(await withStore(async()=>({addresses:addresses.filter(a=>a.userId===customerId),recipients:recipients.filter(r=>r.userId===customerId)})))).toBe(directory);
  expect((await getPackageDelivery(packageId))?.revision).not.toBe(data!.revision);
  expect(await withStore(async()=>collection<{id:string;boxId:string}>('packageDeliveryEdits').filter(e=>e.boxId===packageId).length)).toBe(1);
 });
 it('allows a pickup-only reference and preserves its label when the customer directory changes',async()=>{
  const data=await getPackageDelivery(packageId);
  expect((await savePackageDelivery(packageId,{revision:data!.revision,recipientId:personId,name:'Guadalupe QA',phone:'3332388900',newAddress:{label:'Bodega Valle de Juárez'},reason:'Retiro solicitado por cliente'})).ok).toBe(true);
  await withStore(async()=>{addresses.find(a=>a.id===addressId)!.street='Dirección cambiada en directorio';},true);
  const printed=(await logisticsService.getPackageLabelRecipients([packageId]))[0].recipient;
  expect(printed?.address).toMatchObject({label:'Bodega Valle de Juárez',street:'',municipality:''});
  expect((await logisticsService.getBoxById(packageId))?.timeline.at(-1)?.note).toContain('Reimprimir etiqueta');
 });
 it('rejects stale changes, foreign-client contacts/addresses and delivered packages atomically',async()=>{
  const data=await getPackageDelivery(packageId),base={revision:data!.revision,name:'Guadalupe QA',phone:'3332388900',addressId,reason:'Completar entrega de prueba'};
  const foreign=await withStore(async()=>addresses.find(a=>a.userId!==customerId)!);
  const original=JSON.stringify(await logisticsService.getBoxById(packageId));
  expect((await savePackageDelivery(packageId,{...base,addressId:foreign.id})).ok).toBe(false);
  expect((await savePackageDelivery(packageId,{...base,recipientId:'foreign-contact'})).ok).toBe(false);
  expect((await savePackageDelivery(packageId,{...base,revision:'0'.repeat(64)})).ok).toBe(false);
  expect((await savePackageDelivery(packageId,{...base,addressId:'',newAddress:{label:'Sin dirección'}})).ok).toBe(false);
  expect(JSON.stringify(await logisticsService.getBoxById(packageId))).toBe(original);
  await withStore(async()=>{boxes.find(b=>b.id===packageId)!.status='entregada';},true);
  const delivered=await getPackageDelivery(packageId);expect(delivered?.canEdit).toBe(false);
  expect((await savePackageDelivery(packageId,{...base,revision:delivered!.revision})).ok).toBe(false);
 });
 it('keeps warehouse-only administrators read-only and denies client access to the editor',async()=>{
  cookieJar.set('ayl_session',{value:adminSession});
  expect((await saveAdministrativeStaff({firstName:'Lectura',paternalLastName:'Bodega',email:'delivery-readonly@example.invalid',phone:'',active:true,fullAccess:false,permissions:['bodega']})).ok).toBe(true);
  const staff=(await getAdministrativeStaff()).find(user=>user.email==='delivery-readonly@example.invalid')!;
  const invitation=await withStore(()=>issueToken(staff.id,'invite'),true);
  expect((await consumeToken(invitation,'reset',password))?.id).toBe(staff.id);
  cookieJar.set('ayl_session',{value:await createSessionToken(staff.id,'admin')});
  expect((await getPackageDelivery(otherPackageId))?.canEdit).toBe(false);
  await expect(savePackageDelivery(otherPackageId,{})).rejects.toThrow('REDIRECT:');
  cookieJar.set('ayl_session',{value:clientSession});await expect(getPackageDelivery(otherPackageId)).rejects.toThrow('REDIRECT:');
  await expect(savePackageDelivery(otherPackageId,{})).rejects.toThrow('REDIRECT:');
  cookieJar.set('ayl_session',{value:adminSession});
 });
});
