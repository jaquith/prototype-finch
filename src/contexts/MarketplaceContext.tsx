import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// The current signed-in user for the prototype. Used to attribute
// who most recently modified an unlocked marketplace extension.
export const CURRENT_USER = "Jordan Vega";

export interface AddedExtension {
  id: string; // catalog id, e.g. "mkt-email-hash"
  addedAt: string; // ISO timestamp
  addedBy: string;
  enabled: boolean;
  unlocked: boolean;
  modified: boolean;
  modifiedAt?: string;
  modifiedBy?: string;
  overrides?: { name?: string; description?: string; code?: string };
}

interface MarketplaceContextValue {
  added: AddedExtension[];
  isAdded: (id: string) => boolean;
  getAdded: (id: string) => AddedExtension | undefined;
  addExtension: (id: string) => void;
  removeExtension: (id: string) => void;
  setEnabled: (id: string, enabled: boolean) => void;
  unlockExtension: (id: string) => void;
  markModified: (id: string, overrides?: AddedExtension["overrides"]) => void;
}

const STORAGE_KEY = "finch.marketplace.added.v1";

function loadInitial(): AddedExtension[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const MarketplaceContext = createContext<MarketplaceContextValue>({
  added: [],
  isAdded: () => false,
  getAdded: () => undefined,
  addExtension: () => {},
  removeExtension: () => {},
  setEnabled: () => {},
  unlockExtension: () => {},
  markModified: () => {},
});

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const [added, setAdded] = useState<AddedExtension[]>(loadInitial);

  // Persist to localStorage on every change so added / unlocked / modified
  // state survives reloads, just like user-authored extensions.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(added));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [added]);

  const isAdded = useCallback((id: string) => added.some((a) => a.id === id), [added]);
  const getAdded = useCallback((id: string) => added.find((a) => a.id === id), [added]);

  const addExtension = useCallback((id: string) => {
    setAdded((prev) => {
      if (prev.some((a) => a.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          addedAt: new Date().toISOString(),
          addedBy: CURRENT_USER,
          enabled: true,
          unlocked: false,
          modified: false,
        },
      ];
    });
  }, []);

  const removeExtension = useCallback((id: string) => {
    setAdded((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const setEnabled = useCallback((id: string, enabled: boolean) => {
    setAdded((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
  }, []);

  const unlockExtension = useCallback((id: string) => {
    setAdded((prev) => prev.map((a) => (a.id === id ? { ...a, unlocked: true } : a)));
  }, []);

  const markModified = useCallback((id: string, overrides?: AddedExtension["overrides"]) => {
    setAdded((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              unlocked: true,
              modified: true,
              modifiedAt: new Date().toISOString(),
              modifiedBy: CURRENT_USER,
              overrides: { ...a.overrides, ...overrides },
            }
          : a
      )
    );
  }, []);

  return (
    <MarketplaceContext.Provider
      value={{ added, isAdded, getAdded, addExtension, removeExtension, setEnabled, unlockExtension, markModified }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  return useContext(MarketplaceContext);
}
