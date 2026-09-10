import type { TimingStatus } from "@/types/production";

/** Relógio mm:ss ou h:mm:ss para etapas longas. */
export function formatDurationClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatStandardMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
  return `${minutes} min`;
}

export function formatMinutesLabel(minutes: number | undefined): string {
  if (minutes == null) return "—";
  return formatStandardMinutes(minutes);
}

export function remainingMs(expectedFinishAt: string, now = Date.now()): number {
  return new Date(expectedFinishAt).getTime() - now;
}

export function timingToneClass(status: TimingStatus): string {
  switch (status) {
    case "ATTENTION":
      return "text-warning";
    case "LATE":
      return "text-danger";
    case "ON_TIME":
      return "text-success";
    default:
      return "text-dc-text-secondary";
  }
}
