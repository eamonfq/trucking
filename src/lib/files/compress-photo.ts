/** Runs only in the browser: the original tablet photo never leaves the device. */
export async function compressPhoto(file: File): Promise<File> {
  if (!file.size || file.size > 30 * 1024 * 1024) throw new Error('Selecciona una foto de hasta 30 MB.');
  if (!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type)) throw new Error('Selecciona una fotografía JPG, PNG o WebP.');
  const url=URL.createObjectURL(file);
  try {
    const img=new Image();
    img.src=url;
    try { await img.decode(); } catch { throw new Error('No pudimos abrir esta foto. En iPad, usa Cámara en formato Más compatible (JPEG) o exporta la foto como JPG.'); }
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth*img.naturalHeight>60_000_000) throw new Error('La resolución de esta foto es demasiado grande. Usa una foto de hasta 60 megapíxeles.');
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('No se pudo preparar la imagen en este dispositivo.');
    let edge=1920;
    for(let attempt=0;attempt<4;attempt++){
      const scale=Math.min(1,edge/Math.max(img.naturalWidth,img.naturalHeight));
      canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo comprimir la foto.')),'image/jpeg',attempt===0?0.82:0.72));
      if(blob.size<=512*1024) return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:Date.now()});
      edge=Math.round(edge*0.8);
    }
    throw new Error('No se pudo reducir la foto. Prueba otra imagen.');
  } finally { URL.revokeObjectURL(url); }
}
