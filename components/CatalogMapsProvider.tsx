"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CatalogMaps } from "@/lib/catalog-maps";

const CatalogMapsContext = createContext<CatalogMaps | null>(null);

export function CatalogMapsProvider({
  maps,
  children,
}: {
  maps: CatalogMaps;
  children: ReactNode;
}) {
  return (
    <CatalogMapsContext.Provider value={maps}>{children}</CatalogMapsContext.Provider>
  );
}

export function useCatalogMaps(): CatalogMaps {
  const ctx = useContext(CatalogMapsContext);
  if (!ctx) {
    throw new Error("useCatalogMaps: нет CatalogMapsProvider в дереве");
  }
  return ctx;
}
