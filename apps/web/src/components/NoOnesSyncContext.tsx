"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface NoOnesSyncUiState {
  running: boolean;
  cardTypeId: string | null;
  scope: "full" | "card" | null;
}

const defaultState: NoOnesSyncUiState = {
  running: false,
  cardTypeId: null,
  scope: null,
};

const NoOnesSyncContext = createContext<{
  sync: NoOnesSyncUiState;
  setSync: (sync: NoOnesSyncUiState) => void;
}>({
  sync: defaultState,
  setSync: () => {},
});

export function NoOnesSyncProvider({ children }: { children: ReactNode }) {
  const [sync, setSync] = useState<NoOnesSyncUiState>(defaultState);
  return (
    <NoOnesSyncContext.Provider value={{ sync, setSync }}>{children}</NoOnesSyncContext.Provider>
  );
}

export function useNoOnesSyncState() {
  return useContext(NoOnesSyncContext);
}
