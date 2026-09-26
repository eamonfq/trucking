'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
const Context=createContext<{installed:boolean;available:boolean;busy:boolean;ios:boolean;message:string;install:()=>Promise<void>}>({installed:false,available:false,busy:false,ios:false,message:'',install:async()=>{}});
export function PwaProvider({children}:{children:ReactNode}){
 const [prompt,setPrompt]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(false),[ios,setIos]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  const media=window.matchMedia('(display-mode: standalone)');
  const sync=()=>{setInstalled(media.matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone));setIos(/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));};
  const capture=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};
  const done=()=>{setInstalled(true);setPrompt(null);setMessage('App instalada. Ya puedes abrir A&L desde tu dispositivo.');};
  sync();media.addEventListener('change',sync);window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',done);
  if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{/* Browsing and manual installation remain available. */});
  return()=>{media.removeEventListener('change',sync);window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',done);};
 },[]);
 async function install(){if(!prompt||busy)return;setBusy(true);setMessage('');try{await prompt.prompt();const choice=await prompt.userChoice;setMessage(choice.outcome==='accepted'?'Instalación aceptada. Sigue las indicaciones de tu dispositivo.':'Puedes instalarla más adelante desde el menú del navegador.');}catch{setMessage('Usa el menú del navegador para instalar la app.');}finally{setPrompt(null);setBusy(false);}}
 return <Context.Provider value={{installed,available:Boolean(prompt),busy,ios,message,install}}>{children}</Context.Provider>;
}
export const usePwa=()=>useContext(Context);
