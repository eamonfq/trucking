"use client";
import { useId, useMemo, useState } from "react";
import type { User } from "@/lib/types";
import { ArrowLeftRight, UserRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function CustomerSearch({ users, value, onChange, error }: { users: User[]; value?: string; onChange: (id: string) => void; error?: string }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const selected = users.find(user => user.id === value);
  const matches = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return users.filter(user => user.role === "cliente" && user.active && terms.every(term => normalize(`${user.firstName} ${user.paternalLastName} ${user.maternalLastName ?? ""} ${user.email} ${user.phone} ${user.lockerCode}`).includes(term)));
  }, [users, query]);
  const results = matches.slice(0, 12);
  function select(user: User) { onChange(user.id); setQuery(""); setOpen(false); setActive(0); setEditing(false); }
  return <div className="relative min-w-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    {(!selected || editing) && <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><Input autoFocus={editing} label="Buscar cliente o casillero" value={query} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
      placeholder="Nombre, correo, teléfono o AL-MX…" error={error} onFocus={() => setOpen(true)}
      onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }}
      onKeyDown={event => {
        if (event.key === "Escape") { setOpen(false); setEditing(false); event.preventDefault(); }
        if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, results.length - 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
        if (event.key === "Enter" && open) { event.preventDefault(); if (results[active]) select(results[active]); }
      }} /></div>{selected&&<button type="button" aria-label="Cancelar cambio de cliente" className="mt-6 grid size-10 place-items-center rounded-lg text-navy-500 hover:bg-stone-100" onClick={()=>{setEditing(false);setOpen(false);}}><X className="size-4"/></button>}</div>}
    {selected && !editing && <div className="flex items-center gap-3 rounded-xl bg-stone-50/80 px-4 py-3" role="status"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-navy-700 ring-1 ring-stone-200"><UserRound className="size-4"/></span><div className="min-w-0 flex-1"><span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-500">{selected.lockerCode}</span><p className="truncate text-sm font-semibold text-navy-950">{selected.firstName} {selected.paternalLastName}</p><p className="truncate text-xs text-navy-500">{selected.email}</p></div><button type="button" aria-label="Cambiar cliente" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-navy-600 transition hover:bg-white hover:text-navy-950 focus-visible:outline-2 focus-visible:outline-brand-600" onClick={() => { setEditing(true); setOpen(true); }}><ArrowLeftRight className="size-3.5"/><span>Cambiar</span></button></div>}
    {open && <div className="absolute z-30 mt-1 w-full rounded-xl border border-line-300 bg-white shadow-pop">
      <p className="px-4 py-2 text-xs text-ink-500">{matches.length} coincidencias{matches.length > 12 ? " · mostrando 12; precisa tu búsqueda" : ""}</p>
      <ul id={listId} role="listbox" aria-label="Clientes encontrados" className="max-h-64 overflow-auto p-1">
        {results.map((user, index) => <li role="option" aria-selected={value === user.id} id={`${listId}-${index}`} key={user.id}><button type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => select(user)} className={`w-full rounded-lg p-3 text-left text-sm hover:bg-cream-100 ${index === active ? "bg-cream-100" : ""}`}><strong>{user.firstName} {user.paternalLastName}</strong><span className="block break-all text-ink-500">{user.lockerCode} · {user.email}</span></button></li>)}
      </ul>
      {!results.length && <p className="px-4 pb-4 text-sm">No encontramos clientes activos. Puedes crear uno con «Nuevo cliente».</p>}
    </div>}
  </div>;
}
