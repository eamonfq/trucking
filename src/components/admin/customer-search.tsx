"use client";
import { useId, useMemo, useState } from "react";
import type { User } from "@/lib/types";
import { Input } from "@/components/ui/input";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function CustomerSearch({ users, value, onChange, error }: { users: User[]; value?: string; onChange: (id: string) => void; error?: string }) {
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
  function select(user: User) { onChange(user.id); setQuery(""); setOpen(false); setActive(0); }
  return <div className="relative min-w-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <Input label="Buscar cliente o casillero" value={query} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
      placeholder="Nombre, correo, teléfono o AL-MX…" error={error} onFocus={() => setOpen(true)}
      onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }}
      onKeyDown={event => {
        if (event.key === "Escape") { setOpen(false); event.preventDefault(); }
        if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, results.length - 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
        if (event.key === "Enter" && open) { event.preventDefault(); if (results[active]) select(results[active]); }
      }} />
    {selected && <div className="mt-2 rounded-lg border border-success/30 bg-success-50 p-3 text-sm" role="status"><strong>{selected.lockerCode} · {selected.firstName} {selected.paternalLastName}</strong><p className="break-all text-ink-700">{selected.email}</p><button type="button" className="mt-1 min-h-9 text-brand-700 underline" onClick={() => { onChange(""); setOpen(true); }}>Cambiar cliente</button></div>}
    {open && <div className="absolute z-30 mt-1 w-full rounded-xl border border-line-300 bg-white shadow-pop">
      <p className="px-4 py-2 text-xs text-ink-500">{matches.length} coincidencias{matches.length > 12 ? " · mostrando 12; precisa tu búsqueda" : ""}</p>
      <ul id={listId} role="listbox" aria-label="Clientes encontrados" className="max-h-64 overflow-auto p-1">
        {results.map((user, index) => <li role="option" aria-selected={value === user.id} id={`${listId}-${index}`} key={user.id}><button type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => select(user)} className={`w-full rounded-lg p-3 text-left text-sm hover:bg-cream-100 ${index === active ? "bg-cream-100" : ""}`}><strong>{user.firstName} {user.paternalLastName}</strong><span className="block break-all text-ink-500">{user.lockerCode} · {user.email}</span></button></li>)}
      </ul>
      {!results.length && <p className="px-4 pb-4 text-sm">No encontramos clientes activos. Puedes crear uno con «Nuevo cliente».</p>}
    </div>}
  </div>;
}
