"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="grid min-h-screen place-items-center bg-cream-100 p-5"><div className="max-w-xl text-center"><span className="mx-auto grid size-16 place-items-center rounded-3xl bg-danger-50 text-danger-700"><AlertTriangle className="size-7" /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-orange-600">Error 500</p><h1 className="mt-3 font-display text-4xl font-bold text-navy-950">Algo interrumpió la ruta.</h1><p className="mt-4 leading-7 text-navy-500">Tus datos del demo siguen seguros. Intenta cargar esta sección nuevamente.</p><Button onClick={reset} className="mt-7"><RotateCcw className="size-4" />Intentar de nuevo</Button></div></main>; }
