/**
 * Acesso admin temporário enquanto o Auth corporativo definitivo não fecha.
 * Remover / trocar antes de produção.
 */
export const TEMP_ADMIN = {
  email: "admin@dcpaes.dev",
  password: "DcPaes#Admin2026",
  label: "Admin temporário (WIP)",
} as const;

export function isTempAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === TEMP_ADMIN.email;
}
