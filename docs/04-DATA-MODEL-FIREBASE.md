# DOCUMENTO 04 — DATA MODEL & FIREBASE ARCHITECTURE

**DC Pães · Factory OS**

| | |
|---|---|
| **Versão** | 1.0 |
| **Status** | Arquitetura de Dados |
| **Backend** | Firebase existente do cliente |
| **Banco preferencial** | Firestore, caso seja o serviço já adotado no projeto existente |
| **Princípio** | Reutilizar infraestrutura sem comprometer dados existentes |

---

## 1. Objetivo

A arquitetura deve representar o processo industrial real:

```
PRODUTO
   ↓
FICHA TÉCNICA
   ↓
ORDEM DE PRODUÇÃO
   ↓
BATIDAS / LOTES
   ↓
ETAPAS
   ↓
EVENTOS
   ↓
PRODUÇÃO FINAL
```

Relacionando: INGREDIENTES · EQUIPAMENTOS · ESTAÇÕES · OPERADORES · PERDAS · OCORRÊNCIAS · QUALIDADE

> A rastreabilidade é **consequência** dessa arquitetura, não uma funcionalidade isolada.

O material exige que um lote permita recuperar OP, produto, ingredientes e seus lotes, equipamentos, operador, horários, produção planejada/final e perda.

---

## 2. REGRA ZERO — FIREBASE EXISTENTE

O projeto utiliza um Firebase já existente da DC Pães.

Antes de qualquer criação:

```
STOP
 ↓
INSPECIONAR FIREBASE ATUAL
 ↓
MAPEAR ESTRUTURA
 ↓
IDENTIFICAR INTEGRAÇÕES
 ↓
PROPOR NOVO DOMÍNIO
 ↓
SÓ ENTÃO IMPLEMENTAR
```

O Cursor **NÃO DEVE:**

- criar outro projeto Firebase;
- substituir configuração existente;
- apagar coleções;
- renomear coleções existentes;
- migrar documentos;
- alterar Security Rules globalmente;
- alterar Cloud Functions existentes;
- modificar Authentication sem análise;
- assumir que Firestore é o banco utilizado;
- assumir que usuários atuais podem ser alterados.

---

## 3. Auditoria obrigatória

Antes de implementar a camada de dados, gerar:

`/docs/firebase-existing-audit.md`

O documento deve identificar:

- Firebase Project ID
- Serviços encontrados: Authentication · Firestore · Realtime Database · Storage · Cloud Functions · Hosting · App Check · Analytics
- Coleções existentes
- Estrutura relevante
- Authentication atual
- Custom Claims existentes
- Security Rules
- Indexes
- Cloud Functions
- Variáveis de ambiente
- Integrações externas

**Não expor secrets no documento.**

---

## 4. Firebase config

Configuração deve vir exclusivamente de ambiente/configuração existente.

Exemplo conceitual:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
...
```

Não criar credenciais novas sem necessidade.

Nunca versionar: service account privada · private keys · secrets administrativos.

---

## 5. Namespace lógico

Se não houver conflito com o Firebase existente, o novo domínio industrial deverá ficar claramente identificável.

Possibilidades:

```
factory_products
factory_production_orders
factory_lots
factory_events
factory_equipment
```

Ou raiz:

```
factory/
```

A decisão só poderá ser tomada depois da auditoria.

---

## 6. Arquitetura recomendada

```
Firebase existente DC Pães
│
├── domínio existente
├── domínio existente
│
└── FACTORY OS
    ├── products
    ├── ingredients
    ├── productionOrders
    ├── lots
    ├── productionEvents
    ├── equipment
    ├── stations
    ├── occurrences
    ├── losses
    └── configuration
```

Objetivo: isolamento lógico sem criar infraestrutura paralela desnecessária.

---

## 7. Entidades principais

```
PRODUCT
   ├── TECHNICAL SHEET
   └── PROCESS STANDARDS
              ↓
      PRODUCTION ORDER
              ↓
           BATCH
              ↓
            LOT
              ↓
      PRODUCTION STEP
              ↓
      PRODUCTION EVENT
```

Relacionadas: USER · STATION · EQUIPMENT · INGREDIENT · INGREDIENT LOT · LOSS · OCCURRENCE

---

## 8. PRODUCT

Produto representa o item produzido.

```
Product {
  id
  code
  name

  externalProductId?
  externalProductCode?

  active

  unit
  nominalWeight

  createdAt
  updatedAt
}
```

Exemplo: `code: PAO-HAMB-90` · `name: Pão Hambúrguer 90 g` · `externalProductCode: 001234` (mapeamento do gestor — Doc 05).

---

## 9. Não guardar regra de processo no componente

**Errado:**

```ts
if (product.name === "Pão Hambúrguer") {
  proofingTime = 300;
}
```

**Correto:**

```
PRODUCT → PROCESS STANDARD → Fermentação = 300 min
```

O material deixa claro que tempos variam conforme o produto.

---

## 10. TECHNICAL SHEET

A ficha técnica pertence ao produto.

```
TechnicalSheet {
  id
  productId
  version
  active
  ingredients[]
  createdAt
  updatedAt
}
```

---

## 11. Ingrediente da ficha

```
TechnicalSheetItem {
  ingredientId
  quantity
  unit
}
```

Exemplo do material: Farinha 50 kg · Água 25 L · Açúcar 4 kg · Fermento 1 kg · Gordura 2 kg

---

## 12. Versionamento da ficha técnica

A OP **não** deve depender eternamente da versão atual da ficha.

A OP deve guardar: `technicalSheetId` · `technicalSheetVersion` e/ou snapshot dos parâmetros essenciais.

---

## 13. Por que snapshot?

```
26 AGO — OP 260826-001 produzida com ficha v3
10 SET — Ficha alterada para v4
```

A rastreabilidade de agosto **não pode** mudar retroativamente.

---

## 14. INGREDIENT

```
Ingredient {
  id
  code
  name
  defaultUnit
  active
  createdAt
  updatedAt
}
```

---

## 15. INGREDIENT LOT

O material recomenda registrar o lote de origem de cada ingrediente.

```
IngredientLot {
  id
  ingredientId
  lotCode
  supplierId?
  receivedAt?
  expiresAt?
  createdAt
}
```

Campos de fornecedor/recebimento/validade são extensões possíveis — **não** obrigatórios sem validação.

---

## 16. PRODUCTION ORDER

Entidade central do PCP — **importada** do sistema gestor (Doc 05).

> Factory OS **não** é source of truth da OP. Sistema gestor = origem da OP · Factory OS = execução industrial.

```
ProductionOrder {
  id                      # Firebase interno

  externalId              # ID estável no gestor
  externalOrderNumber     # ex.: 260826-001
  sourceSystem            # ex.: ERP_DC_PAES

  integrationStatus       # SYNCED | PENDING_VALIDATION | ERROR | OUTDATED
  productionStatus        # WAITING | RELEASED | IN_PROGRESS | COMPLETED | ...

  productId               # mapeado internamente (obrigatório para liberar)
  technicalSheetId?       # source da ficha: A DEFINIR (Docs 05 / 05A)
  technicalSheetVersion?

  plannedQuantity         # espelho do gestor (não editar livremente)
  numberOfBatches?        # origem a validar
  massWeight?             # origem a validar

  productionDate

  externalSnapshot        # o que o gestor informou naquele momento

  createdAt
  updatedAt
  lastSyncedAt?
}
```

Material: OP com número, produto, quantidade planejada, massas, peso, data e lote — **vindos/espelhados da origem** quando a API fornecer.

---

## 17. Status da OP

Separar **dois eixos** (não misturar):

```
integrationStatus:  SYNCED · PENDING_VALIDATION · ERROR · OUTDATED
productionStatus:   WAITING · RELEASED · IN_PROGRESS · COMPLETED · CANCELLED · ...
```

Proposta inicial — validar com operação e Doc 05A. Não usar um único `status` genérico que misture sync e chão de fábrica.

Idempotência: reimportar a mesma OP (`externalId`) atualiza; **não** cria duplicata.

---

## 18. Número da OP

Exemplo: `260826-001` → preferir campo `externalOrderNumber` (espelho do gestor).

Separar:

| Campo | Exemplo |
|-------|---------|
| Firestore document ID | `pZ83Js...` |
| externalId | `123456` |
| externalOrderNumber | `260826-001` |

Não gerar com `Math.random()`.

---

## 19. BATCH / BATIDA

Material: 5.000 unidades · 5 batidas · 80 kg por massa.

```
ProductionBatch {
  id
  productionOrderId
  sequence
  plannedQuantity?
  plannedMassWeight
  status
  createdAt
}
```

---

## 20. BATIDA NÃO É NECESSARIAMENTE LOTE

Não assumir automaticamente `1 batida = 1 lote` sem validar com o processo real da DC Pães.

A arquitetura deve permitir relação clara entre ambos.

---

## 21. LOT

Lote é a principal entidade de rastreabilidade.

```
ProductionLot {
  id
  lotCode
  productionOrderId
  productId
  status
  currentStep
  plannedQuantity
  startedAt
  completedAt
  createdAt
  updatedAt
}
```

---

## 22. Código de lote

Exemplo: `PH26082601`

`lot.id` ≠ `lot.lotCode`. Preferir identificador interno independente.

---

## 23. QR Code

Preferencialmente referenciar identificador seguro e estável:

```
factory://lot/{id}
```

ou URL equivalente. Não colocar toda a rastreabilidade dentro do QR.

---

## 24. Estado atual do lote

Para leitura rápida:

```
currentStep: "PROOFING"
status: "IN_PROGRESS"
```

Isso **não** substitui histórico.

---

## 25. Histórico de eventos

```
ProductionEvent {
  id
  lotId
  productionOrderId
  type
  step
  stationId
  equipmentId
  operatorId
  occurredAt
  metadata
  createdAt
}
```

---

## 26. Event types

Proposta:

```
LOT_CREATED
WEIGHING_STARTED / WEIGHING_COMPLETED
MIXING_STARTED / MIXING_COMPLETED
MODELING_STARTED / MODELING_COMPLETED
TRAYING_STARTED / TRAYING_COMPLETED
PROOFING_STARTED / PROOFING_COMPLETED
BAKING_STARTED / BAKING_COMPLETED
COOLING_STARTED / COOLING_COMPLETED
PACKAGING_STARTED / PACKAGING_COMPLETED
LOT_COMPLETED
```

A lista final deve refletir o processo validado.

---

## 27. Por que eventos?

Sem eventos: `PH26082601 · status = PACKAGING`

Com eventos:

```
08:10 MIXING_STARTED
08:22 MIXING_COMPLETED
08:25 MODELING_STARTED
08:44 MODELING_COMPLETED
09:05 PROOFING_STARTED
14:07 PROOFING_COMPLETED
...
```

Permite reconstruir a rastreabilidade do material.

---

## 28. Evento preferencialmente imutável

Depois de registrado: evitar editar eventos históricos diretamente.

Correções: processo explícito (ex.: `EVENT_CORRECTED` ou registro administrativo).

Não apagar silenciosamente histórico industrial.

---

## 29. PRODUCTION STEP

Representação consolidada da execução da etapa:

```
LotStep {
  id
  lotId
  stepType
  status
  stationId
  equipmentId
  expectedDuration
  tolerance
  startedAt
  expectedFinishAt
  finishedAt
  inputQuantity
  outputQuantity
  lossQuantity
  operatorId
  createdAt
  updatedAt
}
```

---

## 30. Eventos × Step

| Conceito | Significado |
|----------|-------------|
| **Event** | Algo aconteceu |
| **Step** | Estado consolidado desta execução |

Exemplo: evento `PROOFING_STARTED às 09:05` → step Fermentação `09:05 → 14:07 · 302 min · CONCLUÍDO`

---

## 31. Não duplicar verdade

Se `finishedAt` está em `LotStep`, não criar três versões divergentes. Duplicação para performance exige regra explícita de sincronização.

---

## 32. Tempos padrão

Exemplos do material (configuráveis por produto):

| Etapa | Tempo | Tolerância |
|-------|-------|------------|
| Amassamento | 12 min | +2 |
| Modelagem / embandejamento | 20 min | +5 |
| Fermentação | 300 min | ±15 |
| Forneamento | 14 min | +2 |
| Resfriamento | 60 min | +10 |
| Embalagem | 40 min | +10 |

---

## 33. PROCESS STANDARD

```
ProcessStandard {
  id
  productId
  stepType
  standardDurationMinutes
  earlyToleranceMinutes?
  lateToleranceMinutes?
  parameters?
  active
  version
  createdAt
  updatedAt
}
```

---

## 34. Parâmetros específicos

| Etapa | Exemplos |
|-------|----------|
| Forno | temperature, duration |
| Fermentação | duration, tolerance |
| Resfriamento | minimumDuration |

Não obrigar todos os processos a terem os mesmos parâmetros.

---

## 35. EQUIPMENT

Códigos do material: AM01 · AM02 · MD01 · CF01 · FO01 · FO02 · EM01

```
Equipment {
  id
  code
  name
  type
  stationId?
  status
  active
  createdAt
  updatedAt
}
```

---

## 36. Equipment Type

```
MIXER · MODELER · PROOFING_CHAMBER · OVEN · PACKAGING_LINE
```

Não inferir tipo pelo nome textual.

---

## 37. Estado de equipamento

Proposta (validar com operação):

```
AVAILABLE · OPERATING · WAITING · STOPPED · MAINTENANCE · UNAVAILABLE
```

---

## 38. STATION

```
Station {
  id
  code
  name
  stepTypes[]
  equipmentIds[]
  active
  createdAt
  updatedAt
}
```

Exemplo: `ST-FERM-01` · Fermentação

---

## 39. Device binding

Tablet poderá ser associado à estação. Pode existir:

```
Device {
  id
  deviceCode
  stationId
  lastSeenAt
  active
}
```

Somente implementar se necessário.

---

## 40. USER

Preferencialmente reutilizar Firebase Authentication existente. Não criar outra autenticação.

```
UserProfile {
  uid
  displayName
  roleIds[]
  stationIds[]
  active
}
```

---

## 41. Não duplicar senha

Nunca guardar `password` em Firestore. Authentication gerencia credenciais.

---

## 42. ROLE

Modelo conceitual:

```
ADMIN · PCP · MANAGER · SUPERVISOR · OPERATOR · QUALITY · VIEWER
```

Verificar perfis existentes no Firebase antes.

---

## 43. Operator ID nos eventos

Ao iniciar etapa, registrar `operatorId` quando relevante — rastreabilidade por etapa.

---

## 44. LOSS

```
ProductionLoss {
  id
  lotId
  productionOrderId
  stepType
  quantity
  unit
  percentage?
  reasonId?
  notes?
  operatorId
  equipmentId?
  occurredAt
  createdAt
}
```

---

## 45. Percentual

Preferencialmente derivado:

```
lossPercentage = lossQuantity / inputQuantity * 100
```

Definir denominador correto por etapa. Não assumir fórmula universal sem validação.

---

## 46. LOSS REASON

```
LossReason {
  id
  code
  label
  stepTypes[]
  active
}
```

Permite botões rápidos no Floor.

---

## 47. OCCURRENCE

```
Occurrence {
  id
  lotId?
  productionOrderId?
  equipmentId?
  stationId?
  category
  reasonId?
  description?
  severity?
  status
  openedBy
  openedAt
  resolvedBy?
  resolvedAt?
  createdAt
  updatedAt
}
```

---

## 48. Categoria

Proposta (não consolidar sem validação):

```
EQUIPMENT · PRODUCT · INPUT · QUALITY · PROCESS · OTHER
```

---

## 49. Fotos

Evidência fotográfica futura: Storage existente (se apropriado). Firestore guarda só referência/metadados.

**Não** guardar imagem em base64 no Firestore.

---

## 50. Por que não base64?

Aumenta tamanho e leitura; piora performance; aproxima limite de documento.

Preferir: Storage + URL/referência no Firestore.

---

## 51. Produção final

Na embalagem, o material prevê: quantidade recebida · embalada · perdas · pacotes · peso médio · data fabricação · validade · lote impresso.

Associar ao lote/etapa de embalagem.

---

## 52. PACKAGING RESULT

```
PackagingResult {
  lotId
  receivedQuantity
  packagedQuantity
  lossQuantity
  packages
  averageWeight
  manufacturingDate
  expirationDate
  printedLotCode
}
```

Estrutura final depende da granularidade real da operação.

---

## 53. Produção planejada × final

Não sobrescrever `plannedQuantity` com resultado. Manter:

```
plannedQuantity
actualQuantity
```

Separados — permite aderência.

---

## 54. Timestamps

Usar timestamps Firebase/servidor quando apropriado:

```
createdAt · updatedAt · startedAt · finishedAt · occurredAt
```

Não armazenar horários operacionais apenas como strings (`"14:28"`).

---

## 55. Datas exibidas

| Camada | Formato |
|--------|---------|
| Banco | Timestamp |
| UI | 28/08/2026 · 14:28 |

Formatação pertence à apresentação.

---

## 56. expectedFinishAt

Ao iniciar etapa:

```
startedAt + standardDuration = expectedFinishAt
```

Permite cronômetros em qualquer dispositivo.

---

## 57. Cronômetro não deve gerar write a cada segundo

**CRÍTICO.** Não fazer write a cada segundo.

Persistir: `startedAt` · `expectedFinishAt`  
UI calcula: `remaining = expectedFinishAt - now`

---

## 58. Realtime

Listeners úteis para: lotes ativos · estado de estação · attention queue · equipamentos atuais · OPs do turno.

Não ouvir todos os eventos desde 2024 para construir uma Home.

---

## 59. Query scope

| Ruim | Melhor |
|------|--------|
| get all productionEvents | filtrar por data, estação, contexto |

---

## 60. Índices

Após definir queries reais: documentar índices necessários. Não criar dezenas de índices especulativos.

---

## 61. Denormalização controlada

Pode ser útil snapshotar `productName` · `lotCode` · `equipmentName` quando:

- melhora leitura;
- evita lookup frequente;
- histórico precisa preservar nome da época.

Documentar cada denormalização.

---

## 62. Nunca confiar no nome duplicado como relação

Mesmo com `productName`, guardar `productId` quando houver relação.

---

## 63. Snapshot histórico

Evento pode guardar:

```
productSnapshot: { code, name }
```

se importante para histórico imutável. Não copiar objeto inteiro desnecessariamente.

---

## 64. Estratégia offline

```
ONLINE → AÇÃO → WRITE

OFFLINE → AÇÃO PERMITIDA → LOCAL/PENDING → RECONEXÃO → SYNC
```

Somente para ações consideradas seguras offline.

---

## 65. Nem toda ação pode ser offline

Exemplo perigoso: dois tablets offline tentando mover o mesmo lote. Classificar operações.

---

## 66. Classes de operação

| Classe | Exemplo |
|--------|---------|
| **A — segura** | nota local não crítica |
| **B — sincronizável** | registro operacional sequencial |
| **C — exige online** | cancelamento, reprovação, correção administrativa |

Classificação definitiva depois.

---

## 67. Concurrency

Transições críticas validam estado esperado:

```
LOT · currentStep = PROOFING · version = 17
Cliente: PROOFING → BAKING
Servidor: currentStep ainda PROOFING? version ainda 17?
```

---

## 68. Version field

Considerar `version: number` incrementado em transições críticas. Implementação final validada tecnicamente.

---

## 69. Transactions

Usar transaction/batched writes quando operação alterar atomicamente múltiplos documentos.

Exemplo — FINALIZAR FERMENTAÇÃO:

1. fechar LotStep  
2. criar evento  
3. atualizar currentStep  
4. liberar próxima etapa  

Não permitir estado parcialmente atualizado.

---

## 70. Cloud Functions

Não criar Function para tudo. Usar quando houver benefício claro: regra server-side · agregação · integração · automação · operação sensível · async.

Primeiro verificar Functions existentes.

---

## 71. Security Rules

Segurança não pode existir apenas no frontend. OPERATOR não deve modificar configurações administrativas só porque o botão está escondido.

---

## 72. Roles e Claims

Antes de decidir Custom Claims vs. Firestore role documents: auditar autenticação existente. Pode haver estratégia híbrida.

---

## 73. Audit trail

Ações críticas devem permitir saber: quem · o quê · quando · lote · equipamento · estação.

---

## 74. createdBy / updatedBy

Entidades administrativas importantes: `createdBy` · `updatedBy` + timestamps.

---

## 75. Soft delete

Para entidades históricas: preferir `active: false` em vez de apagar — produtos, equipamentos, motivos, usuários vinculados a histórico.

---

## 76. Não apagar entidade referenciada

Se FO01 foi usado em 12.000 eventos, desativá-lo não pode destruir o histórico.

---

## 77. Dados atuais × históricos

Separar: **CURRENT STATE** de **EVENT HISTORY** — importante para performance.

---

## 78. Dashboard não deve calcular tudo no cliente

Não baixar milhares de eventos para somar `Produção hoje: 12.480` no navegador.

Conforme volume: aggregates · daily summaries · Cloud Functions · scheduled calculations.

---

## 79. AGGREGATES

Estrutura futura possível:

```
factory_daily_metrics/{date}
  plannedQuantity · producedQuantity · lossQuantity
  completedLots · activeLots · delayedLots
```

Não criar até necessidade e volume conhecidos.

---

## 80. Dashboard strategy

```
dados operacionais → agregação confiável → Cockpit
```

Não: Cockpit → baixa tudo → tenta descobrir o que aconteceu.

---

## 81. Rastreabilidade

Consulta por `lotCode` retorna:

```
LOT + ORDER + PRODUCT SNAPSHOT + INGREDIENT USAGE
+ STEPS + EVENTS + EQUIPMENT + OPERATORS
+ LOSSES + OCCURRENCES + PACKAGING RESULT
```

---

## 82. INGREDIENT USAGE

```
IngredientUsage {
  id
  lotId
  productionOrderId
  batchId?
  ingredientId
  ingredientLotId?
  plannedQuantity
  actualQuantity
  unit
  operatorId?
  recordedAt
}
```

Atende: qual lote de ingrediente foi usado em determinado lote de produção.

---

## 83. Planned × Actual ingredient

Não sobrescrever. Manter `plannedQuantity` e `actualQuantity` separados.

---

## 84. IDs

Preferir Firestore Auto ID como identificador técnico.

Códigos humanos separados: `orderNumber` · `lotCode` · `equipmentCode` · `productCode`

---

## 85. Busca por código

Campos normalizados quando necessário. Não depender de full-text nativo do Firestore.

---

## 86. Busca global

Estratégia conforme volume. Não implementar mecanismo externo prematuramente.

---

## 87. Unidades

Não guardar `"50 kg"` como string única. Preferir:

```
quantity: 50
unit: "kg"
```

---

## 88. Peso

```
averageWeight: 360
weightUnit: "g"
```

---

## 89. Percentuais

Preferencialmente guardar base e derivar percentual na UI (`14 / 1000 → 1,4%`).

---

## 90. Firebase service layer

Estrutura recomendada (adaptar à existente):

```
src/
  lib/firebase/
    client.ts
    auth.ts
  repositories/
    products.repository.ts
    orders.repository.ts
    lots.repository.ts
    equipment.repository.ts
    occurrences.repository.ts
  services/
    production.service.ts
    traceability.service.ts
    metrics.service.ts
```

---

## 91. Componentes não falam diretamente com Firestore

```
LotCard → hook → service/repository → Firebase
```

Evitar `getDoc(...)` dentro de componentes de UI.

---

## 92. Hooks

Conceituais: `useActiveLots` · `useProductionOrder` · `useLot` · `useStationQueue` · `useEquipmentStatus` · `useTraceability`

Não criar hook diferente para cada card.

---

## 93. Types

Tipos de domínio centralizados:

```
types/
  product.ts
  production-order.ts
  lot.ts
  production-event.ts
  equipment.ts
```

---

## 94. Validação

Não confiar que qualquer documento possui estrutura correta. Schema validation na fronteira da aplicação. Reutilizar biblioteca já existente se houver.

---

## 95. Migrações

Qualquer mudança estrutural deve ter plano. Nunca executar script destrutivo automaticamente.

---

## 96. Ambiente

Identificar DEV · STAGING · PRODUCTION. Se não existirem: documentar estado encontrado — não inventar estratégia sem alinhar.

---

## 97. Emulator

Avaliar Firebase Emulator Suite para reduzir risco de testar na base real. Verificar arquitetura existente antes.

---

## 98. Seed

Dados fake somente em ambiente seguro/local. Nunca inserir automaticamente exemplos (`PH26082601`) na produção real.

---

## 99. Dados do PDF são exemplos

Valores como 986 unidades · 14 perdas · 180 °C · 14 min · 5 h são exemplos funcionais — **não** hardcodear como oficiais para todos os produtos.

---

## 100. Diagrama final

```
                    FIREBASE DC PÃES
                           │
                    FACTORY DOMAIN
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     PRODUCTS            USERS            EQUIPMENT
        │                                     │
 TECHNICAL SHEETS                           STATIONS
        │                                     │
 PROCESS STANDARDS                            │
        │                                     │
        └────────── PRODUCTION ORDER ─────────┘
                         │
                      BATCHES
                         │
                       LOTS
                         │
                  ┌──────┴──────┐
                  │             │
                STEPS         EVENTS
                  │             │
          ┌───────┼─────────────┤
          │       │             │
        LOSSES OCCURRENCES INGREDIENT USAGE
                  │
                  ↓
             TRACEABILITY → FACTORY COCKPIT
```

---

## 101. Instrução para o Cursor antes de codificar

```
FASE 1  Auditar Firebase existente
FASE 2  Gerar firebase-existing-audit.md
FASE 3  Comparar com Documento 04
FASE 4  Propor mapping: REUTILIZAR / ADAPTAR / CRIAR
FASE 5  Apresentar impacto
FASE 6  Somente depois implementar
```

---

## 102. Regra de segurança

Se encontrar coleções como `users` · `products` · `orders`: **não assumir que são nossas**. Descobrir quem consome — Firebase pertence a outro projeto do mesmo cliente.

---

## 103. Critério de sucesso

A arquitetura estará correta quando um QR Code de pão pronto reconstruir:

```
PH26082601 · PÃO HAMBÚRGUER 90g
OP 260826-001 · PRODUÇÃO 26/08/2026

MATÉRIA-PRIMA
Farinha → lote XXX · Fermento → lote XXX · Gordura → lote XXX

AMASSAMENTO   08:10 → 08:22 · Amassadeira 02 · João
MODELAGEM     08:25 → 08:44
FERMENTAÇÃO   09:05 → 14:07
FORNO         14:12 → 14:26 · Forno 01
RESFRIAMENTO  14:28 → 15:30
EMBALAGEM     15:35 → 16:15

PLANEJADO 1.000 · FINAL 970 · PERDA 3%
```

Essa é a visão de rastreabilidade pedida pelo material-base.

---

## Adendo — origem da OP (Doc 05)

A OP **não nasce** no Factory OS. Fluxo oficial:

```
SISTEMA GESTOR → API → Integration Layer → ProductionOrder (importada)
  → validação / lotes / execução → Floor / Cockpit
```

Ver [Documento 05](05-PRODUCTION-ORDER-INTEGRATION.md) e [05A](05A-ERP-OP-INTEGRATION.md).
