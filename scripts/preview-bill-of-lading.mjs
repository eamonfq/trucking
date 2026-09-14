// Generates a synthetic PDF only. Does not access MySQL or send emails.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as renderer from '@react-pdf/renderer';
const require=createRequire(import.meta.url),cache=new Map();
function load(filename){
 filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename);
 const compiled={exports:{}};
 const js=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(js,{module:compiled,exports:compiled.exports,require:name=>name==='@react-pdf/renderer'?renderer:name.startsWith('@/')?load(path.resolve('src',name.slice(2)+'.ts')):require(name)});
 cache.set(filename,compiled.exports);return compiled.exports;
}
const {ManifestDocument}=load('src/lib/pdf/manifest-document.tsx');
const warehouses=[{id:'origin',name:'Chicago - origen de muestra',city:'Arlington Heights',address:'Dirección de ejemplo en Illinois',country:'Estados Unidos',active:true},{id:'destination',name:'México - destino de muestra',city:'Valle de Juárez',address:'Dirección de ejemplo en Jalisco',active:true}];
const boxes=Array.from({length:24},(_,i)=>({id:'box-'+i,code:'BX-QA-'+String(i+1).padStart(4,'0'),userId:'qa',categoryId:'small',categoryName:i%3?'Caja de efectos personales':'Carga personalizada',weightLb:20+i,dimensions:{length:20,width:15,height:12},destinationWarehouseId:'destination',receptionGroup:{id:'group',index:i+1,total:24},recipientSnapshot:{name:'Destinatario de muestra',phone:'+525500000000'},timeline:[]}));
const truck={id:'qa',code:'TR-QA-001',plate:'QA-001',driverName:'Chofer de muestra',departureDate:'2099-01-01',status:'cargando',originWarehouseId:'origin',stops:[{warehouseId:'destination',city:'Valle de Juárez',arrivalDate:'2099-01-03'}],boxIds:boxes.map(b=>b.id),notes:'MUESTRA SIN VALIDEZ OPERATIVA. Verificar embalaje y sujetar cada pieza antes de salida.',maxWeightLb:1000};
const buffer=await renderer.renderToBuffer(ManifestDocument({truck,boxes,warehouses,users:[{id:'qa',firstName:'Cliente',paternalLastName:'de muestra',lockerCode:'AL-QA-0000'}],recipients:[],shipments:[],logoSrc:'data:image/png;base64,'+readFileSync('public/brand/logoayl.png').toString('base64'),generatedAt:'2099-01-01T12:00:00.000Z'}));
mkdirSync('output/pdf',{recursive:true});writeFileSync('output/pdf/bill-of-lading-muestra.pdf',buffer);
console.log('PDF de muestra: 24 piezas, 756 lb, 50 ft³. output/pdf/bill-of-lading-muestra.pdf');
