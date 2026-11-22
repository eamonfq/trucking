import {it,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {renderEmail,type EmailInput} from './email-template';
const fixture=(count:number):EmailInput=>({to:'qa@example.invalid',subject:'Recepción BX-QA',heading:'Tu paquete ya está en bodega',body:'Legacy body',actionLabel:'Ver mis paquetes',actionUrl:'http://localhost:3100/cliente/cajas',reception:{reference:'BX-QA',totalUsd:1142.4,pieces:Array.from({length:count},(_,i)=>({code:`BX-QA-${String(i+1).padStart(2,'0')}`,weightLb:50,dimensions:'16 × 26 × 15',rejected:false})),invoices:[{number:'AL-QA-001',status:'pagada'}]}});
it('embeds exactly one CID photo when present and no broken photo when absent',()=>{
 const input=fixture(50);input.receptionPhoto={fileId:'private-id',ownerId:'private-owner'};
 const html=renderEmail(input,'http://localhost:3100').html;
 const node=document.createElement('div');node.innerHTML=html;
 expect(node.querySelectorAll('img[src="cid:reception-photo"]')).toHaveLength(1);
 expect(html).not.toContain('private-id');expect(html).not.toContain('private-owner');expect(html).not.toContain('r2.dev');
 expect(renderEmail(fixture(1),'http://localhost:3100').html).not.toContain('cid:');
});
it('separates summary, payment and per-piece rows without an oversized email',()=>{
 const message=renderEmail(fixture(50),'http://localhost:3100');
 const node=document.createElement('div');node.innerHTML=message.html;
 expect(node.querySelectorAll('[aria-label="Unidades recibidas"] tbody tr')).toHaveLength(8);expect(message.html).toContain('42 unidades más');expect(message.html).toContain('Pago confirmado');expect(message.html).not.toContain('Legacy body');expect(message.text).toContain('50/50 · BX-QA-50\n50 lb');expect(message.html.length).toBeLessThan(18000);
 if(process.env.EMAIL_LAYOUT_QA==='1')writeFileSync('public/qa-reception-email.html',renderEmail(fixture(12),'http://localhost:3100').html);
});
it('escapes user values and never marks pending money as paid',()=>{
 const input=fixture(1);input.reception!.pieces[0].code='<script>alert(1)</script>';input.reception!.invoices[0].status='pendiente-pago-destino';
 const output=renderEmail(input,'http://localhost:3100');expect(output.html).not.toContain('<script>');expect(output.html).toContain('&lt;script&gt;');expect(output.html).toContain('Pendiente de pago en destino');expect(output.html).not.toContain('Pago confirmado');
});
it('preserves ordinary email rendering without reception data',()=>{const input=fixture(1);delete input.reception;expect(renderEmail(input,'http://localhost:3100').html).toContain('Legacy body');});
it('writes the whole email in English for an English-speaking customer and keeps old payloads in Spanish',()=>{
 const input={...fixture(10),subject:'Receipt BX-QA · 10 unit(s)',heading:'Your package is at the warehouse',actionLabel:'View my packages',locale:'en' as const};
 input.receptionPhoto={fileId:'private-id',ownerId:'private-owner'};input.reception!.totalWeightLb=500;input.reception!.pieces[0].dimensions='Not recorded';input.reception!.pieces[1].rejected=true;
 const {html,text}=renderEmail(input,'http://localhost:3100');
 expect(html).toContain('<html lang="en">');
 for(const english of ['YOUR ACCOUNT','We recorded your receipt. Here is a summary of your units.','RECEIPT','10 units','Combined weight: 500 lb · pieces with prorated weight','Total invoiced','Payment confirmed','Unit details','aria-label="Units received"','UNIT</th>','WEIGHT / DIMENSIONS','Piece 2/10 · Rejected','50 lb (prorated)','And 2 more units. See the full details in your dashboard.','1 invoice available in your dashboard','Receiving photo','alt="First photo taken at receiving"','View my packages &rarr;',"If the button doesn't work",'For your security, never share your password or this link.','Your shipment, in good hands.'])expect(html).toContain(english);
 expect(text).toContain('Receipt BX-QA\n10 units\nCombined weight: 500 lb.');expect(text).toContain('1/10 · BX-QA-01\n50 lb | Not recorded\n');expect(text).toContain('Invoices:\nAL-QA-001: Paid');expect(text).toContain('View my packages: http://localhost:3100/cliente/cajas');expect(text).toContain('This is an automated email.');
 expect(`${html}\n${text}`).not.toMatch(/[áéíóúñ¿¡]|Recepción|unidades|Pago confirmado|Continuar|TU CUENTA|Not recorded in/);
 const legacy=fixture(1);delete legacy.actionLabel;
 const spanish=renderEmail(legacy,'http://localhost:3100');
 expect(spanish.html).toContain('<html lang="es">');expect(spanish.html).toContain('TU CUENTA · A&amp;L');expect(spanish.html).toContain('Continuar &rarr;');expect(spanish.text).toContain('Facturas:\nAL-QA-001: pagada');expect(spanish.text).toContain('Tu envío, en buenas manos.');
});
