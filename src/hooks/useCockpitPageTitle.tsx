"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

type CockpitPageTitleContextValue = {
  pageTitle: string | null;
  setPageTitle: (title: string | null) => void;
};

const CockpitPageTitleContext =
  createContext<CockpitPageTitleContextValue | null>(null);

export function CockpitPageTitleProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState<string | null>(null);

  return (
    <CockpitPageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </CockpitPageTitleContext.Provider>
  );
}

export function useCockpitPageTitleState(): CockpitPageTitleContextValue {
  const ctx = useContext(CockpitPageTitleContext);
  if (!ctx) {
    throw new Error(
      "useCockpitPageTitleState deve ser usado dentro de CockpitPageTitleProvider",
    );
  }
  return ctx;
}

/** Publica o título da página na topbar; limpa ao desmontar. */
export function useCockpitPageTitle(title: string): void {
  const { setPageTitle } = useCockpitPageTitleState();
  useLayoutEffect(() => {
    setPageTitle(title);
    return () => setPageTitle(null);
  }, [setPageTitle, title]);
}
