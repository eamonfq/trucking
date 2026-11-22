// @vitest-environment node
import React from 'react';
import path from 'node:path';
import {expect,it,vi} from 'vitest';
import {InvoiceDocument} from './invoice-document';
import {ThermalDocument} from './thermal-document';
import {ManifestDocument} from './manifest-document';
import {pdfStoredTexts} from '@/lib/i18n/catalogs/pdf-invoice';
import {translateMessage} from '@/lib/i18n/translate';
import type {Box,Invoice,Truck} from '@/lib/types';
vi.stubGlobal('React',React);
// The element tree holds every printed text: enough to check the wording without rasterizing the PDF.
const printed=(element:unknown)=>JSON.stringify(element,(key,value)=>['src','key','style'].includes(key)?undefined:value);
const invoice:Invoice={id:'qa-inv',number:'AL-QA-0001',userId:'qa',shipmentId:'',status:'pendiente-pago-destino',issuedAt:'2026-09-17T12:00:00Z',dueAt:'2026-09-20',lines:[{categoryId:'large',categoryName:'Caja Large',quantity:1,unitPriceUsd:176,description:'BX-260001 · Ropa · Peso real 55 lb · cobro 55 lb × USD 3.20'}],insuranceUsd:0,homeDeliveryUsd:15,excessFeeUsd:10,timeline:[],payments:[{folio:'PAG-2026-000001',method:'efectivo',status:'confirmado',amountUsd:100,recordedAt:'2026-09-17T12:00:00Z',actorName:'Operador'} as NonNullable<Invoice['payments']>[number]]};
const box={id:'b1',userId:'qa',code:'BX-QA-01',receivedAt:invoice.issuedAt,status:'en-bodega',categoryId:'personalizada',weightLb:23.4,dimensions:{length:0,width:0,height:0},timeline:[],billing:{groupWeight:{totalWeightLb:117,pieces:5,totalAmountUsd:374.4}},originWarehouseName:'Chicago'} as unknown as Box;

it('writes the invoice in English for an English-speaking customer, including generated line descriptions',()=>{
 const english=printed(InvoiceDocument({invoice,locale:'en'}));
 for(const text of ['Invoice AL-QA-0001','USA → Mexico','"Invoice"','AL-QA-0001 · Status: Payment due at destination','Category','Quantity','Price','Amount','Excess surcharge','Insurance','Delivery','BX-260001 · Ropa · Actual weight 55 lb · billed 55 lb × USD 3.20','Operational billing document.'])expect(english).toContain(text);
 expect(english).not.toMatch(/Factura|Estado|Cantidad|Seguro|Entrega|Peso real|cobro/);
 const spanish=printed(InvoiceDocument({invoice}));
 for(const text of ['Factura AL-QA-0001','USA → México','AL-QA-0001 · Estado: Pendiente de pago en destino','Recargo por excedente','Peso real 55 lb · cobro 55 lb × USD 3.20','Documento operativo de cobro.'])expect(spanish).toContain(text);
});

it('writes the receiving receipt in English, with payment methods and weights',()=>{
 const english=printed(ThermalDocument({reference:'BX-QA',receipt:true,invoices:[invoice],boxes:[box],logoPath:path.join(process.cwd(),'public/brand/logoayl.png'),locale:'en'}));
 for(const text of ['Receipt BX-QA','RECEIVING RECEIPT','1 unit(s) received','Origin: Chicago','Not recorded','117 lb combined / 5 pieces · not weighed individually','At warehouse','Status: Payment due at destination','Invoice total','Number: PAG-2026-000001','"cash"','"confirmed"','No location','CONFIRMED PAYMENTS SUMMARY','Balance due: USD 201.00','PAYMENT DUE AT DESTINATION','Only confirmed payments are proof of money received.'])expect(english).toContain(text);
 expect(english).not.toMatch(/RECIBO|Estado|efectivo|Sin ubicación|PENDIENTE|No registradas/);
});

it('keeps billing descriptions that do not match a known pattern as they were written',()=>{
 expect(translateMessage(pdfStoredTexts,'en','Precio fijo')).toBe('Fixed price');
 expect(translateMessage(pdfStoredTexts,'en','BX-1 · Volumen · peso dimensional 118.56 lb · cobro 119 lb × USD 3.20 · peso real informativo 55 lb')).toBe('BX-1 · Volume · dimensional weight 118.56 lb · billed 119 lb × USD 3.20 · actual weight for reference 55 lb');
 expect(translateMessage(pdfStoredTexts,'en','Descuento acordado con el cliente')).toBe('Descuento acordado con el cliente');
 expect(translateMessage(pdfStoredTexts,'es','Precio fijo')).toBe('Precio fijo');
});

it('prints the load manifest with bilingual headings and unchanged data, whatever the viewer language',()=>{
 const truck={id:'t',code:'TR-QA',status:'cargando',plate:'QA-001',driverId:'d',driverName:'Operador Ejemplo',boxIds:['b1'],route:'Ruta',destinationCity:'Valle de Juárez',departureDate:'2026-10-03',timeline:[],capacity:{}} as Truck;
 const content=printed(ManifestDocument({truck,boxes:[box],users:[],shipments:[],recipients:[],generatedAt:'2026-10-03T12:00:00Z'}));
 for(const text of ['Manifiesto de carga / Load manifest TR-QA','MANIFIESTO DE CARGA / LOAD MANIFEST','Placa / Plate: ','QA-001','Chofer / Driver: ','Salida programada / Scheduled departure: ','Generado / Generated (UTC): ','Código, pieza / Code, piece','Cliente, descripción / Customer, description','Destinatario, parada / Recipient, stop','Peso, medidas, volumen / Weight, dimensions, volume','Pieza / Piece ','Sin guía individual / No individual shipment','117 lb conjuntas / 5 piezas · sin pesaje individual','117 lb combined / 5 pieces · not weighed individually','TOTAL GENERAL / GRAND TOTAL','1 piezas / pieces','Remitente / Shipper - Firma y fecha / Signature and date','Valle de Juárez'])expect(content).toContain(text);
});
