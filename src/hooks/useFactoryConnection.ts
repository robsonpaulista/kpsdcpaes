"use client";

import { useEffect, useState } from "react";

export type FactoryConnectionStatus = "online" | "offline";

/**
 * Conexão do dispositivo (Doc 07 §83–87).
 * V1: navigator.onLine — sem fila offline inventada; ações autoritativas
 * (iniciar/finalizar etapa) devem bloquear quando offline.
 */
export function useFactoryConnection(): {
  status: FactoryConnectionStatus;
  online: boolean;
} {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function sync() {
      setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return {
    online,
    status: online ? "online" : "offline",
  };
}
