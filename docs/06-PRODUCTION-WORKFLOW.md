# DOCUMENTO 06 — PRODUCTION WORKFLOW & STATE MACHINE

**DC Pães · Factory OS**

| | |
|---|---|
| **Versão** | 1.0 |
| **Status** | Especificação funcional e arquitetural |
| **Área** | Execução Industrial |
| **Entrada** | OP importada do sistema gestor, validada e liberada |
| **Backend** | Firebase existente |
| **Interfaces** | Factory Floor · Cockpit · KDS TV |

---

## 1. Objetivo

Este documento define como a produção se movimenta dentro do Factory OS.

A partir do momento em que uma OP importada está apta para execução, o sistema deve transformar o planejamento em um fluxo industrial rastreável:

```
OP IMPORTADA
      ↓
VALIDADA
      ↓
LIBERADA
      ↓
ABASTECIMENTO / PESAGEM
      ↓
AMASSAMENTO
      ↓
MODELAGEM
      ↓
EMBANDEJAMENTO
      ↓
FERMENTAÇÃO
      ↓
FORNEAMENTO
      ↓
RESFRIAMENTO
      ↓
EMBALAGEM
      ↓
CONCLUÍDO
```

O material-base descreve essa sequência operacional e estabelece tempos padrão por processo.

---

## 2. Princípio central

A navegação do operador **não** deve comandar o processo.

O **estado do lote** deve comandar a interface.

| Errado | Preferido |
|--------|-----------|
| Menu → Fermentação → procura lote → ação | Escaneia QR → sistema identifica lote/estado → abre etapa correta → próxima ação |

---

## 3. Regra de UX

Factory Floor:

> **Uma tela. Uma etapa. Uma ação dominante.**

O operador não precisa conhecer a máquina de estados. O software precisa conhecer.

---

## 4. Unidade de execução

O workflow operacional associa-se ao **lote/unidade rastreável**, não simplesmente à OP.

```
OP
 ├── LOTE / EXECUÇÃO 01 → WORKFLOW
 ├── LOTE / EXECUÇÃO 02 → WORKFLOW
 └── ...
```

A relação definitiva entre OP, batida e lote ainda depende de validação operacional e **não** deve ser artificialmente fixada.

---

## 5. Workflow configurável por produto

Não assumir que todo produto possui exatamente as mesmas etapas.

```
PRODUCT → PROCESS ROUTE → STEPS
```

Exemplo — PÃO HAMBÚRGUER 90g:

```
01 AMASSAMENTO
02 MODELAGEM
03 EMBANDEJAMENTO
04 FERMENTAÇÃO
05 FORNEAMENTO
06 RESFRIAMENTO
07 EMBALAGEM
```

---

## 6. Process Route

```
ProcessRoute {
  id
  productId
  version
  active
  steps[]
  createdAt
  updatedAt
}
```

---

## 7. Process Route Step

```
ProcessRouteStep {
  sequence
  stepType
  standardDurationMinutes
  earlyToleranceMinutes?
  lateToleranceMinutes?
  requiresEquipment
  requiresOperator
  parameters?
  nextStep?
}
```

Não consolidar campos opcionais antes da validação do processo.

---

## 8. Snapshot da rota

Assim como a ficha técnica, a rota utilizada pela produção deve ser preservada.

Se hoje `MODELAGEM → FERMENTAÇÃO` e no futuro `MODELAGEM → NOVA ETAPA → FERMENTAÇÃO`, uma produção histórica **não pode** mudar.

---

## 9. State Machine macro

Proposta arquitetural:

```
WAITING → READY → IN_PROGRESS → COMPLETED
```

Exceções: `BLOCKED` · `CANCELLED`

Não confundir o estado da execução da etapa com o tipo da etapa.

---

## 10. Exemplo

```
stepType: "PROOFING"
status: "IN_PROGRESS"
```

= Fermentação em execução.

---

## 11. Estado atual do lote

Projeção rápida:

```
currentStep: "PROOFING"
currentStepStatus: "IN_PROGRESS"
```

Facilita KDS e Cockpit. O histórico verdadeiro permanece nas execuções/eventos.

---

## 12. Estado geral do lote

```ts
type LotStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED";
```

---

## 13. Estado da etapa

```ts
type StepStatus =
  | "WAITING"
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED";
```

---

## 14. Estado temporal

```ts
type TimingStatus =
  | "NOT_STARTED"
  | "ON_TIME"
  | "ATTENTION"
  | "LATE"
  | "COMPLETED";
```

Não colocar tudo em um único status.

---

## 15. Por que separar?

Um lote pode estar:

| Eixo | Valor |
|------|-------|
| Process | FERMENTAÇÃO |
| Step status | IN_PROGRESS |
| Timing status | ATTENTION |

Isso é diferente de `STEP STATUS = BLOCKED`.

---

## 16. Regra de transição

```
ESTADO ATUAL + AÇÃO + VALIDAÇÃO = NOVO ESTADO
```

Exemplo: `READY + START + equipamento válido = IN_PROGRESS`

---

## 17. Não atualizar estado diretamente pela interface

Evitar:

```ts
updateDoc(lotRef, { currentStep: "BAKING" });
```

a partir de um botão React.

Preferir:

```
UI → Production Workflow Service → Validação → Transação → Firebase
```

---

## 18. Comandos de domínio

```
startStep()
completeStep()
blockStep()
resolveBlock()
transferToNextStep()
registerOccurrence()
```

O componente **não** implementa regra industrial.

---

## 19. Entrada no workflow

Pré-condição:

```
OP IMPORTADA ✓
PRODUTO MAPEADO ✓
CONFIGURAÇÃO INDUSTRIAL ✓
ROTA DEFINIDA ✓
OP LIBERADA ✓
```

Só então: `LOT → READY`

---

## 20. Primeira etapa

O material inclui abastecimento (10 min +5). A descrição operacional detalhada começa na Amassadeira.

Validar se **ABASTECIMENTO/PESAGEM** será etapa formal ou preparação do amassamento.

**Não decidir silenciosamente.**

---

## 21. AMASSAMENTO

KDS da Amassadeira: lote, produto, etapa e checklist de ingredientes. Após confirmação, inicia a batida. Padrão exemplificado: 12 min.

```
READY → CONFERIR LOTE → CONFERIR INGREDIENTES → INICIAR BATIDA
  → IN_PROGRESS → TIMER → FINALIZAR → COMPLETED
```

---

## 22. Tela antes do início

```
AMASSADEIRA 02
LOTE PH26082601 · PÃO HAMBÚRGUER 90g · BATIDA 01/05

INGREDIENTES
✓ Farinha ✓ Água ✓ Açúcar ✓ Fermento ✓ Gordura

[ INICIAR BATIDA ]
```

---

## 23. Checklist

Confirmação deve registrar quando fizer parte da rastreabilidade — não apenas efeito visual.

---

## 24. Ingrediente não confirmado

```
4 DE 5 CONFERIDOS
[ INICIAR BATIDA ]  ← desabilitado
```

---

## 25. Após iniciar

```
AMASSAMENTO · PÃO HAMBÚRGUER 90g · PH26082601
TEMPO DECORRIDO 08:17 · ● NO PADRÃO · Padrão 12 min
[ FINALIZAR BATIDA ]
Registrar ocorrência
```

---

## 26. Timer

Não gravar segundos continuamente no Firebase.

Persistir: `startedAt` · `expectedFinishAt` — calcular visualmente.

---

## 27. Status temporal do amassamento

Padrão 12 min · tolerância +2. Condições: dentro do padrão · atenção · tempo excedido.

---

## 28. Transição automática para Modelagem

Ao finalizar amassamento, o lote aparece automaticamente no KDS da Modelagem.

```
MIXING COMPLETED → MODELING READY
```

Não exigir PCP liberar modelagem.

---

## 29. MODELAGEM

Dados previstos: LOTE · QUANTIDADE ESPERADA · TEMPO PADRÃO · INÍCIO · FIM · QUANTIDADE PRODUZIDA · PERDA · OPERADOR · EQUIPAMENTO

Exemplo material: 1.000 esperadas · 986 produzidas · perda 14.

---

## 30. Início da Modelagem

```
MODELING READY + START → MODELING IN_PROGRESS
```

Registrar: `operatorId` · `equipmentId` · `startedAt`

---

## 31. Finalização da Modelagem

```
FINALIZAR MODELAGEM
Esperado 1.000 un. · Produzido [ 986 ] · Perda 14 un. · 1,4%
[ CONFIRMAR FINALIZAÇÃO ]
```

---

## 32. Cálculo da perda

```
expected = 1000 · produced = 986
→ loss = 14 · lossPercentage = 1.4%
```

---

## 33. Não pedir o que pode ser calculado

Evitar formulário com produzido + perda + percentual quando são matematicamente dependentes. Preferir entrada mínima + cálculo automático.

---

## 34. Quantidade inconsistente

Se `produzido > esperado`: não assumir erro automaticamente. Confirmação/ocorrência conforme regra futura.

---

## 35. EMBANDEJAMENTO

Após Modelagem: lote, quantidade, bandejas, horário, operador. Exemplo operacional: 15 min.

```
MODELING COMPLETED → TRAYING READY → TRAYING IN_PROGRESS → TRAYING COMPLETED
```

---

## 36. Dados

```
EMBANDEJAMENTO · PH26082601 · Pão Hambúrguer 90g
Quantidade 986 · Bandejas [ 42 ] · Entrada 08:45
[ CONCLUIR ]
```

---

## 37. Questão de arquitetura

Tabela geral de tempos: Modelagem / Embandejamento **20 min +5**.  
Seção operacional de Embandejamento: padrão **15 min**.

**Não corrigir por conta própria.** Documentar: **REGRA A VALIDAR COM A OPERAÇÃO.**

---

## 38. FERMENTAÇÃO

Escaneia QR → seleciona câmara → registra entrada, padrão e previsão de saída.

```
TRAYING COMPLETED → PROOFING READY → SCAN QR → SELECT CHAMBER
  → START → PROOFING IN_PROGRESS → COUNTDOWN → READY FOR OVEN
```

---

## 39. Seleção de câmara

```
FERMENTAÇÃO · LOTE PH26082601
SELECIONE A CÂMARA
[ CÂMARA 01 ] [ CÂMARA 02 ] [ CÂMARA 03 ]
```

Somente equipamentos `AVAILABLE` selecionáveis quando a regra exigir exclusividade.

---

## 40. Início

Exemplo material: Entrada 09:05 · Padrão 5h · Previsão 14:05

---

## 41. KDS de Fermentação

Múltiplos lotes simultâneos:

```
CÂMARA  LOTE         ENTRADA  SAÍDA   RESTANTE
01      PH26082601   09:05    14:05   42 min
02      HD26082602   09:18    14:18   55 min
03      PF26082601   09:31    14:31   1h08
```

---

## 42. Fermentação pronta

```
PH26082601
PRONTO PARA FORNEAMENTO
```

Alerta equivalente ao material: “LOTE … PRONTO PARA FORNEAMENTO”.

---

## 43. Atenção antecipada

Material: atenção com **15 min** restantes.

| Restante | Status |
|----------|--------|
| > 15 min | NO PADRÃO |
| ≤ 15 min | ATENÇÃO / PREPARAR PRÓXIMA ETAPA |
| excedido | ATRASADO |

---

## 44. Fermentação não “finaliza sozinha” fisicamente

Timer = 0 **não** significa que o lote saiu da câmara.

Distinguir: `READY_FOR_OVEN` ≠ `PROOFING_COMPLETED`

---

## 45. Isso é importante

| Momento | Estado |
|---------|--------|
| 14:05 | READY FOR OVEN |
| 14:11 (transferido) | PROOFING COMPLETED |

Permite medir espera entre processos.

---

## 46. FORNEAMENTO

```
SCAN QR → FERMENTAÇÃO → FORNO → SELECIONAR FORNO
  → TEMPERATURA PROGRAMADA → TEMPO PROGRAMADO
```

---

## 47. Entrada no forno

```
FORNEAMENTO · PH26082601 · Pão Hambúrguer 90g
FORNO [ FORNO 01 ] · TEMPERATURA 180°C · TEMPO 14 min
[ INICIAR FORNEAMENTO ]
```

Temperatura e tempo vêm da configuração do produto quando disponíveis.

---

## 48. Não exigir digitação de 180

Se o padrão está configurado, aparece pronto. Operador altera somente se a regra permitir.

---

## 49. Dados reais

Separar: temperatura programada · temperatura real · tempo programado · tempo real.

---

## 50. Finalização do forno

```
BAKING IN_PROGRESS → COMPLETE → COOLING READY
```

---

## 51. RESFRIAMENTO

Ao finalizar o forno, segue automaticamente. Exemplo: 60 min; possibilidade de bloquear embalagem antes do mínimo.

---

## 52. Resfriamento

```
RESFRIAMENTO · PH26082601
Início 14:28 · Tempo mínimo 60 min · Liberação 15:28
38:42 · ● EM RESFRIAMENTO
```

---

## 53. Bloqueio

Antes do mínimo:

```
EMBALAGEM BLOQUEADA
Liberação em 38 min
```

---

## 54. Não usar apenas botão desabilitado

Explicar:

```
AGUARDANDO RESFRIAMENTO
Tempo mínimo ainda não atingido.
```

---

## 55. Ao atingir mínimo

`READY_FOR_PACKAGING` — **não** significa que embalagem começou.

---

## 56. EMBALAGEM

```
COOLING → READY FOR PACKAGING → SCAN → PACKAGING IN_PROGRESS
  → REGISTER RESULT → PACKAGING COMPLETED → LOT COMPLETED
```

---

## 57. Entrada

```
EMBALAGEM · PH26082601 · Pão Hambúrguer 90g
✓ RESFRIAMENTO CONCLUÍDO
Quantidade recebida [ 986 ]
[ INICIAR EMBALAGEM ]
```

---

## 58. Finalização

```
FINALIZAR EMBALAGEM
Recebido 986 · Embalado [ 970 ] · Perda 16
Pacotes [ 97 ] · Peso médio [ 900 ] g
Fabricação 28/08/2026 · Validade [ ... ] · Lote impresso [ PH26082601 ]
[ FINALIZAR LOTE ]
```

---

## 59. Lote concluído

Quando condições obrigatórias satisfeitas: `LOT → COMPLETED`

Registrar: `completedAt` · `finalQuantity` · `totalLoss` (quando aplicável).

---

## 60. Tela de sucesso

```
✓ LOTE CONCLUÍDO
PH26082601 · 970 unidades embaladas
[ PRÓXIMO LOTE ]
```

Sem dashboard, gráfico ou relatório. O operador precisa continuar.

---

## 61. Transições automáticas × humanas

| Tipo | Exemplo |
|------|---------|
| **Automática** | MIXING COMPLETED → MODELING READY |
| **Humana** | MODELING READY + INICIAR → MODELING IN_PROGRESS |
| **Temporal** | COOLING IN_PROGRESS + TEMPO MÍNIMO → READY_FOR_PACKAGING |

---

## 62. Não confundir “ready” com “completed”

Fermentação e Resfriamento: tempo necessário terminou, mas transferência física ainda pode não ter acontecido.

---

## 63. Espera entre processos

```
Modelagem terminou 08:44
Embandejamento iniciou 08:49
ESPERA 5 min
```

Valioso para gargalos.

---

## 64. Process Time × Waiting Time

Separar:

| Tipo | Exemplo |
|------|---------|
| PROCESS TIME | Fermentação 300 min |
| QUEUE / WAIT TIME | Esperando forno 18 min |

Evita culpar o processo errado.

---

## 65. Bottleneck

Cockpit (futuro):

```
GARGALO ATUAL · FORNEAMENTO
3 lotes aguardando · Tempo médio de espera +18 min
```

Material pede análise de gargalos e tempos médios por processo.

---

## 66. BLOCKED

```
PH26082601 · BLOQUEADO
Motivo: Aguardando avaliação de qualidade
```

---

## 67. Bloqueio não é atraso

Separar `LATE` de `BLOCKED`. Lote bloqueado pode naturalmente ultrapassar o tempo.

---

## 68. Ocorrência ≠ bloqueio automático

`OCCURRENCE` pode ou não gerar `BLOCKED`, conforme categoria/regra.

---

## 69. Qualidade

Material prevê: lotes rejeitados · retrabalho · ocorrências — sem detalhar workflow.

**Não inventar** regras de aprovação/reprovação neste documento. Módulo próprio.

---

## 70. Correção de etapa

Operador comum **não** deve simplesmente “VOLTAR PARA ETAPA ANTERIOR” — destrói consistência.

---

## 71. Correção administrativa

```
SOLICITAR CORREÇÃO → SUPERVISOR → JUSTIFICATIVA → CORREÇÃO → AUDIT LOG
```

---

## 72. Nunca apagar evento para “corrigir”

Preferir: evento original + correção. Não `delete` evento.

---

## 73. Duplo clique

Botão FINALIZAR deve ser **idempotente**. Dois toques ≠ 2 eventos.

---

## 74. Operation ID

Ações críticas: `operationId` único por submissão. Backend rejeita repetição.

---

## 75. Concorrência

Dois tablets no mesmo lote READY FOR OVEN: somente um inicia.

---

## 76. Validação transacional

```
currentStep == BAKING AND stepStatus == READY → START BAKING
senão → ESTE LOTE JÁ FOI INICIADO EM OUTRO DISPOSITIVO.
```

---

## 77. Equipamento ocupado

```
FORNO 01 · EM USO · PH26082604 · 12 min restantes
```

Não permitir seleção. Capacidade configurável.

---

## 78. Câmara pode suportar múltiplos lotes

Não assumir `1 equipamento = 1 lote`. Modelar `capacityMode` (ou equivalente) posteriormente.

---

## 79. Equipment assignment

Ao iniciar etapa que exige equipamento: registrar `stepRun.equipmentId` (rastreabilidade).

---

## 80. Operator assignment

Registrar `stepRun.operatorId`.

---

## 81. Troca de operador

Processo longo: não sobrescrever simplesmente. Possível histórico `OPERATOR_ASSIGNED` / `OPERATOR_CHANGED` — só se necessário.

---

## 82. Station context

Tablet em AMASSAMENTO + lote em FERMENTAÇÃO:

```
LOTE EM OUTRA ETAPA
Etapa atual FERMENTAÇÃO
Este tablet está configurado para AMASSAMENTO.
```

---

## 83. Não permitir ação errada

Não mostrar `[ INICIAR AMASSAMENTO ]` nesse caso.

---

## 84. QR é identidade, não permissão

Escanear QR só identifica o lote. Workflow decide o que pode acontecer.

---

## 85. KDS TV

TV principal: produção do dia — lote, produto, etapa, início, previsto, atraso, status. **Read-only.**

---

## 86. Exemplo

```
PRODUÇÃO AO VIVO
LOTE        PRODUTO        ETAPA          TEMPO       STATUS
PH26082601  Hambúrguer     Fermentação    04:18       ● NO PADRÃO
HD26082602  Hot Dog        Forno           +03 min     ● ATRASADO
PF26082603  Forma          Modelagem       12 min      ● NO PADRÃO
```

---

## 87. Linguagem de status

Floor: NO PADRÃO · ATENÇÃO · ATRASADO · AGUARDANDO · BLOQUEADO · CONCLUÍDO

Não expor `IN_PROGRESS` / `READY` / `BLOCKED` crus ao operador.

---

## 88. Status visual

| Cor | Uso |
|-----|-----|
| Verde | No padrão |
| Amarelo | Atenção |
| Vermelho | Atrasado / crítico |
| Cinza | Aguardando |
| Laranja DC | Ação / seleção / processo ativo |

Cor + texto/ícone. Nunca só cor.

---

## 89. Alertas

Responder: **O QUÊ? · ONDE? · HÁ QUANTO TEMPO? · O QUE FAZER?**

---

## 90. Exemplo bom

```
FERMENTAÇÃO CONCLUÍDA
PH26082601 · Câmara 01
Pronto há 6 min.
Mover para forneamento.
```

---

## 91. Exemplo ruim

```
ALERTA 1024
```

---

## 92. Alertas não bloqueiam indiscriminadamente

Atraso de outro lote não interrompe a tela de quem está finalizando. Usar fila de atenção/contexto.

---

## 93. Eventos mínimos

```
LOT_RELEASED
STEP_READY · STEP_STARTED · STEP_COMPLETED
LOT_BLOCKED · LOT_UNBLOCKED
OCCURRENCE_CREATED
LOT_COMPLETED
```

+ eventos específicos quando necessários.

---

## 94. Event payload

```
ProductionEvent {
  id
  lotId
  productionOrderId
  type
  stepType?
  operatorId?
  stationId?
  equipmentId?
  occurredAt
  operationId?
  metadata?
}
```

---

## 95. StepRun

```
LotStepRun {
  id
  lotId
  routeStepId
  stepType
  sequence
  status
  timingStatus
  stationId?
  equipmentId?
  operatorId?
  standardDurationMinutes
  toleranceMinutes?
  readyAt?
  startedAt?
  expectedFinishAt?
  finishedAt?
  inputQuantity?
  outputQuantity?
  lossQuantity?
  createdAt
  updatedAt
}
```

---

## 96. Snapshot de padrão

`standardDurationMinutes` copiado para a execução. Não consultar eternamente a config atual — histórico correto se o padrão mudar amanhã.

---

## 97. Firebase transaction — início

```
TRANSACTION
1. Ler lote
2. Ler step
3. Validar READY
4. Validar equipamento
5. Atualizar step → IN_PROGRESS
6. Atualizar current state do lote
7. Criar evento
```

Se falhar: nenhuma transição parcial.

---

## 98. Finalização

```
TRANSACTION
1. validar step atual
2. validar dados obrigatórios
3. fechar step
4. calcular resultados
5. criar evento
6. preparar próximo step
7. atualizar lote
```

---

## 99. Transição de etapa

```
MODELING IN_PROGRESS → COMPLETE → MODELING COMPLETED + TRAYING READY
```

Pode ocorrer na mesma operação lógica.

---

## 100. Offline

Resiliente, mas transições críticas offline exigem cuidado. Cache Firebase sozinho **não** resolve concorrência industrial.

---

## 101. Indicador de conexão

```
● ONLINE          (discreto)
SEM CONEXÃO       (algumas ações indisponíveis)
```

---

## 102. Nunca esconder pendência de sincronização

```
SINCRONIZAÇÃO PENDENTE
```

deve ser perceptível.

---

## 103. Não permitir cadeia insegura

Offline: finalizar fermentação → forno → resfriamento sem confirmação do servidor = divergência grave.

Limites no documento técnico de offline.

---

## 104. Fluxo completo

```
                 OP IMPORTADA DO GESTOR
                          │
                       VALIDADA → LIBERADA
                          ▼
                  ┌───────────────┐
                  │ AMASSAMENTO   │ READY → START → IN_PROGRESS → COMPLETE
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │ MODELAGEM     │
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │ EMBANDEJ.     │
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │ FERMENTAÇÃO   │ → TIMER → READY FOR OVEN
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │ FORNEAMENTO   │
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │ RESFRIAMENTO  │ → MIN TIME → READY FOR PACKAGING
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │ EMBALAGEM     │ → COMPLETED
                  └───────────────┘
```

---

## 105. O que não está decidido

O Cursor **não** deve inventar respostas para:

- Batida = lote?
- Quem gera lote: gestor ou Factory OS?
- Abastecimento/Pesagem será etapa independente?
- Modelagem e Embandejamento: tempos separados ou compartilham padrão?
- Quem mantém a ficha técnica?
- Quem define número de batidas?
- Quais etapas podem ser puladas por produto?
- Quais equipamentos possuem capacidade múltipla?
- Quais ocorrências bloqueiam lote?
- Quem pode desbloquear?
- Quando uma produção pode ser cancelada?
- Quais transições podem funcionar offline?

Permanecem como **decisões pendentes** até validação.

---

## 106. Critério de sucesso

Ao escanear `PH26082601`, o Factory OS deve responder imediatamente:

- O que é?
- Onde está?
- Em qual etapa?
- Quando entrou?
- Quanto tempo está nela?
- Está dentro do padrão?
- Qual equipamento?
- Qual operador?
- Quanto produziu?
- Quanto perdeu?
- Qual é a próxima etapa?
- Existe algo bloqueando?

E, depois de concluído, todo esse histórico deve alimentar a rastreabilidade exigida pelo material.
