"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Camera, ImageUp, Trash2 } from "lucide-react";
import {compressPhoto} from '@/lib/files/compress-photo';

const MAX_MB = 30;

const readableSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * Only the compressed photo is passed to reception and uploaded on save.
 */
export function PhotoField({ value, onChange, onBusyChange }: { value: File | null; onChange: (file: File | null) => void; onBusyChange?:(busy:boolean)=>void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [size, setSize] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [busy,setBusy]=useState(false);
  const [originalSize,setOriginalSize]=useState(0);
  const revision=useRef(0);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(()=>()=>{revision.current++;},[]);

  const accept = async (file?: File) => {
    if (!file) return;
    const current=++revision.current;
    setError("");setBusy(true);onBusyChange?.(true);onChange(null);setPreview("");
    try{
      const compressed=await compressPhoto(file);
      if(current!==revision.current)return;
      setPreview(URL.createObjectURL(compressed));setSize(compressed.size);setOriginalSize(file.size);onChange(compressed);
    }catch(error){if(current===revision.current)setError(error instanceof Error?error.message:'No se pudo comprimir la foto.');}
    finally{if(current===revision.current){setBusy(false);onBusyChange?.(false);}if(inputRef.current)inputRef.current.value='';}
  };

  const clear = () => {
    revision.current++;setBusy(false);onBusyChange?.(false);
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setSize(0);
    setError("");
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium text-ink-700">Foto de recepción</span>
      <input ref={inputRef} disabled={busy} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" className="sr-only" id="reception-photo" onChange={(event) => accept(event.target.files?.[0])} />
      <input ref={galleryRef} disabled={busy} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="Elegir foto de la galería" className="sr-only" onChange={(event)=>{accept(event.target.files?.[0]);event.target.value='';}}/>
      {busy&&<p role="status" className="rounded-lg bg-stone-100 p-3 text-sm">Comprimiendo foto en este dispositivo…</p>}

      {value ? (
        <div className="flex items-center gap-4 rounded-md border-[1.5px] border-line-300 bg-white p-3">
          {preview
            // eslint-disable-next-line @next/next/no-img-element -- blob local, no pasa por el optimizador
            ? <img src={preview} alt={`Vista previa de ${value.name}`} className="size-20 shrink-0 rounded-sm object-cover" />
            : <span className="grid size-20 shrink-0 place-items-center rounded-sm bg-cream-100 text-label-600"><Camera className="size-6" /></span>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-900">{value.name}</p>
            {size > 0 && <p className="mt-0.5 text-xs text-ink-500">{readableSize(originalSize)} → {readableSize(size)} · Lista para subir al guardar</p>}
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-1.5 text-xs font-semibold text-brand-700 hover:text-brand-600">Cambiar foto</button>
          </div>
          <button type="button" onClick={clear} aria-label={`Quitar ${value.name}`} className="grid size-10 shrink-0 place-items-center rounded-full text-danger transition hover:bg-danger-50"><Trash2 className="size-4" /></button>
        </div>
      ) : (
        <div
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={`rounded-md border-[1.5px] border-dashed transition ${dragging ? "border-brand-600 bg-brand-50" : "border-line-300 bg-cream-50"}`}
        >
          <label htmlFor="reception-photo" className="flex cursor-pointer flex-col items-center gap-2 px-4 py-7 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-white text-brand-700 shadow-card"><ImageUp className="size-5" /></span>
            <span className="text-sm font-semibold text-navy-900">Arrastra la foto o toca para tomarla</span>
            <span className="text-xs text-ink-500">Fotos de hasta {MAX_MB} MB. Se comprimen automáticamente antes de subirlas. Toca para abrir la cámara.</span>
          </label>
        </div>
      )}

      <button type="button" disabled={busy} onClick={()=>galleryRef.current?.click()} className="justify-self-start rounded-md border border-line-300 px-3 py-2 text-xs font-semibold text-navy-700 disabled:opacity-50">{value?'Cambiar desde galería':'Elegir de la galería'}</button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </div>
  );
}
