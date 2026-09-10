# DOCUMENTO 05A — ERP / OP INTEGRATION

**DC Pães · Factory OS**

| | |
|---|---|
| **Versão** | 1.0 |
| **Status** | Especificação de integração |
| **Origem da OP** | Sistema Gestor da DC Pães |
| **Destino operacional** | Factory OS |
| **Persistência** | Firebase existente do cliente |
| **Integração esperada** | API, a confirmar conforme documentação do sistema gestor |
| **Relacionado** | [Documento 05](05-PRODUCTION-ORDER-INTEGRATION.md) |

---

## 1. Objetivo

O Factory OS **não** cria a Ordem de Produção como fonte primária.

A OP deve ser originada no sistema gestor já utilizado pela DC Pães e importada para o Factory OS.

O Factory OS será responsável por:

```
RECEBER
 ↓
NORMALIZAR
 ↓
VALIDAR
 ↓
ENRIQUECER COM DADOS INDUSTRIAIS
 ↓
LIBERAR PARA EXECUÇÃO
 ↓
ACOMPANHAR
 ↓
RASTREAR
```

---

## 2. Divisão de responsabilidades

### Sistema Gestor

Fonte oficial da Ordem de Produção. Conceitualmente poderá fornecer:

- Número da OP
- Produto
- Código do produto
- Quantidade planejada
- Data prevista
- Status da OP
- Outras informações administrativas

> Os campos exatos dependem da API real e **não** devem ser inventados antes da análise da integração.

### Factory OS

Responsável por dados e processos industriais:

- Mapeamento do produto
- Configuração industrial
- Batidas · Lotes · QR Code
- Etapas · Tempos · Equipamentos · Operadores
- Perdas · Ocorrências · Rastreabilidade
- KDS · Indicadores industriais

---

## 3. Regra de fonte de verdade

```
SISTEMA GESTOR  = SOURCE OF TRUTH DA OP
FACTORY OS      = SOURCE OF TRUTH DA EXECUÇÃO INDUSTRIAL
```

Nunca permitir que uma interface dê a impressão de que o Factory OS substituiu o sistema gestor.

---

## 4. Arquitetura macro

```
┌──────────────────────────────┐
│ SISTEMA GESTOR DC PÃES      │
│ OPs / Produtos / Quantidade │
└──────────────┬───────────────┘
               │ API
               ▼
┌──────────────────────────────┐
│ INTEGRATION LAYER           │
│ Auth · Fetch · Normalização │
│ Validação · Idempotência    │
│ Logs                        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ FIREBASE DC PÃES            │
│ OPs importadas              │
│ Factory Domain              │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ FACTORY OS                  │
│ PCP / KDS / Cockpit         │
│ Rastreabilidade             │
└──────────────────────────────┘
```

---

## 5. Princípio de desacoplamento

A aplicação **não** deve depender diretamente do formato bruto da API.

```
API EXTERNA → ADAPTER → MODELO NORMALIZADO → DOMÍNIO FACTORY
```

**Nunca:** `API EXTERNA → COMPONENTE REACT`

---

## 6. Adapter da integração

```ts
interface ProductionOrderSource {
  fetchOrders(params?: FetchOrdersParams): Promise<ExternalProductionOrder[]>;
  fetchOrder(externalId: string): Promise<ExternalProductionOrder>;
}
```

Depois:

```ts
normalizeProductionOrder(externalOrder) → NormalizedProductionOrder
```

---

## 7. Não acoplar nomes externos ao domínio

Se a API retornar:

```json
{ "CODOP": "260826-001", "CODPROD": "001234", "QTDPLAN": 5000 }
```

**não** espalhar `order.CODOP` pela aplicação.

Normalizar:

```ts
{ externalOrderNumber, externalProductCode, plannedQuantity }
```

---

## 8. ExternalProductionOrder

Tipo de entrada deve refletir a API real.

**Não** definir definitivamente antes de receber documentação/exemplo.

```ts
interface ExternalProductionOrder {
  // estrutura real da API
}
```

---

## 9. NormalizedProductionOrder

```ts
interface NormalizedProductionOrder {
  sourceSystem: string;

  externalId: string;
  externalOrderNumber: string;

  externalProductId?: string;
  externalProductCode?: string;
  externalProductName?: string;

  plannedQuantity?: number;
  productionDate?: Date;

  externalStatus?: string;

  sourceUpdatedAt?: Date;

  rawSnapshot?: unknown;
}
```

Campos opcionais até conhecermos a API.

---

## 10. ProductionOrder interna

```ts
interface ProductionOrder {
  id: string;

  sourceSystem: string;

  externalId: string;
  externalOrderNumber: string;

  productId?: string;

  plannedQuantity?: number;
  productionDate?: Timestamp;

  integrationStatus: IntegrationStatus;
  productionStatus: ProductionStatus;

  importedAt: Timestamp;
  lastSyncedAt: Timestamp;

  sourceUpdatedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 11. Identificador externo

Obrigatório preservar `externalId` e, quando existir, `externalOrderNumber`.

**Não** assumir que são iguais.

---

## 12. ID Firebase

Manter separado:

| Campo | Exemplo |
|-------|---------|
| Firestore Document ID | `J3ka9P...` |
| externalId | `893274` |
| externalOrderNumber | `260826-001` |

---

## 13. Idempotência

Se a API responder a mesma OP várias vezes (`893274` × N), deve existir **apenas uma** OP interna.

```
sourceSystem + externalId = chave lógica única
```

---

## 14. Upsert

```
FIND BY sourceSystem + externalId

IF NOT FOUND → IMPORT
IF FOUND     → COMPARE
IF CHANGED   → UPDATE ACCORDING TO RULES
```

---

## 15. Nunca duplicar por polling

Mesmo com sync a cada 1 ou 5 minutos: **não** gerar novas OPs a cada execução.

---

## 16. Estratégia de integração

Ainda não sabemos se o gestor fornecerá REST · SOAP · GraphQL · Webhooks · Database integration.

**Não** consolidar tecnologia específica.

---

## 17. Possibilidade A — Pull

```
FACTORY OS → GET /orders → SISTEMA GESTOR
```

Pode utilizar: intervalo · data de atualização · status · paginação.

---

## 18. Possibilidade B — Push

```
SISTEMA GESTOR → WEBHOOK → FACTORY OS
```

Somente se o sistema fornecer essa capacidade.

---

## 19. Possibilidade C — Híbrida

```
WEBHOOK + POLL DE RECONCILIAÇÃO
```

Webhook atualiza rapidamente; polling verifica perdas. Não implementar sem necessidade.

---

## 20. Onde executar integração

**Não** executar sincronização principal no browser.

Preferir server-side: Cloud Functions · Cloud Run · Backend existente · Server Functions do projeto.

A decisão depende da infraestrutura atual.

---

## 21. Não expor credencial da API no frontend

Nunca: `NEXT_PUBLIC_ERP_PASSWORD`

Credenciais externas permanecem server-side.

---

## 22. Autenticação da API

Pode ser: API Key · Basic Auth · Bearer Token · OAuth · Certificate · IP allowlist.

Somente definir após documentação.

---

## 23. Secrets

Usar: Secret Manager · Cloud Functions secrets · ou mecanismo já utilizado no projeto.

**Não** versionar em Git.

---

## 24. Sincronização inicial

Não importar automaticamente todo o histórico.

Definir janela (ex.: OPs de hoje em diante · últimos X dias). Validar a regra.

---

## 25. Paginação

Se API paginada: respeitar. Não assumir que `GET /orders` retorna tudo.

---

## 26. Incremental sync

Preferir, quando a API permitir: `updatedSince` ou equivalente.

```
lastSuccessfulSyncAt → buscar alterações posteriores
```

---

## 27. Cursor de sincronização

```ts
IntegrationState {
  sourceSystem
  lastSuccessfulSyncAt
  lastAttemptAt
  cursor?
  status
}
```

---

## 28. IntegrationStatus

```ts
type IntegrationStatus =
  | "SYNCED"
  | "PENDING_VALIDATION"
  | "ERROR"
  | "OUTDATED"
  | "IGNORED";
```

`IGNORED` somente se houver caso de uso validado.

---

## 29. ProductionStatus

```ts
type ProductionStatus =
  | "WAITING"
  | "RELEASED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
```

Estados definitivos virão do workflow.

---

## 30. Não misturar status

**Errado:** `status = API_ERROR` depois `status = MIXING` no mesmo campo.

Dois conceitos → dois campos.

---

## 31. Validação pós-importação

Verificações possíveis (obrigatoriedade depende da API):

- Tem externalId?
- Tem número?
- Produto está mapeado?
- Quantidade é válida?
- Data é válida?
- Configuração industrial existe?

---

## 32. Estados visuais da validação

```
✓ PRONTA PARA PRODUÇÃO
! PRODUTO NÃO CONFIGURADO
! CONFIGURAÇÃO INCOMPLETA
× ERRO DE IMPORTAÇÃO
```

---

## 33. Produto externo

```ts
Product {
  id
  externalId?
  externalCode?
  name
}
```

---

## 34. Product mapping

```
API 001234 / PAO HAMB 90G
  → PRODUCT MAPPING
  → Factory Product: Pão Hambúrguer 90g
```

---

## 35. Produto já mapeado

```
001234 → productId = ABC123
```

Sem intervenção.

---

## 36. Produto desconhecido

OP importada, **bloqueada** para execução:

```
OP 260826-004
PRODUTO NÃO CONFIGURADO
Código externo 001897
Descrição externa PÃO AUSTRALIANO 70G
[ MAPEAR PRODUTO ]
```

---

## 37. Não descartar a OP

Mesmo com produto não mapeado: registrar como pendente — permite resolver sem nova importação.

---

## 38. Mapping manual

```
MAPEAR PRODUTO
Produto do sistema gestor: 001897 · PÃO AUSTRALIANO 70G
Relacionar com [ Buscar produto DC Factory ]
ou [ CADASTRAR PRODUTO ]
```

---

## 39. Mapping persistente

Depois `001897 → productId XYZ`, próximas OPs mapeiam automaticamente.

---

## 40. Não mapear por nome como única estratégia

Evitar `"Pão Hambúrguer" == "PAO HAMB"` como chave principal.

Usar código/ID externo sempre que confiável.

---

## 41. Ficha técnica — origem ainda pendente

A ficha vem do gestor **ou** é mantida no Factory OS?

O material exige acesso à receita/ficha, mas **não** define origem sistêmica.

> **DECISÃO PENDENTE**

---

## 42. Cenário A — ficha vem do gestor

```
GESTOR → Produto → Ficha → Factory OS
```

Factory OS pode manter snapshot para execução e rastreabilidade.

---

## 43. Cenário B — ficha fica no Factory OS

```
OP externa → externalProductCode → Factory Product → Factory Technical Sheet
```

---

## 44. Cenário C — parte em cada sistema

Possível, mas evitar se gerar ambiguidade. Definir fonte oficial campo a campo.

---

## 45. Batidas

Pendente: gestor envia `numberOfBatches` ou Factory OS calcula?

---

## 46. Lote

Pendente: lote vem do gestor **ou** é gerado no Factory OS? Não decidir antes.

---

## 47. Regra de propriedade por campo

Tabela a preencher após análise da API:

| CAMPO | ORIGEM | EDITÁVEL FACTORY? |
|-------|--------|-------------------|
| OP | Gestor | Não |
| Produto | Gestor | Não |
| Quantidade | Gestor | Não |
| Data | Gestor | Não |
| Ficha | A definir | A definir |
| Batidas | A definir | A definir |
| Lote | A definir | A definir |
| Turno | Factory? | A definir |
| Linha | Factory? | A definir |
| Equipamento | Factory | Sim/contextual |
| Operador | Factory | Execução |
| Perdas | Factory | Execução |

---

## 48. Dados bloqueados na UI

Quando vierem do gestor:

```
Quantidade  5.000 unidades
ORIGEM: GESTOR
```

Não precisa cadeado em todo campo — label discreto basta.

---

## 49. Alteração na origem

```
IMPORTAÇÃO 1 → 5.000 un.
IMPORTAÇÃO 2 → 6.000 un.
```

Sistema precisa comparar.

---

## 50. Change detection

Salvar hash ou comparar campos relevantes:

```
previous source snapshot  vs  new source snapshot
```

---

## 51. Alteração antes da execução

Se produção ainda não iniciou: pode atualizar automaticamente, conforme regra.

Registrar: `SOURCE_ORDER_UPDATED`

---

## 52. Alteração durante execução

**Não** atualizar campos críticos silenciosamente.

```
ALTERAÇÃO RECEBIDA
Quantidade planejada: Anterior 5.000 · Nova 6.000
A produção já foi iniciada.
```

---

## 53. Pending source change

Modelar `pendingSourceChanges` (ou equivalente). Não misturar imediatamente com estado operacional.

---

## 54. Cancelamento externo

OP ainda não iniciada: pode refletir cancelamento automaticamente, após validação da regra.

---

## 55. Cancelamento com produção iniciada

Se API = `CANCELLED` e Factory = `IN_PROGRESS`: **não** encerrar silenciosamente.

```
OP CANCELADA NO SISTEMA GESTOR
Produção já iniciada.
Requer decisão do supervisor/PCP.
```

---

## 56. Deleção externa

Nunca interpretar desaparecimento da API automaticamente como deleção.

Algumas APIs retornam apenas itens ativos. Exigir campo/status explícito.

---

## 57. Histórico de sincronização

```ts
IntegrationRun {
  id
  sourceSystem
  startedAt
  finishedAt
  status
  receivedCount
  createdCount
  updatedCount
  errorCount
}
```

---

## 58. Não criar documento por request desnecessariamente

Logs úteis; evitar explosão de custos. Opções: agregados · Cloud Logging · só erros. Definir após arquitetura.

---

## 59. Erro individual

```
OP 260826-015
ERRO DE IMPORTAÇÃO
Produto sem código externo.
```

Uma OP inválida **não** deve bloquear toda a sincronização.

---

## 60. Partial success

50 OPs: 48 sucesso · 2 erro → `SYNC COMPLETED WITH ERRORS`

Não rollbackar necessariamente as 48 corretas.

---

## 61. Retry

Erros transitórios (timeout · 5xx · network): retry com backoff.

---

## 62. Não fazer retry infinito

Definir limite → `INTEGRATION ERROR` → alertar administração.

---

## 63. Backoff

```
1ª tentativa → 2ª após pequeno intervalo → 3ª com intervalo maior
```

Não gerar carga excessiva no gestor.

---

## 64. Rate limit

Respeitar limites da API. Nunca loop agressivo.

---

## 65. Timeout

Toda chamada externa com timeout. Não aguardar indefinidamente.

---

## 66. Observabilidade

Conseguir responder:

- Quando foi a última sincronização?
- Funcionou?
- Quantas OPs chegaram?
- Existe erro?
- Qual foi a última OP importada?

---

## 67. Status da integração

Cockpit administrativo (não no Floor):

```
SISTEMA GESTOR · ● CONECTADO
Última sincronização 14:28
18 OPs recebidas hoje
[ VER INTEGRAÇÃO ]
```

---

## 68. Erro de integração

```
SISTEMA GESTOR · ● ATENÇÃO
Última sincronização com sucesso 13:42
Falha nas últimas 3 tentativas.
[ ANALISAR ]
```

---

## 69. Não assustar chão de fábrica

Se OPs já importadas estão disponíveis, falha temporária da API **não** interrompe execução atual.

Integração e execução são desacopladas.

---

## 70. Disponibilidade

```
ERP ONLINE → Importa OP → Firebase
ERP OFFLINE depois → OP já importada continua disponível
```

---

## 71. O Factory Floor não consulta ERP diretamente

Tablet **não** faz `GET ERP /order/...`

Execução usa dados internalizados no Firebase.

---

## 72. Razões

Menor latência · maior disponibilidade · controle offline · menos dependência externa · segurança · consistência.

---

## 73. Snapshot externo

```ts
sourceSnapshot: { payloadVersion?: string, data: {...} }
```

Avaliar tamanho. Pode manter somente campos relevantes.

---

## 74. Não armazenar payload gigantesco sem motivo

Preferir: campos normalizados + metadata relevante da origem.

---

## 75. Sensibilidade

Antes de persistir payload bruto, verificar: preços · financeiro · dados pessoais · info desnecessária.

Não copiar por conveniência.

---

## 76. Segurança de leitura

Operadores **não** precisam acessar: integration logs · raw payload · API errors.

Security Rules devem separar.

---

## 77. Coleções conceituais

Após auditoria Firebase, possível:

```
factory_production_orders
factory_integration_state
factory_product_mappings
factory_integration_errors
```

Nomes definitivos dependem da estrutura existente.

---

## 78. ProductMapping

```ts
ProductMapping {
  id
  sourceSystem
  externalProductId?
  externalProductCode
  productId
  active
  createdAt
  updatedAt
}
```

---

## 79. Unique mapping

Não permitir `externalCode 001234` apontando para dois produtos ativos ao mesmo tempo.

---

## 80. Mudança de mapping

Alterar mapping **não** muda histórico das OPs antigas. OP preserva `productId` usado naquela execução.

---

## 81. Reprocessar OP

Ação administrativa: `[ REPROCESSAR INTEGRAÇÃO ]` — mesmo `externalId`. Nunca duplicar.

---

## 82. Sincronizar agora

Painel admin: `[ SINCRONIZAR AGORA ]` se API/infra permitirem — com rate limiting.

---

## 83. Não colocar na Home principal

Integração é infraestrutura. Se saudável, discreta.

---

## 84. Tela de integração

Rota conceitual: `/app/settings/integrations/erp` (ou equivalente administrativo).

---

## 85. Tela

```
SISTEMA GESTOR · ● CONECTADO
Última sincronização 28/08/2026 · 14:28
Próxima 14:33

HOJE
Recebidas 18 · Novas 6 · Atualizadas 3 · Sem alteração 9 · Erros 0

[ SINCRONIZAR AGORA ]
HISTÓRICO DE SINCRONIZAÇÃO
```

---

## 86. Sync frequency

Não definir ainda (1 / 5 / 10 min). Depende de: API · volume · urgência · rate limit · operação.

---

## 87. Se API não possuir updatedAt

Estratégias alternativas: janela · hash · data · status. Definir após documentação.

---

## 88. Se API não possuir identificador imutável

Risco. Identificar chave composta confiável (ex. possível: `orderNumber + branch`). **Não inventar.**

---

## 89. Multiempresa / filial

Descobrir se existe empresa / filial / unidade. `externalId` pode ser único só dentro da filial.

---

## 90. Timezone

Padronizar timezone. Brasil operacional; backend pode ser UTC ou string local. Não interpretar silenciosamente.

---

## 91. Datas

Adapter converte `2026-08-28T00:00:00` ou `28/08/2026` para representação interna consistente.

---

## 92. Quantidades

Não armazenar `"5.000"` sem saber se é cinco mil ou cinco. Parser respeita formato da API.

---

## 93. Unidade

Se vier `UN` / `KG` / `CX`: preservar. Não assumir sempre unidade.

---

## 94. Status externo

Não usar diretamente na UI industrial. Mapping: `ERP status = L` → `externalStatus = "L"` → regra de integração.

---

## 95. Não inventar mapping de status

Precisamos da documentação do sistema gestor.

---

## 96. Testes de integração

Fixtures sanitizadas: `order-basic.json` · `order-updated.json` · `order-cancelled.json` · `order-unknown-product.json`

Sem dados sensíveis.

---

## 97. Cenários mínimos de teste

OP nova · repetida · alterada · cancelada · produto conhecido · desconhecido · API offline · timeout · 401 · 500 · payload inválido · paginação

---

## 98. Teste crítico — idempotência

Sincronizar duas vezes com os mesmos dados → **1 OP**, não 2.

---

## 99. Teste crítico — alteração em execução

Importar 5.000 → iniciar produção → API envia 6.000 → **ALTERAÇÃO PENDENTE**, não update silencioso.

---

## 100. Teste crítico — produto desconhecido

OP importada + `PENDING_VALIDATION` — **não** descartada.

---

## 101. Teste crítico — API indisponível

Produção já importada continua funcionando.

---

## 102. Quinta regra crítica

Integração externa **nunca** pode apagar rastreabilidade já registrada.

OP alterada/cancelada no gestor → eventos industriais existentes permanecem.

---

## 103. Contrato entre integração e workflow

```
IMPORTED → VALIDATED → READY → WORKFLOW
```

Somente OP validada entra no workflow.

---

## 104. Gate de liberação

Antes do KDS:

- Produto mapeado?
- Configuração industrial disponível?
- Dados mínimos válidos?
- OP não cancelada?
- Sem conflito crítico?

---

## 105. Resultado para Factory Floor

Operador nunca precisa saber que houve API.

```
PRÓXIMO LOTE
PÃO HAMBÚRGUER 90g · 5.000 unidades
[ ESCANEAR / INICIAR ]
```

---

## 106. Resultado para PCP

PCP vê OPs do sistema gestor e prepara/libera a execução.

---

## 107. Resultado para gestão

Cockpit combina **PLANEJAMENTO IMPORTADO + EXECUÇÃO REAL** → Planejado × realizado (indicador do material).

---

## 108. Impacto no Documento 04

Antes: Factory OS cria `ProductionOrder`.

Agora: Factory OS persiste representação **sincronizada** da OP originada externamente.

Campos obrigatórios conforme disponibilidade: `sourceSystem` · `externalId` · `externalOrderNumber` · `integrationStatus` · `importedAt` · `lastSyncedAt` · `sourceUpdatedAt`

---

## 109. Impacto no Documento 05

Remover como funções primárias: Nova OP · Criar OP · Definir produto · Definir quantidade.

Substituir por: OPs recebidas · Validar · Configurar · Mapear · Programar · Liberar · Acompanhar.

---

## 110. Perguntas quando houver acesso à API

1. Qual sistema gestor?
2. Existe documentação da API?
3. Como autentica?
4. Qual endpoint retorna OP? Por OP?
5. Qual é o ID único?
6. Retorna alterações / cancelamentos?
7. Tem `updatedAt` / paginação / rate limit?
8. Produto vem com código?
9. Quantidade em qual unidade?
10. Ficha técnica vem junto?
11. Batidas / lote vêm na OP?
12. Existem filial/empresa?
13. Quais status existem?
14. Há webhook?
15. Filtros por data / status?

---

## 111. Instrução ao Cursor

Enquanto essas respostas não existirem:

> Criar interface/adapter abstrato e mocks. **Não** inventar contrato real da API.

---

## 112. Modo mock

```
ProductionOrderSource
  → MockProductionOrderSource   (dev)
  → ErpProductionOrderSource    (depois)
```

Sem alterar as telas.

---

## 113. Estrutura sugerida

```
src/
  integrations/
    production-orders/
      production-order-source.ts
      production-order-normalizer.ts
      production-order-sync.service.ts
      sources/
        mock-production-order.source.ts
        erp-production-order.source.ts
      types/
        external-production-order.ts
        normalized-production-order.ts
```

Adaptar ao padrão real do projeto.

---

## 114. Logs de domínio

Diferenciar:

| Tipo | Significado |
|------|-------------|
| **INTEGRATION LOG** | Sync / import |
| **PRODUCTION EVENT** | Etapa de fabricação |

Importar uma OP **não** é uma etapa de fabricação.

---

## 115. Conclusão arquitetural

```
                    SISTEMA GESTOR
                           │ OPs / API
                           ▼
                 ┌─────────────────┐
                 │ INTEGRATION     │
                 │ LAYER           │
                 └────────┬────────┘
                          ▼
                   FIREBASE DC PÃES
                          │
                    OP SINCRONIZADA
                          │
                    VALIDAR / MAPEAR
                          ▼
                    FACTORY DOMAIN
              ┌───────────┴───────────┐
             KDS                    COCKPIT
          EXECUÇÃO               INTELIGÊNCIA
              └──────────┬────────────┘
                         ▼
                  RASTREABILIDADE
```

---

## 116. Regra final

> Nunca duplicar no Factory OS uma função que pertence ao sistema gestor, salvo quando houver requisito explícito de contingência.

Nosso valor começa no ponto em que a **OP administrativa vira produção real de fábrica**.
