#!/usr/bin/env node
/**
 * Imprime o pacote a mesclar no Console Firebase (projeto compartilhado).
 * Não faz deploy — só extrai helpers + bloco FACTORY OS de firestore.rules.
 *
 * Uso: npm run rules:factory-block
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(resolve(root, "firestore.rules"), "utf8");

const start = raw.indexOf("// === INÍCIO BLOCO FACTORY OS ===");
const end = raw.indexOf("// === FIM BLOCO FACTORY OS ===");
if (start < 0 || end < 0) {
  console.error("Marcadores FACTORY OS não encontrados em firestore.rules");
  process.exit(1);
}

const helpersMatch = raw.match(
  /function isCorporateUser\(\)[\s\S]*?function isFactoryCollection\(name\) \{[\s\S]*?\n    \}/,
);
if (!helpersMatch) {
  console.error("Helpers Factory OS não encontrados.");
  process.exit(1);
}

const block = raw.slice(start, end + "// === FIM BLOCO FACTORY OS ===".length);

console.log(`
================================================================================
MERGE MANUAL — projeto compartilhado (Doc 11)
================================================================================
1. Firebase Console → Firestore → Rules do projeto padoca-62df8
2. NÃO apague rules de outros apps.
3. Cole os HELPERS (se ainda não existirem) perto do topo do service.
4. Cole o BLOCO FACTORY OS antes do catch-all final de outros apps.
5. Publish no Console — OU, se o projeto for só Factory OS:
     firebase login
     CONFIRM_FIRESTORE_DEPLOY=1 npm run deploy:firestore
================================================================================

----- HELPERS (colar uma vez) -----
`);
console.log(helpersMatch[0]);
console.log(`
----- BLOCO FACTORY OS -----
`);
console.log(block);
console.log(`
================================================================================
Fim do pacote de merge
================================================================================
`);
