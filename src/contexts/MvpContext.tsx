import React, { createContext, useContext, useState } from "react";

interface MvpContextValue {
  isMvp: boolean;
  setIsMvp: (v: boolean) => void;
}

const MvpContext = createContext<MvpContextValue>({ isMvp: false, setIsMvp: () => {} });

export function MvpProvider({ children }: { children: React.ReactNode }) {
  const [isMvp, setIsMvp] = useState(true);
  return <MvpContext.Provider value={{ isMvp, setIsMvp }}>{children}</MvpContext.Provider>;
}

export function useMvpMode() {
  return useContext(MvpContext);
}
