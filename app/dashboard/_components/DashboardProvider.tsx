"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useFrameSender } from "@/hooks/useFrameSender";

type DashboardFrameSender = ReturnType<typeof useFrameSender>;

const DashboardFrameSenderContext = createContext<DashboardFrameSender | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const frameSender = useFrameSender();

  return (
    <DashboardFrameSenderContext.Provider value={frameSender}>
      {children}
    </DashboardFrameSenderContext.Provider>
  );
}

export function useDashboardFrameSender() {
  const context = useContext(DashboardFrameSenderContext);

  if (!context) {
    throw new Error("useDashboardFrameSender must be used within DashboardProvider");
  }

  return context;
}