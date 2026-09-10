# DOCUMENTO 10 — TRACEABILITY + QUALITY

**DC Pães · Factory OS**

| | |
|---|---|
| **Versão** | 1.0 |
| **Área** | Rastreabilidade · Qualidade · Perdas · Ocorrências |
| **Plataforma prioritária** | Cockpit Desktop/Tablet |
| **Origem dos dados** | Execução nos KDS + OP importada + produtos/fichas + equipamentos + operadores |

---

## 1. Objetivo

O sistema precisa partir de um lote acabado e reconstruir sua história industrial:

```
LOTE FINAL
   ↓
OP → PRODUTO → MATÉRIAS-PRIMAS / LOTES
   ↓
AMASSAMENTO → MODELAGEM → EMBANDEJAMENTO
   ↓
FERMENTAÇÃO → FORNO → RESFRIAMENTO → EMBALAGEM
   ↓
QUANTIDADES / PERDAS / OCORRÊNCIAS
```

A especificação original pede rastreabilidade contendo produto, OP, data de produção, lotes de ingredientes, equipamentos, operadores, tempos, produção planejada/final e perdas.

---

## 2. Princípio

Rastreabilidade **não** deve ser preenchida novamente no fim da produção.

Ela é construída automaticamente durante a execução.

```
EXECUTAR → REGISTRAR EVENTO → CONSTRUIR HISTÓRICO → RASTREABILIDADE
```

Cada KDS alimenta a história do lote. Evita um segundo processo administrativo de apontamento.

---

## 3. Entrada da rastreabilidade

Rota: `/app/traceability`

```
RASTREABILIDADE
Encontre qualquer lote produzido.

[ Buscar lote, OP ou produto... ]
[ ESCANEAR QR ]

PRODUÇÕES RECENTES
```

---

## 4. Busca principal

Prioridade: **LOTE · QR · OP**

Busca por produto é secundária (muitos resultados).

---

## 5. QR no Cockpit

Se câmera disponível: `[ ESCANEAR QR ]` → `/app/traceability/:lotId`

O mesmo QR do chão de fábrica identifica o lote para consulta. O documento-base prevê produto, lote, OP e QR na identificação física.

---

## 6. Resultado da busca

```
PH26082601 · PÃO HAMBÚRGUER 90g
OP 260826-001 · Produção 26 AGO 2026 · ● CONCLUÍDO
```

A primeira tela confirma inequivocamente o lote correto.

---

## 7. Lot Detail é a fonte única

Não criar Lot Detail e Traceability Detail como duas implementações.

Usar a mesma entidade/timeline. O modo rastreabilidade apenas expõe mais detalhes históricos.

---

## 8. Cabeçalho

```
PÃO HAMBÚRGUER 90g · PH26082601
OP 260826-001 · 26 AGO 2026 · ● CONCLUÍDO

PLANEJADO 1.000 · PRODUZIDO 970 · PERDA 30 (3,0%)
```

Fórmula e denominador de perda seguem definição operacional validada.

---

## 9. Organização da tela

Desktop:

```
┌────────────────────────────────────────────────────┐
│ PRODUTO · LOTE · OP · DATA · KPIs                  │
├─────────────────────────────┬──────────────────────┤
│ HISTÓRICO DO PROCESSO       │ RESUMO DO LOTE       │
│ Timeline (protagonista)     │ Ingredientes         │
│                             │ Perdas · Ocorrências │
│                             │ Resultado final      │
└─────────────────────────────┴──────────────────────┘
```

---

## 10. Timeline completa

```
✓ AMASSAMENTO      08:10 → 08:22 · 12 min · NO PADRÃO · AM02 · João
  │ Espera: 03 min
✓ MODELAGEM        08:25 → 08:44 · 19 min · 986 un. · Perda 14 · 1,4% · MD01
  │ Espera: 01 min
✓ EMBANDEJAMENTO   08:45 → 09:00 · 42 bandejas
✓ FERMENTAÇÃO      Câmara 01 · 09:05 → 14:05
  │ Aguardou forno: 06 min
✓ FORNEAMENTO      FO02 · 180°C · 14 min
✓ RESFRIAMENTO     60 min
✓ EMBALAGEM        EM01 · Recebido 986 · Embalado 970
● LOTE CONCLUÍDO
```

---

## 11. Espera entre processos

Preservar **PROCESS TIME** e **WAITING TIME** separadamente.

Permite descobrir se o problema foi a etapa ou a espera — alimenta gargalos no Cockpit.

---

## 12. Matérias-primas

```
MATÉRIAS-PRIMAS
Farinha   Planejado 50 kg · Utilizado 50,2 kg · Lote MP F260820
Água      Planejado 25 L  · Utilizado 25 L
Fermento  Planejado 1 kg  · Utilizado 1 kg · Lote MP FE260801
```

Especificação prevê quantidade planejada/utilizada e, idealmente, lote de origem do ingrediente.

---

## 13. Não inventar lote de matéria-prima

Se não apontado: `Lote de origem · NÃO INFORMADO`

Não usar `—` se puder ser lido como “não se aplica”. Ausência precisa ser perceptível.

---

## 14. Origem da ficha técnica

Decisão ainda aberta: gestor · Factory OS · híbrido?

Até resolver: preservar **snapshot** da configuração usada naquela produção. Alteração futura da receita não muda o lote retrospectivamente.

---

## 15. Equipamentos

Por etapa: AMASSAMENTO AM02 · MODELAGEM MD01 · FERMENTAÇÃO CF01 · FORNEAMENTO FO02 · EMBALAGEM EM01

Especificação prevê rastreamento e indicadores por equipamento.

---

## 16. Operadores

Quem executou cada etapa — informação de rastreabilidade, **não** avaliação de funcionário.

---

## 17. Perdas

Com contexto:

```
MODELAGEM   14 un. · 1,4% · Motivo a definir / informado
EMBALAGEM   16 un. · 1,6%
```

Não só “30 unidades”.

---

## 18. Visão consolidada

```
PERDAS DO LOTE · TOTAL 30 un.
MODELAGEM 14 · EMBALAGEM 16
```

Material requer análise por produto, processo e linha de embalagem.

---

## 19. Motivos de perda

Catálogo futuro — não inventar motivos reais da DC Pães agora.

```
LossReason {
  id · code · label · applicableSteps[] · active
}
```

---

## 20. Qualidade

Material prevê: lotes rejeitados · retrabalho · ocorrências — sem descrever processo operacional.

**Não inventar** workflow de qualidade completo.

---

## 21. Qualidade V1

Preparar arquitetura para: OCORRÊNCIAS · BLOQUEIO · REPROVAÇÃO · RETRABALHO

Implementar somente o validado operacionalmente.

---

## 22. Ocorrências

Rota: `/app/quality/incidents`

```
OCORRÊNCIAS · ABERTAS 3 · HOJE 7
PH26082601 · FORNO · FO01 · Falha de equipamento · 14:22 · ● ABERTA
```

---

## 23. Detail da ocorrência

```
OCORRÊNCIA
Lote PH26082601 · Produto Hambúrguer · Etapa FORNEAMENTO
Equipamento FO01 · Registrado por João · 14:22
Descrição ... · STATUS ABERTA
```

---

## 24. Severidade

Estrutura pode suportar `severity?: string` — valores configurados depois. Não inventar níveis sem processo.

---

## 25. Ocorrência ≠ bloqueio

Registrar ocorrência **não** bloqueia lote automaticamente. Ações distintas.

---

## 26. Bloqueio

Quando regra validada exigir:

```
LOTE BLOQUEADO
Motivo Problema de qualidade · Desde 14:22
Responsável ... · Aguardando liberação.
```

---

## 27. Liberação

Não só `[ DESBLOQUEAR ]`. Preferir:

```
[ LIBERAR LOTE ] → Motivo da liberação [ ... ] → [ CONFIRMAR LIBERAÇÃO ]
```

Ação auditável. Permissão no Documento 11.

---

## 28. Não apagar ocorrência

```
ABERTA → RESOLVIDA
```

Registro permanece na timeline.

---

## 29. Correções

Se corrigir `986 → 984`: não apagar valor original. Registrar anterior · novo · quem · quando · motivo.

---

## 30. Audit trail

Ações críticas:

```
AuditEvent {
  actorId · action · entityType · entityId
  before? · after? · reason? · occurredAt
}
```

Implementação conforme estrutura Firebase existente.

---

## 31. Relatório de rastreabilidade

Futuro: `[ GERAR RELATÓRIO ]` com produto, lote, OP, data, ingredientes, lotes de origem, etapas, tempos, equipamentos, operadores, quantidades, perdas, ocorrências, resultado final.

PDF **não** bloqueia MVP operacional.

---

## 32. Consulta reversa

Futuro:

```
LOTE DE FARINHA F260820 → QUAIS PRODUTOS USARAM? → PH26082601 · ...
```

Consequência de `IngredientUsage` correto. Interface posterior.

---

## 33. Quality Dashboard

Evitar dashboard enorme. Inicialmente:

```
QUALIDADE
OCORRÊNCIAS ABERTAS 3 · LOTES BLOQUEADOS 1 · PERDA DO DIA 1,8%
ATENÇÃO ... · PERDAS POR PROCESSO ...
```

---

## 34. Fonte única

Cockpit · Produção · Qualidade · Rastreabilidade · Equipamentos derivam dos mesmos fatos:

```
ProductionOrder · ProductionLot · LotStepRun · ProductionEvent
IngredientUsage · ProductionLoss · Occurrence · Equipment
```

Sem cópias independentes dos mesmos fatos.

---

## 35. Critério de sucesso

Ao pesquisar `PH26082601`, o sistema responde:

- O que foi produzido?
- De qual OP veio?
- Quando?
- Com quais matérias-primas?
- Em quais equipamentos?
- Quem executou?
- Quanto tempo levou?
- Onde esperou?
- Quanto foi perdido?
- Houve ocorrência?
- Quanto terminou embalado?

Esse é o núcleo do módulo de rastreabilidade previsto no material original.
