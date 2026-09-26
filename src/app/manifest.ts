import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest {
 return {id:'/',name:'A&L Trucking Logistics',short_name:'A&L',description:'Tus paquetes, envíos y destinatarios en un solo lugar.',lang:'es-MX',start_url:'/cliente',scope:'/',display:'standalone',background_color:'#faf8f4',theme_color:'#101b30',icons:[{src:'/pwa/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/pwa/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/pwa/icon-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
}
