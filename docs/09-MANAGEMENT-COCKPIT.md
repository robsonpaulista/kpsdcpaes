# DOCUMENTO 09 — MANAGEMENT COCKPIT

**DC Pães · Factory OS**

| | |
|---|---|
| **Versão** | 1.0 |
| **Área** | Gestão · PCP · Supervisão |
| **Plataforma prioritária** | Desktop, com adaptação para tablet |
| **Objetivo** | Transformar os apontamentos do chão de fábrica em visão operacional, alertas e decisão |

O material-base exige indicadores de produção planejada × realizada, eficiência, tempos, perdas, gargalos, equipamentos e qualidade.

---

## 1. Conceito

O Cockpit não deve responder apenas: *“Quanto produzimos?”*

Ele precisa responder:

> **Como está a fábrica agora, onde existe problema e onde preciso agir?**

A Home é uma **central de comando**, não um conjunto genérico de gráficos.

---

## 2. Hierarquia da Home

```
PULSO DA FÁBRICA
        ↓
PRODUÇÃO DO TURNO
        ↓
FLUXO AO VIVO
        ↓
ATENÇÃO AGORA
        ↓
PERFORMANCE / GARGALOS
        ↓
PERDAS / EQUIPAMENTOS / QUALIDADE
```

A parte superior responde **agora**. A inferior explica **por quê**.

---

## 3. Estrutura visual

Desktop:

```
┌────────┬────────────────────────────────────────────┐
│        │ CENTRAL DE PRODUÇÃO        TURNO A  14:32 │
│ MENU   ├────────────────────────────────────────────┤
│        │ PULSO     PRODUÇÃO     PERDA     LOTES     │
│        ├──────────────────────┬─────────────────────┤
│        │ FLUXO AO VIVO        │ ATENÇÃO AGORA       │
│        ├──────────────────────┴─────────────────────┤
│        │ PERFORMANCE DAS LINHAS                     │
│        ├──────────────────────┬─────────────────────┤
│        │ GARGALOS             │ EQUIPAMENTOS        │
│        └──────────────────────┴─────────────────────┘
└────────┴────────────────────────────────────────────┘
```

Não fazer todos os blocos com exatamente a mesma altura e peso.

---

## 4. Pulso da Fábrica

```
PULSO DA FÁBRICA
94 / 100
OPERAÇÃO SAUDÁVEL
↑ 3 pts vs. turno anterior
```

Sintetiza o estado operacional.

> A **fórmula do Pulso não deve ser inventada agora**.

Inicialmente: componente no Design System com dados mockados claramente identificados. Fórmula depois de indicadores com dados confiáveis.

---

## 5. Possíveis componentes do Pulso

Futuramente poderá considerar: aderência ao planejado · lotes dentro do padrão · perdas · atrasos · equipamentos · qualidade.

Pesos ainda **não** definidos.

---

## 6. Produção do turno

```
PRODUÇÃO DO TURNO
42.680 unidades
Meta 50.000
████████████████░░░  85,4%
↑ 4,2% vs. mesmo horário ontem
```

Gamificação refinada: meta + progresso + movimento. **Não** pontos fictícios.

---

## 7. Planejado × realizado

Requisito explícito do material gerencial.

```
PLANEJADO 50.000 · REALIZADO 42.680 · ADERÊNCIA 85,4%
```

Sempre deixar claro o período: TURNO A · HOJE · SEMANA.

---

## 8. Indicadores superiores

Não colocar 10 KPI cards. Priorizar ~quatro:

**PULSO · PRODUÇÃO DO TURNO · ADERÊNCIA · PERDA**

+ contexto: 12 lotes ativos · 3 aguardando · 1 atenção.

---

## 9. Fluxo ao Vivo

Uma das áreas mais importantes.

```
FLUXO AO VIVO
AMASSAMENTO (3) → MODELAGEM (2) → FERMENTAÇÃO (7)
  → FORNO (3) → RESFRIAMENTO (4) → EMBALAGEM (2)
```

Com breakdown de status por etapa (normal / atenção / atrasado).

A TV operacional também exige visão instantânea dos lotes por etapa e status.

---

## 10. Fluxo não é só decoração

Cada etapa é interativa. Clique em `FERMENTAÇÃO · 7` abre **drawer** (não navega para outra página):

```
FERMENTAÇÃO · 7 lotes
ATENÇÃO · PH26082601 · 12 min restantes
ATENÇÃO · HD26082602 · +06 min
NO PADRÃO · ...
```

---

## 11. Produção Ao Vivo

Rota: `/app/cockpit/production` — visão operacional completa.

```
PH26082601 · PÃO HAMBÚRGUER 90g
FERMENTAÇÃO · Câmara 01 · 12 min restantes · ● ATENÇÃO
```

---

## 12. Atenção Agora

Mais importante que gráficos secundários.

```
ATENÇÃO AGORA                         4

01  FORNO · HD26082602 · Atrasado há 08 min
02  FERMENTAÇÃO · PH26082601 · Pronto para forno há 06 min
03  EQUIPAMENTO · FO01 · Parado há 14 min
04  PRODUÇÃO · OP 260826-008 · Início atrasado
```

---

## 13. Princípio da fila de atenção

Ordenar aproximadamente por: **criticidade + tempo + impacto**.

Fórmula definitiva depende das regras operacionais.

---

## 14. Alerta acionável

Cada item: **O QUÊ? · ONDE? · HÁ QUANTO TEMPO?** + contexto correto.

- Clique em lote → Lot Detail  
- Clique em equipamento → Equipment Detail  

---

## 15. Não criar central de notificações genérica

Atenção Agora é **operacional**.

Não misturar: usuário criado · configuração · sync concluída  
com: LOTE ATRASADO · FORNO PARADO · PERDA ACIMA DO PADRÃO.

---

## 16. Gargalo atual

Material pede identificação de gargalos e tempo médio por processo.

```
GARGALO ATUAL · FORNEAMENTO
3 lotes aguardando
Tempo médio de espera 18 min
↑ 6 min vs. média do turno
```

---

## 17. Process Time × Waiting Time

Nunca misturar tempo executando com tempo aguardando.

```
FERMENTAÇÃO
PROCESSO 5h02 · ESPERA P/ FORNO 18 min
```

Evita diagnóstico incorreto.

---

## 18. Performance dos processos

```
PERFORMANCE DO TURNO
01  EMBALAGEM      98%  ████████████████████
02  AMASSAMENTO    96%  ███████████████████░
03  MODELAGEM      93%  ██████████████████░░
04  FORNEAMENTO    84%  ████████████████░░░░
```

Não medalhas gigantes. `01, 02, 03` já criam ranking.

---

## 19. Não ranquear funcionários

Evitar MELHOR / PIOR OPERADOR.

Rankings permitidos: processos · linhas · equipamentos · produtos · turnos — quando dados forem comparáveis.

---

## 20. Sequência no padrão

```
SEQUÊNCIA NO PADRÃO
17 LOTES consecutivos sem atraso crítico
```

Só implementar quando definirmos o que quebra a sequência.

---

## 21. Meta operacional

```
META DO TURNO
42.680 / 50.000 · █████████████████░░░ · 85%
```

Projeção (“ritmo atual dentro da meta”) somente com cálculo confiável.

---

## 22. Perdas

Material pede perdas por produto, processo e linha de embalagem.

```
PERDA DO TURNO · 1,8% · ↓ 0,3 pp · Meta ≤ 2,0%
```

Meta vem de configuração real.

---

## 23. Detalhamento

```
PERDAS
Por processo: Modelagem 1,4% · Embalagem 0,4%
Por produto: Hambúrguer 1,2% · Hot Dog 2,1% · Forma 1,6%
```

---

## 24. Não usar gráfico por hábito

Se barra ordenada responde melhor: use barra. Não pizza/donut para tudo.

---

## 25. Evolução temporal

```
PERDA · ÚLTIMOS 7 DIAS
2,4 ─╮ · 2,1 ╰──╮ · 1,9 ╰─╮ · 1,8 ╰─
```

Sparkline ou linha simples.

---

## 26. Equipamentos

Material pede produção, atraso e paradas por máquina.

```
EQUIPAMENTOS · 12 operando · 2 disponíveis · 1 parado
```

---

## 27. Cards de equipamento

```
FO01 FORNO 01 · ● OPERANDO · PH26082601 · 08:42 restantes
AM02 AMASSADEIRA 02 · ● PARADA · 14 min · Falha registrada
```

---

## 28. Equipment Detail

```
FORNO 01 · FO01 · STATUS OPERANDO · LOTE PH26082601
HOJE: Disponibilidade 94% · Produções 18 · Paradas 2 · Tempo parado 27 min
```

Só métricas que realmente conseguirmos derivar.

---

## 29. Qualidade

```
QUALIDADE · 0 lotes rejeitados · 1 ocorrência aberta · 0 retrabalhos
```

Regras no [Documento 10](10-TRACEABILITY-QUALITY.md). Implementação técnica no [Documento 11](11-TECHNICAL-IMPLEMENTATION.md).

---

## 30. OPs importadas

```
ORDENS DE PRODUÇÃO
18 recebidas hoje · 12 em produção · 4 concluídas
1 aguardando configuração · 1 com alteração pendente
```

Integração **não** domina a Home quando saudável.

---

## 31. Problema de integração

Somente quando relevante:

```
ATENÇÃO · SISTEMA GESTOR
Última sincronização há 18 min · 3 tentativas com falha
[ ANALISAR ]
```

Produções já internalizadas continuam funcionando.

---

## 32. Lot Detail

Uma das telas mais importantes do Cockpit.

```
PH26082601 · PÃO HAMBÚRGUER 90g · OP 260826-001 · ● FERMENTAÇÃO
PLANEJADO 1.000 · ATUAL 986 · PERDA 1,4%
+ timeline
```

---

## 33. Timeline do lote

```
✓ AMASSAMENTO     08:10 → 08:22 · 12 min · NO PADRÃO · AM02
✓ MODELAGEM       08:25 → 08:44 · 986 un. · 1,4% perda · MD01
✓ EMBANDEJAMENTO  08:45 → 09:00 · 42 bandejas
● FERMENTAÇÃO     09:05 → 14:05 · Câmara 01 · 42 min restantes
○ FORNEAMENTO · ○ RESFRIAMENTO · ○ EMBALAGEM
```

Espinha dorsal da rastreabilidade.

---

## 34. Indicadores não calculados no componente

Não espalhar `completed / planned * 100` na UI.

```
UI → metrics service → aggregate/query → Firebase
```

---

## 35. Métricas com definição formal

Cada KPI posteriormente: NOME · DEFINIÇÃO · FÓRMULA · FONTE · PERÍODO · UNIDADE · REGRAS DE EXCLUSÃO

Especialmente: ADERÊNCIA · EFICIÊNCIA · PERDA · DISPONIBILIDADE · PULSO.

**Não inventar fórmulas** porque o nome parece óbvio.

---

## 36. Atualização em tempo real

Realtime prioritário: lotes ativos · etapas · atrasos · fila de atenção · equipamentos ativos · produção do turno.

Não listener em milhares de eventos históricos.

---

## 37. “Ao vivo”

Se a tela diz **AO VIVO**, o dado precisa estar atualizando. Senão: `Atualizado 14:32`.

---

## 38. Performance e Firebase

Evitar baixar todos os `ProductionEvents` para calcular dashboard no browser.

Conforme volume: `dailyMetrics` · `shiftMetrics` · `equipmentMetrics` · `productMetrics` — só quando necessário.

---

## 39. Filtros globais

Home: HOJE · TURNO A · TODOS OS PRODUTOS — simples.

Evitar 12 filtros na Home. Avançados nos módulos.

---

## 40. Comparação

Sempre informar base: `↑ 4,2% vs. turno anterior` · `↓ 0,3 pp vs. ontem`.

Nunca seta sem dizer comparação.

---

## 41. Gamificação aprovada

PULSO · META DO TURNO · SEQUÊNCIA NO PADRÃO · TOP PROCESSOS · MELHOR EVOLUÇÃO · RECORDE OPERACIONAL · PROGRESSO · RANKING — baseados em dados reais.

---

## 42. Gamificação proibida

XP · MOEDAS · LEVEL UP · AVATARES · CONFETE · BAÚ · MISSÕES.

Continua sendo sistema industrial.

---

## 43. Densidade

Cockpit mais denso que Floor — mas não card pequeno para tudo.

Massas visuais diferentes: PULSO grande · ATENÇÃO alto destaque · KPIs compactos · RANKING vertical · SPARKLINE discreto.

---

## 44. Responsividade

| Perfil | Experiência |
|--------|-------------|
| Desktop ≥1024 | Completa |
| Tablet | KPIs 2×2 · fluxo com scroll · Atenção full-width · rankings empilhados |
| Mobile Cockpit | Funcional, não prioritário |

Factory Floor continua sendo a experiência mobile principal.

---

## 45. Factory Display

Reutilizar **dados**, não necessariamente componentes do Cockpit.

```
DC PÃES · PRODUÇÃO AO VIVO · 12 LOTES ATIVOS
AMASS. 2 · MODEL. 3 · FERMENT. 4 · FORNO 1 · RESFR. 1 · EMBAL. 1

ATENÇÃO
PH26082601 · FERMENTAÇÃO · PRONTO HÁ 06 MIN
HD26082603 · FORNO · ATRASADO +03 MIN
```

Visão instantânea em TV = requisito do material.

---

## 46. Regra dos 5 segundos

Ao abrir a Home, em ~5 s:

> Como está a fábrica? Quanto produzimos? Existe atraso? Onde está o problema? Preciso agir agora?

Se precisar explorar três gráficos para descobrir isso, a Home falhou.

---

## 47. Estrutura final

```
CENTRAL DE PRODUÇÃO
├── PULSO DA FÁBRICA
├── PRODUÇÃO DO TURNO
├── FLUXO AO VIVO
├── ATENÇÃO AGORA
├── PERFORMANCE (processos · linhas · produtos)
├── GARGALOS
├── PERDAS
├── EQUIPAMENTOS
└── QUALIDADE
```

O Cockpit transforma os dados dos KDS em uma **narrativa operacional** da fábrica — não apenas um depósito de indicadores.
