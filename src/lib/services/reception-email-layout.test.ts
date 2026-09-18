import {it,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {renderEmail,type EmailInput} from './email-template';
const fixture=(count:number):EmailInput=>({to:'qa@example.invalid',subject:'Recepción BX-QA',heading:'Tu paquete ya está en bodega',body:'Legacy body',actionLabel:'Ver mis paquetes',actionUrl:'http://localhost:3100/cliente/cajas',reception:{reference:'BX-QA',totalUsd:1142.4,pieces:Array.from({length:count},(_,i)=>({code:`BX-QA-${String(i+1).padStart(2,'0')}`,weightLb:50,dimensions:'16 × 26 × 15',rejected:false})),invoices:[{number:'AL-QA-001',status:'pagada'}]}});
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
