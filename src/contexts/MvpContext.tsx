import React, { createContext, useContext, useState, useEffect } from "react";

export type AppMode = "mvp" | "full" | "expanded";

interface MvpContextValue {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  isMvp: boolean;
  isExpanded: boolean;
  // Kept for backwards compatibility with existing callers.
  setIsMvp: (v: boolean) => void;
}

const STORAGE_KEY = "finch.appMode.v1";

function loadInitial(): AppMode {
  if (typeof window === "undefined") return "mvp";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "mvp" || raw === "full" || raw === "expanded" ? raw : "mvp";
}

const MvpContext = createContext<MvpContextValue>({
  mode: "mvp",
  setMode: () => {},
  isMvp: true,
  isExpanded: false,
  setIsMvp: () => {},
});

export function MvpProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>(loadInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const setIsMvp = (v: boolean) => setMode(v ? "mvp" : "full");

  return (
    <MvpContext.Provider
      value={{ mode, setMode, isMvp: mode === "mvp", isExpanded: mode === "expanded", setIsMvp }}
    >
      {children}
    </MvpContext.Provider>
  );
}

export function useMvpMode() {
  return useContext(MvpContext);
}
