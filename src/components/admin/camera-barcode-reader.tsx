"use client";
import {useEffect,useRef} from "react";
import {receptionCamera} from "@/lib/i18n/catalogs/reception-camera";
import {useT} from "@/lib/i18n/provider";

/** Open only after the operator presses Usar cámara; never on page load. */
export function CameraBarcodeReader({onRead,onError}:{onRead:(code:string)=>void;onError:(message:string)=>void}){
 const t=useT(receptionCamera);
 const video=useRef<HTMLVideoElement>(null),callbacks=useRef({onRead,onError,t});
 useEffect(()=>{callbacks.current={onRead,onError,t};},[onRead,onError,t]);
 useEffect(()=>{
  let cancelled=false,accepted=false,stream:MediaStream|undefined,controls:{stop:()=>void}|undefined;
  const stop=()=>{controls?.stop();stream?.getTracks().forEach(track=>track.stop());};
  async function start(){try{
   if(!navigator.mediaDevices?.getUserMedia){callbacks.current.onError(callbacks.current.t("La cámara no está disponible. Usa HTTPS y permite el acceso, o utiliza el lector USB/Bluetooth."));return;}
   const {BrowserMultiFormatOneDReader}=await import("@zxing/browser");
   if(cancelled)return;
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}});
   if(cancelled){stop();return;}
   controls=await new BrowserMultiFormatOneDReader().decodeFromStream(stream,video.current!, (result,_error,readerControls)=>{
    if(!result||cancelled||accepted)return;accepted=true;readerControls.stop();stop();callbacks.current.onRead(result.getText());
   });
   if(cancelled||accepted)stop();
  }catch(error){stop();if(cancelled)return;const name=error&&typeof error==="object"&&"name" in error?String(error.name):"";const message=callbacks.current.t;callbacks.current.onError(name==="NotAllowedError"?message("Permiso de cámara denegado. Habilítalo en el navegador o utiliza el lector USB/Bluetooth."):name==="NotFoundError"?message("No se encontró una cámara. Conecta una o utiliza el lector USB/Bluetooth."):message("No se pudo iniciar la cámara. Comprueba que otra aplicación no la esté utilizando."));}}
  void start();return()=>{cancelled=true;stop();};
 },[]);
 return <div className="relative mb-4 overflow-hidden rounded-xl bg-navy-950"><video ref={video} autoPlay muted playsInline aria-label={t("Vista de cámara para escanear etiquetas")} className="aspect-video max-h-64 w-full object-cover"/><div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] top-[30%] h-[35%] rounded-lg border-2 border-white/80"/><p className="absolute inset-x-0 bottom-0 bg-navy-950/80 p-2 text-center text-xs text-white">{t("Centra el código de barras de la etiqueta. Al leerlo se registrará y se apagará la cámara.")}</p></div>;
}
