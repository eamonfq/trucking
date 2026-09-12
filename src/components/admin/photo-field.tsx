"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Camera, ImageUp, Trash2 } from "lucide-react";

const MAX_MB = 2;

const readableSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * La vista previa es local; la recepción envía el File para persistirlo en MySQL.
 */
export function PhotoField({ value, onChange }: { value: File | null; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [size, setSize] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const accept = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg","image/png"].includes(file.type)) return setError("El archivo debe ser JPG o PNG.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`La imagen supera ${MAX_MB} MB.`);
    setError("");
    setPreview((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(file); });
    setSize(file.size);
    onChange(file);
  };

  const clear = () => {
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
      <input ref={inputRef} type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" id="reception-photo" onChange={(event) => accept(event.target.files?.[0])} />

      {value ? (
        <div className="flex items-center gap-4 rounded-md border-[1.5px] border-line-300 bg-white p-3">
          {preview
            // eslint-disable-next-line @next/next/no-img-element -- blob local, no pasa por el optimizador
            ? <img src={preview} alt={`Vista previa de ${value.name}`} className="size-20 shrink-0 rounded-sm object-cover" />
            : <span className="grid size-20 shrink-0 place-items-center rounded-sm bg-cream-100 text-label-600"><Camera className="size-6" /></span>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-900">{value.name}</p>
            {size > 0 && <p className="mt-0.5 text-xs text-ink-500">{readableSize(size)}</p>}
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
            <span className="text-xs text-ink-500">JPG o PNG, hasta {MAX_MB} MB. Desde el celular abre la cámara.</span>
          </label>
        </div>
      )}

      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </div>
  );
}
