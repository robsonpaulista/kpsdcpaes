# DOCUMENTO 08 — KDS STATIONS

**DC Pães · Factory OS**

| | |
|---|---|
| **Versão** | 1.0 |
| **Objetivo** | Definir o contrato funcional de cada estação do chão de fábrica |
| **Base** | Documento 06 — Workflow + Documento 07 — KDS Operator UX |
| **Princípio** | Define o que cada estação recebe, registra, valida e entrega. Não repete regras gerais de interface. |

---

## 1. Arquitetura das estações

Cada estação funciona sobre o mesmo conceito:

```
LOTE DISPONÍVEL
      ↓
IDENTIFICAÇÃO POR QR
      ↓
VALIDAÇÃO DA ETAPA
      ↓
EXECUÇÃO
      ↓
APONTAMENTO
      ↓
FINALIZAÇÃO
      ↓
PRÓXIMA ETAPA READY
```

O projeto original prevê estações distribuídas entre pesagem/amassadeira, modelagem/embandejamento, fermentação, forno, resfriamento/embalagem e embalagem, todas convergindo para a base central e painel de gestão.

---

## 2. Contrato comum

Toda estação deve conhecer apenas o necessário:

```
StationContext {
  stationId
  stationType
  operatorId
  allowedStepTypes
  equipmentIds
}
```

Ao ler um lote:

```
ESTAÇÃO + LOTE + ESTADO ATUAL = AÇÃO PERMITIDA
```

A estação **nunca** altera arbitrariamente `currentStep`. Ela envia um comando ao workflow.

---

## 3. KDS 01 — PESAGEM / AMASSADEIRA

O documento original agrupa operacionalmente pesagem/amassadeira na arquitetura, enquanto o detalhamento do KDS concentra-se na Amassadeira.

> A separação entre Pesagem/Abastecimento e Amassamento permanece **configurável** até validação com a fábrica.

### Recebe

- OP · Lote · Produto · Batida
- Ficha técnica · Ingredientes planejados · Quantidades planejadas

### Operador registra

- Confirmação dos ingredientes
- Lotes dos ingredientes, se aplicável
- Quantidade utilizada, quando exigida
- Equipamento · Início · Fim · Ocorrência, se houver

O material prevê quantidades planejadas e utilizadas e recomenda registrar os lotes de origem dos ingredientes.

### Antes de iniciar

Validar:

- ✓ lote correto
- ✓ etapa correta
- ✓ ingredientes obrigatórios conferidos
- ✓ equipamento compatível

### Durante

```
TIMER · 12:00 padrão do exemplo
NO PADRÃO → ATENÇÃO → ATRASADO
```

Tempos reais por produto; **12 min não hardcoded** globalmente.

### Finalização

```
completeStep("MIXING")

AMASSAMENTO COMPLETED → MODELAGEM READY
```

Transferência automática para o KDS da Modelagem prevista no material.

---

## 4. KDS 02 — MODELAGEM

### Recebe

Lote · Produto · Quantidade esperada · Tempo padrão · Batida/origem (quando aplicável)

### Registra

```
startedAt · finishedAt
expectedQuantity · producedQuantity · lossQuantity · lossPercentage
operatorId · equipmentId
```

### Cálculo

```
ESPERADO 1.000 → PRODUZIDO 986 → PERDA 14 → 1,4%
```

Não exigir entrada manual redundante.

### Finalização

```
MODELAGEM COMPLETED → EMBANDEJAMENTO READY
```

---

## 5. KDS 03 — EMBANDEJAMENTO

Pode compartilhar dispositivo físico com Modelagem, mas continua sendo etapa lógica distinta se a operação confirmar.

### Recebe

Lote · Produto · Quantidade produzida na Modelagem

### Registra

Quantidade · Número de bandejas · Entrada · Finalização · Operador

Exemplo material: 986 unidades · 42 bandejas · horário de entrada.

### Finalização

```
EMBANDEJAMENTO COMPLETED → FERMENTAÇÃO READY
```

### Pendência

Divergência na documentação sobre o tempo desta etapa. **Não consolidar valor** até validação.

---

## 6. KDS 04 — FERMENTAÇÃO

Estação **multi-lote**. Ao contrário da Amassadeira, acompanha simultaneamente o que está nas câmaras.

### Entrada

```
ESCANEIA QR → SELECIONA CÂMARA → INICIA
```

Sistema registra: `lotId` · `chamberId` · `startedAt` · `standardDuration` · `expectedFinishAt`

---

## 7. Monitor da Fermentação

Prioridade:

```
1. ATRASADOS
2. PRONTOS
3. ATENÇÃO
4. NO PADRÃO
```

Cada lote mostra apenas:

```
CÂMARA 01
PÃO HAMBÚRGUER 90g · PH26082601
00:42 · NO PADRÃO
```

Não transformar em tabela administrativa no tablet.

---

## 8. Estados temporais da Fermentação

```
EM FERMENTAÇÃO
  ↓ 15 MIN RESTANTES
ATENÇÃO
  ↓ TEMPO PREVISTO ATINGIDO
PRONTO PARA FORNO
  ↓ TEMPO EXCEDIDO
ATRASADO
```

Aviso de 15 minutos e alerta de lote pronto previstos na especificação.

---

## 9. Fermentação não movimenta fisicamente o lote

Quando o tempo termina: `READY_FOR_OVEN` — **não** `BAKING`.

O lote só entra em forneamento quando a estação do forno confirmar a chegada.

```
PRONTO ≠ TRANSFERIDO
```

---

## 10. KDS 05 — FORNEAMENTO

### Recebe

Somente lotes `READY_FOR_OVEN`

### Fluxo

```
SCAN QR → VALIDAR FERMENTAÇÃO → SELECIONAR FORNO
  → CARREGAR PARÂMETROS → INICIAR
```

### Registra

```
ovenId
programmedTemperature · actualTemperature?
programmedDuration · actualDuration
startedAt · finishedAt · operatorId
```

---

## 11. Parâmetros do Forno

Se produto possui Temperatura 180°C · Tempo 14 min → carregar automaticamente.

Operador não redigita parâmetros padrão em toda produção.

Alteração permitida: preservar **PROGRAMADO** e **REAL**.

---

## 12. Capacidade do equipamento

Não assumir `1 forno = 1 lote` nem `1 câmara = 1 lote` até conhecer capacidade real.

Configuração futura: **EXCLUSIVO** ou **MULTI-LOTE**.

Cadastro previsto: amassadeiras, modelagem, câmara, fornos, embalagem.

---

## 13. Finalização do forno

```
BAKING COMPLETED → COOLING
```

Transição especial: o relógio do resfriamento pode começar automaticamente a partir de `finishedAt` do forno — **validar com processo físico real**.

---

## 14. KDS 06 — RESFRIAMENTO

Estação predominantemente de **controle temporal**.

### Recebe

Lote · Produto · Horário de saída do forno · Tempo mínimo de resfriamento

### Calcula

`startedAt` · `releaseAt` · `remainingTime`

### Estado

`COOLING` enquanto `now < releaseAt`

---

## 15. Gate de embalagem

Antes da liberação:

```
PACKAGING = BLOCKED BY COOLING TIME
```

Quando atingir `releaseAt` → `READY_FOR_PACKAGING`

Material prevê impedir embalagem antes do tempo mínimo.

---

## 16. Resfriamento pode não precisar de interação

Se operação confirmar `saída do forno = início do resfriamento`: **não** exigir `[ INICIAR RESFRIAMENTO ]` — clique artificial. O sistema inicia o relógio.

---

## 17. KDS 07 — EMBALAGEM

Só aceita `READY_FOR_PACKAGING`

### Entrada

```
SCAN QR → VALIDAR RESFRIAMENTO → INICIAR EMBALAGEM
```

### Registra

Quantidade recebida · embalada · Perda · Pacotes · Peso médio · Fabricação · Validade · Lote impresso

---

## 18. Dados automáticos na Embalagem

Não pedir informação já conhecida.

Exemplo: quantidade recebida = `outputQuantity` da etapa anterior (quando válido). Fabricação = data da produção (quando regra oficial).

Validade automática **somente** com regra confiável por produto.

---

## 19. Fechamento

```
PACKAGING COMPLETED → LOT COMPLETED
```

Registrar resultado final **sem destruir** resultados intermediários.

---

## 20. Fluxo entre estações

```
ESTAÇÃO A → COMPLETE → PRÓXIMA ETAPA READY → ESTAÇÃO B
```

A estação seguinte enxerga o lote automaticamente. PCP **não** libera manualmente cada transferência normal.

---

## 21. Fila de cada estação

Derivada de:

```
currentStep + stepStatus + station capabilities
```

Exemplos: Amassadeira → `MIXING + READY` · Forno → `BAKING + READY` · Embalagem → `PACKAGING + READY`

---

## 22. Ordenação da fila

Não inventar regra única. Inicialmente: urgência temporal + ordem de disponibilidade. Prioridade de OP / horário / PCP a validar.

---

## 23. Operador não arrasta lotes

Não drag-and-drop para movimentar produção. Workflow determina a transição. Evento = `FINALIZAR ETAPA` — não arrastar card para FORNO.

---

## 24. Equipamentos

Toda estação que usa equipamento registra `equipmentId`.

Exemplos do material (não hardcoded): AM01 / AM02 · MD01 · CF01 · FO01 / FO02 · EM01

---

## 25. Estação ≠ equipamento

| Conceito | Significado | Exemplo |
|----------|-------------|---------|
| **STATION** | Contexto operacional / interface | FORNO |
| **EQUIPMENT** | Recurso físico | FO01 · FO02 |

---

## 26. Ocorrência

Qualquer estação pode gerar:

```
Occurrence {
  lotId
  stepType
  stationId
  equipmentId?
  operatorId
  category
  reason?
  notes?
  occurredAt
}
```

Não exigir observação longa para toda ocorrência.

---

## 27. Parada de equipamento

```
EQUIPAMENTO FO01 · OCORRÊNCIA PARADA
```

Alimenta indicadores: tempo operando · paradas · indisponibilidade.

---

## 28. Dados que todas as etapas devem gerar

```
lotId · stepType
readyAt? · startedAt · finishedAt
operatorId · stationId · equipmentId?
status · timingStatus
operationId
+ campos específicos da etapa
```

---

## 29. Não criar documentos isolados demais

Evitar: `mixing_results` · `modeling_results` · `proofing_results` · … sem necessidade.

Preferir estrutura comum:

```
LotStepRun
```

com metadata/result tipado por etapa quando necessário. Simplifica timeline e rastreabilidade.

---

## 30. Matriz final das estações

| Estação | Entrada principal | Apontamento-chave | Saída |
|---------|-------------------|-------------------|-------|
| Pesagem/Amassadeira | Receita + ingredientes | Conferência + tempo | Modelagem |
| Modelagem | Quantidade esperada | Produzido + perda | Embandejamento |
| Embandejamento | Quantidade modelada | Bandejas + tempo | Fermentação |
| Fermentação | Lote + câmara | Entrada + tempo | Pronto para forno |
| Forno | Lote + forno | Temperatura + tempo | Resfriamento |
| Resfriamento | Saída do forno | Tempo mínimo | Liberado embalagem |
| Embalagem | Quantidade recebida | Embalado + perdas + pacotes | Lote concluído |

---

## 31. O KDS principal da fábrica

Factory Display (somente leitura):

```
PRODUÇÃO DO DIA
LOTE          ETAPA          TEMPO       STATUS
PH26082601    Fermentação    00:12       ATENÇÃO
HD26082603    Forno          +03 min     ATRASADO
PF26082602    Modelagem      08:42       NO PADRÃO
```

TV principal com lote, produto, etapa, início, previsto, atraso e status = requisito do material.

---

## 32. Regra para o Cursor

Ao implementar uma nova estação, responder antes:

1. Qual `stepType` ela executa?
2. Quais lotes podem entrar?
3. Quais dados ela recebe automaticamente?
4. O que o operador realmente precisa informar?
5. Existe equipamento?
6. Existe timer?
7. Quais campos são obrigatórios para concluir?
8. Qual é a próxima etapa?
9. Existe bloqueio?
10. Quais eventos serão registrados?

Se alguma resposta não estiver documentada: **não inventar regra industrial**.

---

## 33. Resultado

Factory Floor sobre arquitetura comum:

```
                    FACTORY FLOOR
                          │
                     QR / FILA
                          ▼
                  WORKFLOW ENGINE
        ┌─────────────────┼──────────────────┐
   AMASSAMENTO       MODELAGEM          EMBANDEJ.
        └─────────────────┼──────────────────┘
                          ▼
                     FERMENTAÇÃO → FORNO → RESFRIAMENTO → EMBALAGEM
                          ▼
                    LOTE CONCLUÍDO
                ┌─────────┴─────────┐
          RASTREABILIDADE       COCKPIT
```

Fecha a especificação operacional do KDS sem transformar cada estação em um pequeno sistema independente.
