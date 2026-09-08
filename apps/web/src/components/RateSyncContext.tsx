"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface RateSyncUiState {
  running: boolean;
  cardTypeId: string | null;
  scope: "full" | "card" | null;
}

const defaultState: RateSyncUiState = {
  running: false,
  cardTypeId: null,
  scope: null,
};

const RateSyncContext = createContext<{
  sync: RateSyncUiState;
  setSync: (sync: RateSyncUiState) => void;
}>({
  sync: defaultState,
  setSync: () => {},
});

export function RateSyncProvider({ children }: { children: ReactNode }) {
  const [sync, setSync] = useState<RateSyncUiState>(defaultState);
  return <RateSyncContext.Provider value={{ sync, setSync }}>{children}</RateSyncContext.Provider>;
}

export function useRateSyncState() {
  return useContext(RateSyncContext);
}
