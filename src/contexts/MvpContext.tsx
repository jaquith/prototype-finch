import React, { createContext, useContext, useState } from "react";

export type AppMode = "mvp" | "full" | "marketplace";

interface MvpContextValue {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  isMvp: boolean;
  /** Marketplace browsing, catalog installs, source badges and derived marketplace data. */
  showMarketplace: boolean;
}

const MvpContext = createContext<MvpContextValue>({
  mode: "mvp",
  setMode: () => {},
  isMvp: true,
  showMarketplace: false,
});

export function MvpProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>("mvp");
  return (
    <MvpContext.Provider value={{ mode, setMode, isMvp: mode === "mvp", showMarketplace: mode === "marketplace" }}>
      {children}
    </MvpContext.Provider>
  );
}

export function useMvpMode() {
  return useContext(MvpContext);
}
