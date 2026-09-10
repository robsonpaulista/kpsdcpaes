# Firebase Existing Audit — DC Pães Factory OS

| | |
|---|---|
| **Versão** | 1.0 |
| **Data** | 2026-08-28 |
| **Escopo** | Workspace `kps dc paes` + busca local por projetos relacionados |
| **Status** | Auditoria inicial — Firebase do cliente **não localizado** neste ambiente |

> Documento obrigatório (Docs 04 / 11). Contém apenas o que foi **efetivamente encontrado**. Sem secrets.

---

## 1. Resumo executivo

| Item | Resultado |
|------|-----------|
| App / código-fonte no workspace | **Criado** (Next.js greenfield — Fase 1) |
| Config Firebase no app | **`.env.local` preenchido localmente** (2026-08-28) |
| Firebase Project ID | Configurado via `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (não documentar secret/key) |
| Collections Factory | A criar no primeiro sync: `factory_*` |
| Collections de outros sistemas | **Ainda não listadas** — inspecionar no Console após sync |
| Documentação Factory OS | Completa (Docs 00–11) |

---

## 2. Conteúdo do workspace auditado

**Path:** `/Users/robson/Documents/backup robson/kps dc paes`

```
kps dc paes/
├── README.md
├── KPS INDUSTRIA - DC PAES.pdf
└── docs/
    ├── 00-MASTER-README.md
    ├── 01-PRODUCT-VISION.md
    ├── 02-INFORMATION-ARCHITECTURE.md
    ├── 03-DESIGN-SYSTEM.md
    ├── 04-DATA-MODEL-FIREBASE.md
    ├── 05-PRODUCTION-ORDER-INTEGRATION.md
    ├── 05A-ERP-OP-INTEGRATION.md
    ├── 06-PRODUCTION-WORKFLOW.md
    ├── 07-KDS-OPERATOR-UX.md
    ├── 08-KDS-STATIONS.md
    ├── 09-MANAGEMENT-COCKPIT.md
    ├── 10-TRACEABILITY-QUALITY.md
    └── 11-TECHNICAL-IMPLEMENTATION.md
```

**Não encontrado no workspace:**

- [ ] `package.json` / lockfiles
- [ ] `node_modules`
- [ ] `src/` / `app/` / `pages/`
- [ ] `firebase.json` / `.firebaserc`
- [ ] `firestore.rules` / `firestore.indexes.json`
- [ ] `database.rules.json`
- [ ] Cloud Functions
- [ ] `.env` / `.env.local` / `.env.example`
- [ ] Git remote / histórico de app

---

## 3. Serviços Firebase

| Serviço | Status na auditoria |
|---------|---------------------|
| Project ID | **Não encontrado** |
| Authentication | **Não verificado** |
| Firestore | **Não verificado** |
| Realtime Database | **Não verificado** |
| Storage | **Não verificado** |
| Cloud Functions | **Não verificado** |
| Hosting | **Não verificado** |
| App Check | **Não verificado** |
| Analytics | **Não verificado** |
| Security Rules | **Não encontradas** |
| Indexes | **Não encontrados** |
| Custom Claims | **Não verificados** |

Checklist para quando o acesso for fornecido:

- [ ] Project ID confirmado
- [ ] Console: serviços habilitados
- [ ] Export/listagem de collections (somente leitura)
- [ ] Auth providers (email, phone, custom…)
- [ ] Claims / roles existentes
- [ ] Rules (Firestore / RTDB / Storage)
- [ ] Functions deployadas e consumidores
- [ ] Hosting sites
- [ ] Env vars do app existente (sem documentar valores secretos)

---

## 4. Busca em ambiente local (contexto)

Pastas relacionadas encontradas **fora** deste workspace:

| Path | Conteúdo |
|------|----------|
| `/Users/robson/Documents/dc paes/` | `logomarcadcpaes.png`, `qrcode.png`, faturas BI (não é código) |
| Outros projetos em `Documents/backup robson/` | Apps diversos (jupi com Firebase, etc.) — **não** identificados como DC Pães |

Nenhum projeto com nome/código claramente associado a “DC Pães Factory / Indústria” contendo Firebase foi localizado além desta pasta de docs.

> **Nota:** o projeto Jupi (`jupi-next`) possui Firebase, mas **não** deve ser assumido como o Firebase da DC Pães.

---

## 5. Stack esperada vs. encontrada

| Esperado (Doc 11) | Encontrado |
|-------------------|------------|
| Next.js | Não presente |
| TypeScript | Não presente |
| Firebase existente | Não presente / não acessível |
| PWA / responsive | Não presente |
| Padrões de componentes | N/A — greenfield de código |

**Implicação:** a Fase 1 (fundação) exigirá **bootstrap do app** neste workspace **ou** apontamento para o repositório real do cliente. Em ambos os casos, o Project ID Firebase deve ser fornecido antes de writes no banco.

---

## 6. Variáveis de ambiente

Nenhuma variável Firebase encontrada no workspace.

Quando existirem, documentar apenas **nomes** (não valores):

```
NEXT_PUBLIC_FIREBASE_API_KEY          (não versionar se sensível no contexto)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Secrets de ERP / Admin SDK: **somente server-side**, nunca `NEXT_PUBLIC_*`.

---

## 7. Isolamento proposto (provisório)

Até inspecionar collections reais, **proposta** (não criada):

```
factory_products
factory_product_mappings
factory_production_orders
factory_production_batches
factory_production_lots
factory_lot_step_runs
factory_production_events
factory_equipment
factory_stations
factory_ingredients
factory_ingredient_lots
factory_ingredient_usages
factory_losses
factory_loss_reasons
factory_occurrences
factory_integration_state
factory_integration_runs
factory_process_routes
factory_process_standards
factory_technical_sheets
```

**Regra:** antes de criar qualquer collection, cruzar com a listagem real do Project ID do cliente. Se houver conflito de nome, ajustar prefixo/namespace.

---

## 8. O que NÃO foi feito (propositalmente)

- Criar novo Firebase project
- Criar collections
- Escrever Security Rules
- Instalar dependências / scaffold Next.js
- Inventar endpoints ERP
- Assumir Firestore vs Realtime Database

---

## 9. Bloqueadores para a próxima fase

1. **Acesso ao Firebase Project ID** (e credenciais de leitura) do cliente DC Pães  
2. **Localização do repositório de código** existente do cliente (se houver) **ou** autorização para greenfield neste workspace  
3. Confirmação se o banco operacional é **Firestore** (preferência Doc 04, não confirmada)  
4. Hexadecimal do **laranja oficial** (Doc 03). Ativo de marca encontrado (`logomarcadcpaes.png` — “Dona Conceição”) usa **bordo/vinho + branco**, não laranja. **Não hardcodear** até validação com identidade oficial do Factory OS.

---

## 10. Atualização desta auditoria

Quando o Firebase for disponibilizado, atualizar este arquivo com:

- Project ID
- Serviços confirmados
- Lista de collections (nomes apenas)
- Auth / claims (sem secrets)
- Mapping: REUTILIZAR / ADAPTAR / CRIAR
- Decisão final de namespace `factory_*`
