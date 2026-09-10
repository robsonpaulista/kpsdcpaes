"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

type FloorQrScannerProps = {
  /** false quando há lote aberto — libera a câmera. */
  active: boolean;
  onScan: (rawValue: string) => void;
};

type ScannerMode = "loading" | "ready" | "unsupported" | "denied" | "error";

function hasBarcodeDetector(): boolean {
  return typeof window !== "undefined" && typeof window.BarcodeDetector === "function";
}

/**
 * Scanner QR no Floor (Doc 07 §9–15).
 * Usa BarcodeDetector nativo quando disponível; senão força digitação.
 */
export function FloorQrScanner({ active, onScan }: FloorQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const onScanRef = useRef(onScan);
  const [mode, setMode] = useState<ScannerMode>("loading");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) {
      stopCamera(streamRef, videoRef);
      return;
    }

    let cancelled = false;
    let detectInterval = 0;

    async function start() {
      if (!hasBarcodeDetector()) {
        setMode("unsupported");
        return;
      }

      try {
        setMode("loading");
        const formats = await BarcodeDetector.getSupportedFormats();
        const preferred = ["qr_code", "ean_13", "code_128"].filter((f) =>
          formats.includes(f),
        );
        const detector = new BarcodeDetector({
          formats: preferred.length > 0 ? preferred : undefined,
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setMode("ready");

        detectInterval = window.setInterval(() => {
          void (async () => {
            if (cancelled || !videoRef.current) return;
            const videoEl = videoRef.current;
            if (videoEl.readyState < 2) return;
            try {
              const codes = await detector.detect(videoEl);
              const raw = codes[0]?.rawValue?.trim();
              if (!raw) return;
              const now = Date.now();
              const last = lastScanRef.current;
              if (raw === last.value && now - last.at <= 2500) return;
              lastScanRef.current = { value: raw, at: now };
              try {
                if (typeof navigator.vibrate === "function") {
                  navigator.vibrate(30);
                }
              } catch {
                /* ignore */
              }
              onScanRef.current(raw);
            } catch {
              /* frame skip */
            }
          })();
        }, 280);
      } catch (err) {
        if (cancelled) return;
        const name =
          err && typeof err === "object" && "name" in err
            ? String((err as { name: string }).name)
            : "";
        setMode(
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? "denied"
            : "error",
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      window.clearInterval(detectInterval);
      stopCamera(streamRef, videoRef);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="w-full">
      <p className="text-center text-xs font-medium tracking-wide text-dc-text-muted">
        ESCANEIE O QR DO LOTE
      </p>
      <div className="relative mt-3 aspect-[4/3] max-h-[min(42vh,320px)] overflow-hidden rounded-2xl border border-dc-border bg-dc-text landscape:max-h-[min(36vh,240px)]">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {mode !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-dc-text/80 px-4 text-center">
            <p className="text-sm font-medium text-white">
              {mode === "loading"
                ? "Abrindo câmera…"
                : mode === "unsupported"
                  ? "Câmera QR não disponível neste aparelho. Use a digitação."
                  : mode === "denied"
                    ? "Permissão de câmera negada. Use a digitação ou libere o acesso."
                    : "Não foi possível abrir a câmera. Use a digitação."}
            </p>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-center text-[11px] text-dc-text-muted">
        Posicione o código dentro da área.
      </p>
    </div>
  );
}

function stopCamera(
  streamRef: MutableRefObject<MediaStream | null>,
  videoRef: MutableRefObject<HTMLVideoElement | null>,
) {
  streamRef.current?.getTracks().forEach((t) => t.stop());
  streamRef.current = null;
  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }
}
