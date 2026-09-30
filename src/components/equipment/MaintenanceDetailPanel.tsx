"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Input, StatusBadge, Textarea } from "@/components/ui";
import { formatBrl } from "@/domain/cockpit/format-dashboard";
import { getFirestoreDb } from "@/lib/firebase/client";
import { formatDateBr, formatDateTimeBr } from "@/lib/format/date";
import {
  formatDurationMinutes,
  isMaintenanceOverdue,
  maintenancePriorityLabel,
  maintenanceStatusLabel,
  maintenanceTone,
  maintenanceTypeLabel,
} from "@/lib/labels/maintenance";
import {
  cancelMaintenance,
  completeMaintenance,
  startMaintenance,
} from "@/services/equipment-maintenance.service";
import type { Equipment, EquipmentMaintenance } from "@/types/equipment";

type Mode = "view" | "complete" | "cancel";

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]";

function parseNumber(value: string): number | undefined {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

export function MaintenanceDetailPanel({
  maintenance,
  equipment,
  canManage,
  actor,
  onEdit,
  onClose,
  onDone,
  onError,
}: {
  maintenance: EquipmentMaintenance;
  equipment?: Equipment;
  canManage: boolean;
  actor?: string;
  onEdit: () => void;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState<boolean>(false);
  const [servicePerformed, setServicePerformed] = useState<string>("");
  const [partsReplaced, setPartsReplaced] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");

  const overdue = isMaintenanceOverdue(maintenance);
  const tone = maintenanceTone(maintenance);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      setMode("view");
      onDone(message);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Falha na operação");
    } finally {
      setBusy(false);
    }
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: "Tipo", value: maintenanceTypeLabel(maintenance.type) },
    { label: "Prioridade", value: maintenancePriorityLabel(maintenance.priority) },
    {
      label: "Planejada",
      value: `${formatDateBr(maintenance.scheduledDate)}${
        maintenance.scheduledTime ? ` · ${maintenance.scheduledTime}` : ""
      }`,
    },
    {
      label: "Estimativa",
      value: formatDurationMinutes(maintenance.estimatedMinutes),
    },
    { label: "Responsável", value: maintenance.responsible ?? "—" },
    { label: "Prestador", value: maintenance.provider ?? "—" },
    {
      label: "Repetição",
      value: maintenance.recurrenceDays
        ? `A cada ${maintenance.recurrenceDays} dias`
        : "Não repete",
    },
  ];
  if (maintenance.startedAt) {
    rows.push({ label: "Início", value: formatDateTimeBr(maintenance.startedAt) });
  }
  if (maintenance.completedAt) {
    rows.push({ label: "Conclusão", value: formatDateTimeBr(maintenance.completedAt) });
    rows.push({
      label: "Duração real",
      value: formatDurationMinutes(maintenance.durationMinutes),
    });
  }
  if (maintenance.cost != null) {
    rows.push({ label: "Custo", value: formatBrl(maintenance.cost) });
  }

  return (
    <Card
      className="px-5 py-5"
      tone={tone === "critical" ? "critical" : tone === "warning" ? "warning" : "default"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {equipment ? (
              <Link
                href={`/app/equipment/${encodeURIComponent(equipment.id)}`}
                className="hover:text-[var(--accent-strong)]"
              >
                {equipment.code} · {equipment.name}
              </Link>
            ) : (
              maintenance.equipmentCode
            )}
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-[var(--ink)]">
            {maintenance.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={tone}>
            {overdue ? "ATRASADA" : maintenanceStatusLabel(maintenance.status).toUpperCase()}
          </StatusBadge>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs text-[var(--muted)]">{row.label}</dt>
            <dd className="mt-0.5 truncate font-medium text-[var(--ink)]">{row.value}</dd>
          </div>
        ))}
      </dl>

      {maintenance.description ? (
        <p className="mt-4 whitespace-pre-line text-sm text-[var(--ink-2)]">
          {maintenance.description}
        </p>
      ) : null}

      {maintenance.status === "COMPLETED" ? (
        <div className="mt-4 space-y-1 border-t border-[var(--border)] pt-4 text-sm">
          <p className="text-[var(--ink)]">
            <span className="font-semibold">Serviço realizado:</span>{" "}
            {maintenance.servicePerformed ?? "—"}
          </p>
          {maintenance.partsReplaced ? (
            <p className="text-[var(--ink-2)]">
              <span className="font-semibold">Peças:</span> {maintenance.partsReplaced}
            </p>
          ) : null}
          {maintenance.completedBy ? (
            <p className="text-xs text-[var(--muted)]">Por {maintenance.completedBy}</p>
          ) : null}
        </div>
      ) : null}

      {maintenance.status === "CANCELLED" && maintenance.cancelReason ? (
        <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[var(--ink-2)]">
          <span className="font-semibold">Cancelada:</span> {maintenance.cancelReason}
        </p>
      ) : null}

      {canManage && mode === "view" &&
      (maintenance.status === "SCHEDULED" || maintenance.status === "IN_PROGRESS") ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
          {maintenance.status === "SCHEDULED" ? (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => startMaintenance(getFirestoreDb(), maintenance.id, actor),
                    `Manutenção iniciada — ${maintenance.equipmentCode} em MANUTENÇÃO.`,
                  )
                }
              >
                Iniciar (parar equipamento)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => setMode("complete")}
              >
                Registrar como concluída
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={onEdit}>
                Editar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => setMode("cancel")}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => setMode("complete")}>
              Concluir e liberar equipamento
            </Button>
          )}
        </div>
      ) : null}

      {mode === "complete" ? (
        <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
          <label className={labelClass}>
            Serviço realizado *
            <Textarea
              className="mt-1.5"
              rows={3}
              value={servicePerformed}
              onChange={(e) => setServicePerformed(e.target.value)}
              placeholder="O que foi feito, testes realizados…"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              Peças trocadas
              <Input
                className="mt-1.5"
                value={partsReplaced}
                onChange={(e) => setPartsReplaced(e.target.value)}
              />
            </label>
            <label className={labelClass}>
              Custo (R$)
              <Input
                inputMode="decimal"
                className="mt-1.5"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0,00"
              />
            </label>
            {maintenance.status === "SCHEDULED" ? (
              <label className={labelClass}>
                Duração (min)
                <Input
                  type="number"
                  min={1}
                  className="mt-1.5"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </label>
            ) : null}
          </div>
          {maintenance.status === "SCHEDULED" ? (
            <p className="text-xs text-[var(--ink-2)]">
              Registrar sem iniciar não gera parada no histórico — use para
              inspeções feitas com o equipamento em operação.
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => setMode("view")}>
              Voltar
            </Button>
            <Button
              size="sm"
              disabled={busy || !servicePerformed.trim()}
              onClick={() =>
                void run(
                  () =>
                    completeMaintenance(getFirestoreDb(), maintenance.id, {
                      servicePerformed,
                      partsReplaced,
                      cost: parseNumber(cost),
                      durationMinutes: parseNumber(duration),
                      actor,
                    }),
                  maintenance.recurrenceDays
                    ? `Manutenção concluída. Próxima agendada em ${maintenance.recurrenceDays} dias.`
                    : "Manutenção concluída.",
                )
              }
            >
              {busy ? "Salvando…" : "Confirmar conclusão"}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "cancel" ? (
        <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
          <label className={labelClass}>
            Motivo do cancelamento *
            <Input
              className="mt-1.5"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => setMode("view")}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy || !cancelReason.trim()}
              onClick={() =>
                void run(
                  () => cancelMaintenance(getFirestoreDb(), maintenance.id, cancelReason),
                  "Manutenção cancelada.",
                )
              }
            >
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
