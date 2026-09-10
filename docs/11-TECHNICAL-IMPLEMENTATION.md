# DOCUMENTO 11 — TECHNICAL IMPLEMENTATION

**DC Pães · Factory OS**

| | |
|---|---|
| **Versão** | 1.0 |
| **Objetivo** | Dizer ao Cursor como iniciar e implementar o projeto sem reinterpretar a documentação funcional |
| **Status** | Último documento estrutural |

---

## 1. Stack

A stack exata do projeto existente deve ser **inspecionada** antes de qualquer alteração.

Direção esperada:

- Next.js
- TypeScript
- Firebase existente
- Responsive Web / PWA quando adequado

Não instalar bibliotecas ou trocar arquitetura apenas por preferência.

---

## 2. Firebase existente é obrigatório

Este projeto utilizará o Firebase que já existe para outro sistema do mesmo cliente.

```
INSPECIONAR → DOCUMENTAR → MAPEAR → REUTILIZAR → SÓ ENTÃO IMPLEMENTAR
```

Não criar automaticamente outro Firebase.

---

## 3. Auditoria inicial

Antes da primeira feature, criar: `/docs/firebase-existing-audit.md`

Mapear:

- Project ID
- Firestore? · Realtime Database? · Authentication? · Storage? · Functions? · Hosting? · App Check? · Analytics?
- Collections existentes
- Security Rules · Indexes · Functions
- Auth model · Custom Claims
- Environment variables

**Sem** copiar secrets para documentação.

---

## 4. Regra de segurança do projeto compartilhado

É **proibido**, sem análise explícita:

- deletar / renomear collection existente
- alterar estrutura usada por outro sistema
- substituir Security Rules globalmente
- migrar usuários existentes
- trocar Firebase Project

O Factory OS deve **conviver** com o sistema atual.

---

## 5. Namespace

Depois da auditoria, escolher isolamento. Exemplo:

```
factory_production_orders
factory_production_lots
factory_production_events
```

Não criar esses nomes antes de verificar a estrutura existente.

---

## 6. Camadas

Frontend nunca fala com Firebase de maneira desorganizada.

```
UI → HOOK / VIEW MODEL → SERVICE → REPOSITORY → FIREBASE
```

Integração ERP:

```
ERP → SOURCE ADAPTER → NORMALIZER → SYNC SERVICE → FACTORY DOMAIN → FIREBASE
```

---

## 7. Estrutura sugerida

```
src/
├── app/
│   ├── cockpit/
│   ├── floor/
│   ├── quality/
│   ├── traceability/
│   └── settings/
├── components/
│   ├── ui/
│   ├── cockpit/
│   └── floor/
├── domain/
│   ├── production/
│   ├── quality/
│   ├── equipment/
│   └── traceability/
├── services/
│   ├── production.service.ts
│   ├── workflow.service.ts
│   ├── metrics.service.ts
│   └── traceability.service.ts
├── repositories/
├── integrations/
│   └── production-orders/
├── lib/
│   └── firebase/
└── types/
```

Adaptar à arquitetura que já existir. **Não** reorganizar projeto maduro só para corresponder a esta árvore.

---

## 8. Integração da OP

A OP **não** nasce no Factory OS.

```
SISTEMA GESTOR → API → INTEGRATION LAYER → NORMALIZAÇÃO
  → VALIDAÇÃO → FIREBASE → FACTORY OS
```

Não replicar cadastro manual de OP sem necessidade futura explícita.

---

## 9. Idempotência

```
sourceSystem + externalId
```

identifica logicamente uma OP. Sync repetido **não** gera OPs duplicadas.

---

## 10. ERP desacoplado

```ts
interface ProductionOrderSource {
  fetchOrders(params?: FetchOrdersParams): Promise<ExternalProductionOrder[]>;
  fetchOrder(externalId: string): Promise<ExternalProductionOrder>;
}
```

Enquanto API real não disponível: `MockProductionOrderSource`. **Não** inventar endpoint.

---

## 11. Alteração vinda do ERP

| Momento | Comportamento |
|---------|----------------|
| Antes da produção | Sincronizar conforme regras |
| Depois de iniciada | **NÃO** sobrescrever silenciosamente → `PENDING REVIEW` |

Histórico industrial permanece íntegro.

---

## 12. Workflow centralizado

Não:

```ts
updateDoc(lotRef, { currentStep: "BAKING" });
```

no componente.

Utilizar:

```
workflowService.startStep(...)
workflowService.completeStep(...)
workflowService.blockStep(...)
workflowService.resolveBlock(...)
```

---

## 13. Transações críticas

Uma conclusão pode precisar atomicamente:

```
FINALIZAR STEP + CRIAR EVENTO + ATUALIZAR LOTE + LIBERAR PRÓXIMO STEP
```

---

## 14. Concorrência

Dois tablets no mesmo lote: só uma transição válida. Workflow valida estado esperado antes.

---

## 15. operationId

Ações críticas:

```
{ operationId, lotId, stepType, action }
```

Duplo toque / retry **não** duplica evento.

---

## 16. Offline

Floor não vira tela branca sem internet. Mas **não** assumir “Firebase offline resolve tudo” — não resolve concorrência industrial sozinho.

---

## 17. Estados de sincronização

Interno: `SYNCED · SYNCING · PENDING · OFFLINE · CONFLICT`

UI traduz: ONLINE · SEM CONEXÃO · REGISTRO PENDENTE · ATUALIZAÇÃO NECESSÁRIA

---

## 18. Classificação de ações offline

| Classe | Exemplo potencial |
|--------|-------------------|
| **A** — seguro localmente | preenchimento temporário |
| **B** — fila | ocorrência não bloqueante |
| **C** — confirmação autoritativa | transferência crítica de etapa |

Classificação definitiva durante implementação/testes.

---

## 19. Não permitir cadeia insegura

Não encadear offline FINALIZA FORNO → RESFRIAMENTO → EMBALAGEM se nenhuma transição foi confirmada e há risco de conflito.

---

## 20. Timer

Nunca: `setInterval` → write Firebase a cada segundo.

Persistir: `startedAt` · `expectedFinishAt` · `finishedAt` — calcular visualmente no cliente.

---

## 21. Realtime contextual

Listeners: lotes ativos · fila da estação · equipamentos relevantes · atenções · produção do turno.

Não assinar todo histórico da fábrica.

---

## 22. Autenticação

Verificar Firebase Auth existente. Se compatível: **reutilizar**. Não criar segundo sistema de usuários.

Separar: **DEVICE / STATION** de **OPERATOR** (tablets compartilhados).

---

## 23. Permissões

Modelo conceitual:

```
ADMIN · PCP · MANAGER · SUPERVISOR · OPERATOR · QUALITY · VIEWER
```

Adaptar ao modelo existente.

---

## 24. Segurança não é esconder botão

Não basta `{isAdmin && <Button />}`. Autorização também na camada de dados/backend.

---

## 25. Permissões críticas

Liberar OP · cancelar produção · corrigir apontamento · bloquear/liberar lote · alterar parâmetros industriais · equipamento · usuários · reprocessar integração.

---

## 26. Datas e horários

Persistir **timestamps**. Formatar somente na UI. Não `"28/08/2026 14:32"` como string de apresentação no banco.

---

## 27. Snapshot industrial

Produção histórica não muda porque cadastro atual mudou. Preservar quando necessário: produto · versão da ficha · parâmetros · tempos padrão da execução.

---

## 28. Performance do Cockpit

Não baixar milhares de eventos para KPIs no browser.

Quando volume justificar: `shiftMetrics` · `dailyMetrics` · `equipmentMetrics` · `productMetrics` — depois de conhecer consultas e volume reais.

---

## 29. PWA

Floor tablet/mobile: comportamento de app web instalado quando adequado.

Prioridades: fullscreen · atalho na Home · cache do shell · boa retomada · touch-first.

PWA **não** substitui estratégia de dados offline.

---

## 30. Responsividade

Validar: 390×844 · 768×1024 · 1024×768 · 1280×800 · 1366×768 · 1440×900 · 1920×1080

Atenção especial: **1024×768** e **1280×800** (tablet landscape industrial).

---

## 31. QA operacional

Não testar só “a página abriu?”. Testar cenário:

```
OP importada → lote liberado → QR → batida → timer → finalização
→ modelagem → perda → fermentação → forno → resfriamento
→ embalagem → rastreabilidade completa
```

---

## 32. Cenários obrigatórios

Antes do MVP:

- ✓ fluxo completo normal
- ✓ QR inválido · QR na estação errada
- ✓ duplo clique · dois tablets no mesmo lote
- ✓ internet cai / volta
- ✓ equipamento indisponível · etapa atrasada
- ✓ ocorrência · perda
- ✓ resfriamento ainda bloqueado
- ✓ OP alterada pelo ERP · produto sem mapping · API indisponível
- ✓ rastreabilidade do lote concluído

---

## 33. Dados de teste

Fixtures coerentes (não aleatórios inconsistentes):

```
OP 260826-001 → Pão Hambúrguer 90g → 5 batidas → lotes → etapas → equipamentos → resultado
```

---

## 34. Desenvolvimento visual primeiro, mas conectado ao domínio

Mocks OK — com **tipos reais** do domínio.

```
TIPOS → VIEW MODELS → MOCKS → INTERFACE → REPOSITORIES → DADOS REAIS
```

Não: dashboard bonito → depois tentar encaixar banco.

---

## 35. Ordem de implementação

1. Auditoria do projeto existente  
2. Firebase audit  
3. Design tokens  
4. Componentes base  
5. Shell Cockpit  
6. Shell Factory Floor  
7. Domain types  
8. ERP adapter + mock  
9. Importação de OP  
10. Produto / mapping  
11. Lote + workflow engine  
12. QR  
13. Amassadeira  
14. Modelagem  
15. Embandejamento  
16. Fermentação  
17. Forno  
18. Resfriamento  
19. Embalagem  
20. Produção ao vivo  
21. Lot detail  
22. Rastreabilidade  
23. Management Cockpit  
24. Qualidade / ocorrências  
25. Offline / resiliência  
26. Permissões  
27. QA end-to-end  
28. Polimento  

---

## 36. Não construir tudo de uma vez

Primeiro milestone funcional:

```
OP IMPORTADA → LOTE → QR → KDS → TRANSIÇÃO → RASTREABILIDADE
```

Depois expandir horizontalmente.

---

## 37. Definition of Done

Feature operacional concluída quando possui:

- UI desktop/tablet/mobile quando aplicável
- loading · empty · error · offline quando aplicável
- permissão · validação
- idempotência quando crítica
- persistência · auditabilidade
- feedback de sucesso
- tratamento de concorrência
- teste do fluxo

---

## 38. Regra máxima para o Cursor

> A documentação define o produto. O Cursor implementa o produto; **não** redefine a operação industrial.

Se encontrar lacuna: identificar → documentar → abstração/configuração quando possível → **não inventar regra de negócio**.

Especialmente: batida ↔ lote · origem do lote · ficha técnica · validade · tempos divergentes · prioridade · reprovação · retrabalho · bloqueios · capacidade de equipamentos · API do gestor.

---

## 39. Fonte de verdade

```
DECISÃO POSTERIOR VALIDADA
          ↓
DOCUMENTAÇÃO DO FACTORY OS
          ↓
ESPECIFICAÇÃO ORIGINAL DC PÃES
          ↓
MOCK / HIPÓTESE
```

Mocks **nunca** viram regra de negócio por acidente.

---

## 40. Fechamento da documentação

Com o Documento 11, a arquitetura principal está fechada:

```
SISTEMA GESTOR / ERP
          ↓
    INTEGRAÇÃO DE OP
          ↓
      FIREBASE
     ┌────┴─────┐
FACTORY FLOOR   COCKPIT
     ↓
   KDS → EXECUÇÃO (tempos · quantidades · perdas · equipamentos · operadores · ocorrências)
     ↓
RASTREABILIDADE → INTELIGÊNCIA DE GESTÃO
```

**Documentação estrutural concluída.**
