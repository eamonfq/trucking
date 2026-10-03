// @vitest-environment node
import React from 'react';
import {it,expect,vi} from 'vitest';
import {renderToBuffer} from '@react-pdf/renderer';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {ThermalDocument} from './thermal-document';
import type {Invoice,Box} from '@/lib/types';
import {prepareReceptionConcepts} from '@/lib/utils/reception-concepts';
import {calculateBilling,DEFAULT_WEIGHT_PRICING} from '@/lib/utils/billing';
import {BOX_CATEGORIES} from '@/lib/config/box-categories';
import {ManifestDocument} from './manifest-document';
import type {Truck} from '@/lib/types';
vi.stubGlobal('React',React);
it('renders the mixed receipt and manifest without showing motorcycle weight as a box allocation',async()=>{
 const plan=prepareReceptionConcepts([{id:'moto',description:'Moto Honda VIN 201285',quantity:1,mode:'manual',priceUsd:3000,weightUnknown:true,weightLb:0},{id:'boxes',description:'Cajas extras',quantity:5,mode:'peso-personalizado',weightScope:'grupo',weightLb:117,rateUsd:3.2}],DEFAULT_WEIGHT_PRICING,BOX_CATEGORIES);
 const boxes=plan.rows.map((r,i)=>({id:'qa-'+i,userId:'qa',code:`BX-EJEMPLO-${String(i+1).padStart(2,'0')}`,receivedAt:'2026-10-03',categoryId:'personalizada',categoryName:'Carga personalizada',status:'en-bodega',weightLb:r.item.weightLb,weightUnknown:r.item.weightUnknown,dimensions:{length:0,width:0,height:0},contentsNote:r.item.contentsNote,receptionConcept:r.concept,receptionGroup:{id:'qa-reception',code:'BX-EJEMPLO',index:i+1,total:6},billing:{...calculateBilling(r.item.billingMode,{length:0,width:0,height:0},r.item.weightLb,DEFAULT_WEIGHT_PRICING,r.allocatedAmountUsd),amountUsd:r.allocatedAmountUsd,groupWeight:r.groupWeight},timeline:[]} as Box));
 const invoice:Invoice={id:'qa-i',number:'AL-EJEMPLO',userId:'qa',shipmentId:'',status:'pendiente-pago-destino',issuedAt:'2026-10-03',dueAt:'2026-10-05',lines:[{categoryId:'personalizada',categoryName:'Moto Honda',description:'Moto VIN 201285',quantity:1,unitPriceUsd:3000},{categoryId:'personalizada',categoryName:'Cajas extras',description:'5 piezas / 117 lb conjuntas',quantity:1,unitPriceUsd:374.4}],insuranceUsd:0,homeDeliveryUsd:0,timeline:[]};
 const truck:Truck={id:'qa',code:'TR-EJEMPLO',status:'cargando',plate:'QA-001',driverId:'qa-driver',driverName:'Operador Ejemplo',boxIds:boxes.map(b=>b.id),route:'Origen - Destino',destinationCity:'Valle de Juarez',departureDate:'2026-10-03',timeline:[],capacity:{}};
 const docs=[ThermalDocument({reference:'BX-EJEMPLO',receipt:true,invoices:[invoice],boxes,logoPath:path.join(process.cwd(),'public/brand/logoayl.png')}),ManifestDocument({truck,boxes,users:[],shipments:[],recipients:[],generatedAt:'2026-10-03T12:00:00Z'})];
 for(const [i,doc] of docs.entries()){const bytes=await renderToBuffer(doc);expect(bytes.subarray(0,4).toString()).toBe('%PDF');if(process.env.THERMAL_QA==='1'){await mkdir('tmp/pdfs',{recursive:true});await writeFile(`tmp/pdfs/${i===0?'recepcion-mixta':'manifiesto-mixto'}.pdf`,bytes);}}
},20000);
it('renders narrow invoices and grouped receipts with long content',async()=>{
 const invoice:Invoice={id:'qa-inv',number:'AL-QA-0001',userId:'qa',shipmentId:'',status:'pendiente-pago-destino',issuedAt:'2026-09-17T12:00:00Z',dueAt:'2026-09-20',lines:[{categoryId:'large',categoryName:'Caja Large',quantity:2,unitPriceUsd:380.8,description:'Peso real 55 lb / dimensional 118.56 lb / cobro 119 lb x USD 3.20'}],insuranceUsd:0,homeDeliveryUsd:0,timeline:[]};
 const boxes=Array.from({length:3},(_,i)=>({id:`qa-${i}`,code:`BX-QA-0${i+1}`,receivedAt:invoice.issuedAt,originWarehouseName:'Chicago - Arlington Heights',weightLb:55,dimensions:{length:16,width:26,height:15},status:'en-bodega',recipientSnapshot:{name:'María González López',phone:'+52 3312345678'}} as unknown as Box));
 for(const receipt of [false,true]){
  const buffer=await renderToBuffer(ThermalDocument({reference:receipt?'BX-QA':invoice.number,invoices:[invoice],boxes:receipt?boxes:[],receipt,logoPath:path.join(process.cwd(),'public/brand/logoayl.png')}));
  expect(buffer.subarray(0,4).toString()).toBe('%PDF');
  if(process.env.THERMAL_QA==='1'){await mkdir('tmp/pdfs',{recursive:true});await writeFile(`tmp/pdfs/${receipt?'recibo':'factura'}-80mm.pdf`,buffer);}
 }
},20000);
