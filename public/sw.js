/* No private pages, API responses or payment requests are cached or replayed. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Lock-screen messages are intentionally generic; sensitive details require login.
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()??{};}catch{}
 event.waitUntil(self.registration.showNotification('A&L · Nueva actualización',{body:'Tienes novedades en tu cuenta. Abre tu panel para ver los detalles.',icon:'/pwa/icon-192.png',tag:typeof data.id==='string'?data.id:'ayl-update',data:{url:'/cliente/notificaciones'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(self.clients.openWindow('/cliente/notificaciones'));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).catch(()=>new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · A&L</title><style>body{margin:0;background:#faf8f4;color:#101b30;font:16px system-ui;display:grid;place-items:center;min-height:100dvh}main{max-width:420px;padding:32px}small{color:#c44c0a;letter-spacing:.15em}h1{font-size:36px;letter-spacing:-.04em}p{line-height:1.7;color:#526078}a{display:inline-block;background:#101b30;color:white;padding:14px 24px;border-radius:12px;text-decoration:none}</style><main><small>A&L TRUCKING LOGISTICS</small><h1>Volvemos en cuanto tengas conexión.</h1><p>Necesitas internet para consultar tus envíos y realizar operaciones. No se guardaron operaciones para enviarlas después. Si estabas pagando, verifica el estado antes de intentarlo otra vez.</p><a href="/cliente">Volver al panel</a></main></html>`,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
