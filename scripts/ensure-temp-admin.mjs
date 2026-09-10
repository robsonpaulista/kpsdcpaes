/**
 * Cria (ou valida) o usuário admin temporário via Identity Toolkit.
 * Uso: node --env-file=.env.local scripts/ensure-temp-admin.mjs
 *
 * Requer Authentication → Sign-in method → E-mail/senha ativado.
 */
function stripQuotes(value) {
  if (!value) return value;
  const t = String(value).trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

const API_KEY = stripQuotes(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
const EMAIL = "admin@dcpaes.dev";
const PASSWORD = "DcPaes#Admin2026";

if (!API_KEY) {
  console.error("Falta NEXT_PUBLIC_FIREBASE_API_KEY (.env.local).");
  process.exit(1);
}

async function main() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      returnSecureToken: true,
    }),
  });
  const body = await res.json();

  if (res.ok) {
    console.log("Admin temporário criado.");
    console.log(`  e-mail: ${EMAIL}`);
    console.log(`  uid:    ${body.localId}`);
    return;
  }

  const message = String(body.error?.message ?? JSON.stringify(body));
  if (message.includes("EMAIL_EXISTS")) {
    console.log("Admin temporário já existe.");
    console.log(`  e-mail: ${EMAIL}`);
    console.log(`  senha:  ${PASSWORD}`);
    return;
  }

  if (message.includes("OPERATION_NOT_ALLOWED")) {
    console.error(
      "E-mail/senha está desativado. Ative em Firebase Console → Authentication → Sign-in method.",
    );
    process.exit(1);
  }

  console.error("Falha ao criar admin:", message);
  process.exit(1);
}

main();
