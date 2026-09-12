"use client";
import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
export function NavigationPending(){const {pending}=useLinkStatus();return <span className="ml-auto inline-flex size-4 shrink-0 items-center justify-center">{pending&&<><LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none"/><span role="status" className="sr-only">Cargando sección…</span><span aria-hidden="true" className="fixed inset-x-0 top-0 z-[100] h-1 animate-pulse bg-orange-500 motion-reduce:animate-none"/></>}</span>;}
