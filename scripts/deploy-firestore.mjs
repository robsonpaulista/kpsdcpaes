#!/usr/bin/env node
/**
 * Deploy Firestore rules/indexes com trava de segurança (Doc 11 §4).
 *
 * Este arquivo local SUBSTITUI as rules do projeto inteiro.
 * Em Firebase compartilhado: baixe as rules atuais no Console,
 * MESCLE apenas o bloco FACTORY OS, e só então confirme.
 *
 * Uso:
 *   CONFIRM_FIRESTORE_DEPLOY=1 npm run deploy:firestore
 */
import { spawnSync } from "node:child_process";

const confirmed = process.env.CONFIRM_FIRESTORE_DEPLOY === "1";

console.log("");
console.log("=== DC Pães · deploy Firestore ===");
console.log("Projeto (.firebaserc): padoca-62df8");
console.log("");
console.log("ATENÇÃO (Doc 11):");
console.log(
  "  • firebase deploy --only firestore SUBSTITUI rules + indexes do projeto.",
);
console.log(
  "  • Se houver outro app no mesmo Firebase, NÃO rode às cegas.",
);
console.log(
  "  • Mescle o bloco // === INÍCIO/FIM BLOCO FACTORY OS === nas rules atuais.",
);
console.log("");

if (!confirmed) {
  console.error("Abortado. Para confirmar explicitamente:");
  console.error("  CONFIRM_FIRESTORE_DEPLOY=1 npm run deploy:firestore");
  console.error("");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["-y", "firebase-tools", "deploy", "--only", "firestore"],
  { stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
