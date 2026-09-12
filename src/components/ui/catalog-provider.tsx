"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { BoxCategory } from "@/lib/config/box-categories";
const CatalogContext=createContext<BoxCategory[]>([]);
const DestinationContext=createContext<string[]>([]);
export function CatalogProvider({categories,destinations,children}:{categories:BoxCategory[];destinations:string[];children:ReactNode}) {return <CatalogContext.Provider value={categories}><DestinationContext.Provider value={destinations}>{children}</DestinationContext.Provider></CatalogContext.Provider>;}
export function useDestinations(){return useContext(DestinationContext);}
export function useCatalog(){return useContext(CatalogContext);}
