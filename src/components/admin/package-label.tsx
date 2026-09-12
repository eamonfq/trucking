"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import JsBarcode from "jsbarcode";
import logo from "../../../public/brand/logoayl.png";
import type { Dimensions } from "@/lib/config/box-categories";
export function PackageLabel({code,dimensions,weightLb,lockerCode}:{code:string;dimensions:Dimensions;weightLb:number;lockerCode:string}){
 const barcode=useRef<SVGSVGElement>(null);
 useEffect(()=>{if(barcode.current)JsBarcode(barcode.current,code,{format:"CODE128",width:2,height:85,margin:20,displayValue:false});},[code]);
 return <main className="label-screen"><div className="label-controls"><button onClick={()=>window.print()}>Imprimir etiqueta</button><p>Papel 100 × 150 mm · Escala 100 % · Sin encabezados ni pies del navegador.</p></div><article className="package-label"><Image src={logo} alt="A&L Trucking Logistics" priority unoptimized className="label-logo"/><p className="label-caption">RECEPCIÓN DE PAQUETE</p><h1>{code}</h1><svg ref={barcode} role="img" aria-label={`Código de barras ${code}`}/><dl><div><dt>Casillero</dt><dd>{lockerCode}</dd></div><div><dt>Peso</dt><dd>{weightLb} lb</dd></div><div><dt>Medidas · largo × ancho × alto</dt><dd>{dimensions.length} × {dimensions.width} × {dimensions.height} in</dd></div></dl><footer>Conservar esta etiqueta durante todo el recorrido.</footer></article><style>{`
 .label-screen{min-height:100vh;padding:24px;background:#eee;color:#111}.label-controls{max-width:100mm;margin:0 auto 20px;font-size:13px}.label-controls button{padding:12px 20px;border-radius:12px;background:#10203b;color:#fff;font-weight:bold;margin-bottom:10px}.package-label{box-sizing:border-box;width:100mm;min-height:150mm;padding:7mm;background:white;margin:auto;text-align:center;overflow-wrap:anywhere}.label-logo{width:48mm;height:auto;margin:0 auto 6mm}.label-caption{font-size:11px;letter-spacing:2px}.package-label h1{font-size:24px;font-weight:800;margin-top:4mm}.package-label svg{width:86mm;height:auto;margin:2mm auto}.package-label dl{border-top:2px solid #111;text-align:left;display:grid;gap:4mm;padding-top:5mm}.package-label dt{font-size:11px;text-transform:uppercase}.package-label dd{font-size:20px;font-weight:700}.package-label footer{font-size:10px;border-top:1px solid #bbb;margin-top:6mm;padding-top:4mm}@page{size:100mm 150mm;margin:0}@media print{.label-screen{padding:0;min-height:0;background:white}.label-controls{display:none}.package-label{margin:0;break-inside:avoid}}
 `}</style></main>;
}
