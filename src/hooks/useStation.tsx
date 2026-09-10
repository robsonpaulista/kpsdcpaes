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
import {
  FACTORY_STATIONS,
  getStation,
  type StationDefinition,
} from "@/domain/production/stations";

const STORAGE_STATION = "dc_factory_floor_station";
/** Dispositivo associado à estação — Doc 07 §88–89 (sem Auth/PIN inventado). */
const STORAGE_LOCKED = "dc_factory_floor_station_locked";

type StationContextValue = {
  station: StationDefinition;
  /** true = tablet já associado; select livre só na tela de setup. */
  locked: boolean;
  /** false até a primeira associação neste dispositivo. */
  ready: boolean;
  stations: StationDefinition[];
  /** Associa e trava a estação neste dispositivo. */
  associateStation: (id: string) => void;
  /**
   * Libera troca de estação (configuração protegida).
   * Caller deve confirmar com o usuário antes.
   */
  unlockForReconfigure: () => void;
};

const StationContext = createContext<StationContextValue | null>(null);

export function StationProvider({ children }: { children: ReactNode }) {
  const [stationId, setStationIdState] = useState(FACTORY_STATIONS[0].id);
  const [locked, setLocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_STATION);
      const isLocked =
        window.localStorage.getItem(STORAGE_LOCKED) === "1";
      if (saved && getStation(saved)) {
        setStationIdState(saved);
        setLocked(isLocked);
      } else {
        setLocked(false);
      }
    } catch {
      setLocked(false);
    }
    setHydrated(true);
  }, []);

  const associateStation = useCallback((id: string) => {
    if (!getStation(id)) return;
    setStationIdState(id);
    setLocked(true);
    try {
      window.localStorage.setItem(STORAGE_STATION, id);
      window.localStorage.setItem(STORAGE_LOCKED, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const unlockForReconfigure = useCallback(() => {
    setLocked(false);
    try {
      window.localStorage.setItem(STORAGE_LOCKED, "0");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => {
    const station = getStation(stationId) ?? FACTORY_STATIONS[0];
    return {
      station,
      locked,
      ready: hydrated,
      stations: FACTORY_STATIONS,
      associateStation,
      unlockForReconfigure,
    };
  }, [stationId, locked, hydrated, associateStation, unlockForReconfigure]);

  return (
    <StationContext.Provider value={value}>{children}</StationContext.Provider>
  );
}

export function useStation(): StationContextValue {
  const ctx = useContext(StationContext);
  if (!ctx) {
    throw new Error("useStation deve ser usado dentro de StationProvider");
  }
  return ctx;
}
