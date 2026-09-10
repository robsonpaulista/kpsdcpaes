"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "dc_factory_floor_operator";

type OperatorContextValue = {
  operatorName: string;
  setOperatorName: (name: string) => void;
  /** Identificador V1 = nome normalizado; Auth/claims depois. */
  operatorId: string | undefined;
};

const OperatorContext = createContext<OperatorContextValue | null>(null);

function toOperatorId(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  return trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

export function OperatorProvider({ children }: { children: ReactNode }) {
  const [operatorName, setOperatorNameState] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setOperatorNameState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setOperatorName = useCallback((name: string) => {
    setOperatorNameState(name);
    try {
      window.localStorage.setItem(STORAGE_KEY, name);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      operatorName,
      setOperatorName,
      operatorId: toOperatorId(operatorName),
    }),
    [operatorName, setOperatorName],
  );

  return (
    <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>
  );
}

export function useOperator(): OperatorContextValue {
  const ctx = useContext(OperatorContext);
  if (!ctx) {
    throw new Error("useOperator deve ser usado dentro de OperatorProvider");
  }
  return ctx;
}
