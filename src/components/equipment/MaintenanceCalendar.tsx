"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import {
  localDayKey,
  maintenanceTone,
  type MaintenanceDisplayTone,
} from "@/lib/labels/maintenance";
import type { EquipmentMaintenance } from "@/types/equipment";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MAX_CHIPS = 3;

const chipTone: Record<MaintenanceDisplayTone, string> = {
  critical: "border-[var(--critical)] bg-[var(--critical-bg)] text-[var(--critical)]",
  warning: "border-[var(--warning)] bg-[var(--warning-bg)] text-[var(--warning)]",
  good: "border-transparent bg-[var(--good-bg)] text-[var(--good)]",
  neutral: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)]",
};

export type CalendarMonth = { year: number; month: number };

export function currentCalendarMonth(): CalendarMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function shiftCalendarMonth(value: CalendarMonth, delta: number): CalendarMonth {
  const d = new Date(value.year, value.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Dias exibidos na grade (semanas completas, começando na segunda). */
function monthGrid(value: CalendarMonth): string[] {
  const first = new Date(value.year, value.month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(value.year, value.month, 1 - offset);
  const last = new Date(value.year, value.month + 1, 0);
  const trailing = 6 - ((last.getDay() + 6) % 7);
  const total = offset + last.getDate() + trailing;
  return Array.from({ length: total }, (_, i) =>
    localDayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)),
  );
}

/** Dia exibido no calendário: atrasadas aparecem na data planejada original. */
function calendarDay(m: EquipmentMaintenance): string {
  if (m.status === "COMPLETED" && m.completedAt) {
    return localDayKey(new Date(m.completedAt));
  }
  return m.scheduledDate;
}

export function MaintenanceCalendar({
  month,
  maintenance,
  selectedId,
  onMonthChange,
  onSelect,
  onDayClick,
}: {
  month: CalendarMonth;
  maintenance: EquipmentMaintenance[];
  selectedId: string | null;
  onMonthChange: (next: CalendarMonth) => void;
  onSelect: (maintenance: EquipmentMaintenance) => void;
  onDayClick?: (dayKey: string) => void;
}) {
  const todayKey = localDayKey();
  const days = useMemo(() => monthGrid(month), [month]);
  const monthPrefix = `${month.year}-${String(month.month + 1).padStart(2, "0")}`;

  const byDay = useMemo(() => {
    const map = new Map<string, EquipmentMaintenance[]>();
    for (const m of maintenance) {
      if (m.status === "CANCELLED") continue;
      const key = calendarDay(m);
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return map;
  }, [maintenance]);

  const title = new Date(month.year, month.month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="rounded-[14px] border border-dc-border bg-dc-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold capitalize tracking-tight text-[var(--ink)]">
          {title}
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onMonthChange(shiftCalendarMonth(month, -1))}>
            ←
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onMonthChange(currentCalendarMonth())}>
            Hoje
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onMonthChange(shiftCalendarMonth(month, 1))}>
            →
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7 gap-px overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--border)]">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="bg-[var(--surface-2)] px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
            >
              {w}
            </div>
          ))}
          {days.map((key) => {
            const items = byDay.get(key) ?? [];
            const inMonth = key.startsWith(monthPrefix);
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={cn(
                  "group flex min-h-[104px] flex-col gap-1 bg-[var(--surface)] p-1.5",
                  !inMonth && "bg-[color-mix(in_srgb,var(--surface-2)_60%,var(--surface))]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full font-mono text-xs tabular-nums",
                      isToday
                        ? "bg-[var(--ink)] font-semibold text-[var(--bg)]"
                        : inMonth
                          ? "text-[var(--ink)]"
                          : "text-[var(--muted)]",
                    )}
                  >
                    {Number(key.slice(8, 10))}
                  </span>
                  {onDayClick ? (
                    <button
                      type="button"
                      onClick={() => onDayClick(key)}
                      className="rounded px-1 text-sm leading-none text-[var(--muted)] opacity-0 transition-opacity hover:text-[var(--accent-strong)] group-hover:opacity-100 focus:opacity-100"
                      aria-label={`Agendar em ${key}`}
                      title="Agendar neste dia"
                    >
                      +
                    </button>
                  ) : null}
                </div>
                {items.slice(0, MAX_CHIPS).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelect(m)}
                    className={cn(
                      "w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition-shadow",
                      chipTone[maintenanceTone(m, todayKey)],
                      selectedId === m.id && "ring-2 ring-[var(--accent)]",
                    )}
                    title={`${m.equipmentCode} · ${m.title}`}
                  >
                    {m.scheduledTime ? `${m.scheduledTime} ` : ""}
                    <span className="font-mono">{m.equipmentCode}</span> · {m.title}
                  </button>
                ))}
                {items.length > MAX_CHIPS ? (
                  <button
                    type="button"
                    onClick={() => onSelect(items[MAX_CHIPS]!)}
                    className="text-left text-[11px] text-[var(--muted)] hover:text-[var(--accent-strong)]"
                  >
                    +{items.length - MAX_CHIPS} mais
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--ink-2)]">
        <Legend tone="neutral" label="Agendada" />
        <Legend tone="warning" label="Em execução" />
        <Legend tone="critical" label="Atrasada" />
        <Legend tone="good" label="Concluída" />
      </div>
    </section>
  );
}

function Legend({ tone, label }: { tone: MaintenanceDisplayTone; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block size-3 rounded border", chipTone[tone])} />
      {label}
    </span>
  );
}
