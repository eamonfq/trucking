// @vitest-environment node
import React from 'react';
import {it,expect,vi} from 'vitest';
import {renderToBuffer} from '@react-pdf/renderer';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {ThermalDocument} from './thermal-document';
import type {Invoice,Box} from '@/lib/types';
vi.stubGlobal('React',React);
it('renders narrow invoices and grouped receipts with long content',async()=>{
 const invoice:Invoice={id:'qa-inv',number:'AL-QA-0001',userId:'qa',shipmentId:'',status:'pendiente-pago-destino',issuedAt:'2026-09-17T12:00:00Z',dueAt:'2026-09-20',lines:[{categoryId:'large',categoryName:'Caja Large',quantity:2,unitPriceUsd:380.8,description:'Peso real 55 lb / dimensional 118.56 lb / cobro 119 lb x USD 3.20'}],insuranceUsd:0,homeDeliveryUsd:0,timeline:[]};
 const boxes=Array.from({length:3},(_,i)=>({id:`qa-${i}`,code:`BX-QA-0${i+1}`,receivedAt:invoice.issuedAt,originWarehouseName:'Chicago - Arlington Heights',weightLb:55,dimensions:{length:16,width:26,height:15},status:'en-bodega',recipientSnapshot:{name:'María González López',phone:'+52 3312345678'}} as unknown as Box));
 for(const receipt of [false,true]){
  const buffer=await renderToBuffer(ThermalDocument({reference:receipt?'BX-QA':invoice.number,invoices:[invoice],boxes:receipt?boxes:[],receipt,logoPath:path.join(process.cwd(),'public/brand/logoayl.png')}));
  expect(buffer.subarray(0,4).toString()).toBe('%PDF');
  if(process.env.THERMAL_QA==='1'){await mkdir('tmp/pdfs',{recursive:true});await writeFile(`tmp/pdfs/${receipt?'recibo':'factura'}-80mm.pdf`,buffer);}
 }
},20000);
