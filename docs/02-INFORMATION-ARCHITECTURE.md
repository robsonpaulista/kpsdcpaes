# DOCUMENTO 02 — INFORMATION ARCHITECTURE & SCREEN MAP

**DC Pães · Sistema Integrado de Produção**

| | |
|---|---|
| **Versão** | 1.0 |
| **Status** | Arquitetura da Informação |
| **Público** | Produto · UX/UI · Engenharia · Cursor |
| **Backend** | Firebase existente do cliente |
| **Experiências** | Factory Cockpit · Factory Floor · Factory Display |

---

## 1. Objetivo deste documento

Este documento define:

- estrutura geral da aplicação;
- áreas funcionais;
- navegação;
- rotas;
- hierarquia das telas;
- experiência por dispositivo;
- relação entre telas gerenciais e operacionais;
- fluxo principal do lote;
- shells da aplicação.

> O Cursor deve usar este documento como referência **antes** de criar rotas ou menus.

---

## 2. Três experiências

A aplicação deverá possuir três shells principais.

```
DC PÃES FACTORY OS
├── FACTORY COCKPIT
│   Gestão / PCP / Supervisão
├── FACTORY FLOOR
│   Operação em tablets/mobile
└── FACTORY DISPLAY
    TV / painel operacional
```

**Não** reutilizar exatamente o mesmo shell visual nas três experiências.

---

## 3. FACTORY COCKPIT

**Prioridade:** Desktop → Tablet

**Usuários:** administrador, PCP, gerente, supervisor, qualidade, usuários de consulta.

```
COCKPIT
├── Visão Geral
├── Produção
│   ├── Ao Vivo
│   ├── Ordens de Produção
│   ├── Lotes
│   └── Histórico
├── PCP
│   ├── Programação / Hoje
│   ├── Ordens recebidas (sincronizadas)
│   ├── Validação / Atenção
│   └── Liberação para produção
├── Qualidade
│   ├── Visão Geral
│   ├── Perdas
│   ├── Ocorrências
│   ├── Retrabalhos
│   └── Reprovações
├── Equipamentos
│   ├── Visão Geral
│   ├── Equipamentos
│   ├── Paradas
│   └── Histórico
├── Rastreabilidade
├── Produtos
│   ├── Produtos
│   ├── Fichas Técnicas
│   └── Tempos Padrão
├── Relatórios
└── Configurações
    ├── Usuários
    ├── Perfis
    ├── Estações
    ├── Equipamentos
    ├── Motivos de perda
    └── Sistema
```

---

## 4. Navegação principal do Cockpit

Utilizar **sidebar vertical compacta**.

```
[ DC ]

⌂  Visão Geral
▣  Produção
◷  PCP
✓  Qualidade
◇  Equipamentos
⌁  Rastreabilidade
□  Produtos
▤  Relatórios
────────────
⚙  Configurações
```

A sidebar deve ser recolhível.

| Estado | Largura |
|--------|---------|
| Expandida | 220–240 px |
| Recolhida | 64–72 px |

---

## 5. Não criar sidebar com 15 opções

A navegação principal deve mostrar apenas **domínios**.

Subáreas aparecem: na própria página; em subnavigation; em tabs; ou menu secundário.

**Evitar** listar na sidebar: Produção ao vivo, Ordens, Lotes, Histórico, Planejamento, Programação, Perdas… todos simultaneamente.

---

## 6. Header global do Cockpit

```
DC PÃES / FACTORY OS          Turno A · ● Operação online · 28 AGO · 14:32 · [ Perfil ]
Visão Geral
```

| | |
|---|---|
| **Altura aproximada** | 60–64 px |

Pode apresentar: título da página; breadcrumb quando necessário; turno atual; status da conexão; perfil.

**Não** transformar header em área de KPIs.

---

## 7. Rota inicial

| Rota | Comportamento |
|------|----------------|
| `/app` | Redireciona conforme função do usuário |
| `/app/cockpit` | Preferencial para gestão / PCP / supervisão |
| `/app/floor` | Preferencial para operador associado a uma estação |

---

## 8. Mapa de rotas conceitual

```
/app

/app/cockpit
/app/cockpit/production
/app/cockpit/production/orders
/app/cockpit/production/orders/:orderId
/app/cockpit/production/lots
/app/cockpit/production/lots/:lotId
/app/cockpit/production/history

/app/pcp
/app/pcp/planning
/app/pcp/orders
/app/pcp/orders/:orderId
/app/pcp/schedule

# Fluxo principal NÃO é criação local de OP (Doc 05).
# /app/pcp/orders/new NÃO é rota padrão.

/app/quality
/app/quality/losses
/app/quality/incidents
/app/quality/rework
/app/quality/rejections

/app/equipment
/app/equipment/:equipmentId
/app/equipment/stops

/app/traceability
/app/traceability/:lotId

/app/products
/app/products/:productId
/app/products/:productId/technical-sheet
/app/products/:productId/process-standards

/app/reports

/app/settings
/app/settings/users
/app/settings/roles
/app/settings/stations
/app/settings/equipment
```

Os nomes exatos podem ser adaptados à estrutura existente do projeto.

---

## 9. Tela 01 — Visão Geral

| | |
|---|---|
| **Rota** | `/app/cockpit` |
| **Dispositivos** | `[DESKTOP]` `[TABLET]` |
| **Pergunta principal** | Como está a fábrica agora? |
| **Pergunta secundária** | O que precisa da minha atenção? |

---

## 10. Estrutura da Visão Geral

```
┌──────────────────────────────────────────────┐
│ PULSO DA FÁBRICA                            │
├──────────────────────────────────────────────┤
│ PRODUÇÃO DO TURNO                           │
├─────────────────────────┬────────────────────┤
│ FLUXO AO VIVO           │ ATENÇÃO AGORA     │
├─────────────────────────┼────────────────────┤
│ PERFORMANCE DAS LINHAS  │ GARGALOS           │
├─────────────────────────┼────────────────────┤
│ PERDAS                  │ EQUIPAMENTOS       │
└─────────────────────────┴────────────────────┘
```

Não precisa implementar todas as seções no MVP — mas **preservar essa arquitetura**.

---

## 11. Produção do turno

```
META          15.000 un.
PRODUZIDO     12.480 un.
████████████████░░░  83%
↑ comparação
```

Também pode mostrar: 18 lotes · 13 concluídos · 4 em produção · 1 em atenção.

---

## 12. Fluxo ao vivo

Um dos componentes mais importantes. Representar o fluxo físico:

```
PESAGEM (2) → AMASSAMENTO (3) → MODELAGEM (1) → FERMENTAÇÃO (4)
  → FORNO (2) → RESFRIAMENTO (3) → EMBALAGEM (1)
```

Cada número representa lotes na etapa.

---

## 13. Versão visual horizontal

Em desktop:

```
PESAGEM → AMASS. → MODELAGEM → FERMENT. → FORNO → RESFR. → EMBALAGEM
   2         3          1           4         2        3          1
```

| Estado | Representação |
|--------|----------------|
| Normal | ● |
| Atenção | ● |
| Crítico | ● |
| Vazio | ○ |

**Não** criar animações constantes nos nós.

---

## 14. Clique em etapa

Toque em `FERMENTAÇÃO · 4` abre **drawer lateral** (não navega para outra tela):

```
FERMENTAÇÃO · 4 LOTES

PH26082601 · Hambúrguer · 42 min restantes · ● NO PADRÃO
HD26082602 · Hot Dog · 12 min restantes · ● ATENÇÃO
PF26082603 · Pão Forma · +18 min · ● ATRASADO
```

---

## 15. Tela 02 — Produção ao Vivo

| | |
|---|---|
| **Rota** | `/app/cockpit/production` |
| **Pergunta** | Onde está cada lote agora? |

---

## 16. Produção ao Vivo — layout

Desktop (Kanban industrial):

```
PRODUÇÃO AO VIVO
[ Turno A ] [ Todos os produtos ] [ Status ]

PESAGEM (3) · AMASSAMENTO (2) · MODELAGEM · FERMENTAÇÃO · FORNO · RESFRIAMENTO · EMBALAGEM
```

---

## 17. Card compacto de lote

```
PH26082601
PÃO HAMBÚRGUER
FERMENTAÇÃO
03:22 restantes
● NO PADRÃO
Entrada 09:05 · Previsto 14:05
```

> A fermentação exige controle temporal especial: entrada, previsão de saída, tempo restante e alertas próximos do limite.

---

## 18. Não permitir drag-and-drop indiscriminado

O Kanban é representação visual. O gestor **não** pode arrastar livremente de AMASSAMENTO para EMBALAGEM. Transições devem respeitar o workflow industrial.

---

## 19. Tela 03 — Ordens de Produção

| | |
|---|---|
| **Rota** | `/app/cockpit/production/orders` |
| **Pergunta** | O que foi planejado e qual é o progresso? |

---

## 20. Lista de OPs

Desktop (tabela):

| OP | PRODUTO | PLANEJADO | PRODUZIDO | PROGRESSO | STATUS |
|----|---------|-----------|-----------|-----------|--------|
| 260826-001 | Hambúrguer 90g | 5.000 | 3.910 | 78% | EM PRODUÇÃO |
| 260826-002 | Hot Dog | 4.000 | 4.000 | 100% | CONCLUÍDA |

Filtros: data, produto, status, turno.

---

## 21. Tablet

Substituir tabela larga por cards:

```
OP 260826-001
Pão Hambúrguer 90g
5.000 planejadas · 3.910 produzidas
██████████████░░ 78%
● EM PRODUÇÃO
[ Abrir OP ]
```

---

## 22. Tela 04 — PCP / Ordens sincronizadas

| | |
|---|---|
| **Rota** | `/app/pcp` · `/app/pcp/orders` |
| **Dispositivos** | `[DESKTOP]` `[TABLET]` |

> **Correção (Doc 05):** a OP nasce no sistema gestor. O Factory OS **importa / sincroniza** — não cria OP como fluxo principal. Sem `[ + NOVA ORDEM ]` padrão.

---

## 23. Home PCP — programação

```
PCP / PROGRAMAÇÃO
HOJE · 28 AGO

18 OPs recebidas
12 liberadas · 4 em produção · 2 aguardando validação

ORDENS RECEBIDAS
260826-001 · Hambúrguer 90g · 5.000 · ● PRONTA PARA PRODUÇÃO
260826-002 · Hot Dog · 4.000 · ● EM PRODUÇÃO
260826-003 · Forma · 3.500 · ● REQUER ATENÇÃO
```

---

## 24. Detalhe da OP importada

Campos do gestor em **leitura** (🔒). Configuração industrial editável no Factory OS.

```
OP 260826-001
PÃO HAMBÚRGUER 90g

Quantidade planejada  5.000 un.   🔒 Sistema Gestor
Data                  28/08/2026  🔒 Sistema Gestor

CONFIGURAÇÃO DE PRODUÇÃO
Turno [ A ] · Linha [ Linha 01 ] · Lotes [...]

[ LIBERAR PARA PRODUÇÃO ]
```

Produto não mapeado: bloquear liberação + `[ CONFIGURAR PRODUTO ]` (Doc 05).

---

## 25. Fluxo de entrada (não é formulário de criação)

```
ERP → API → RECEBER OPs → NORMALIZAR → MAPEAR PRODUTO
  → VALIDAR CONFIG INDUSTRIAL → ASSOCIAR LOTE/BATIDAS → LIBERAR
```

Importar ≠ liberar para o Floor imediatamente.

---

## 26. Dados operacionais locais

Turno, linha, previsão de início, lotes/batidas (quando definidos no Factory OS) e liberação são responsabilidade do Factory OS.

`numberOfBatches` / `massWeight`: origem a validar (Docs 05 / 05A). **Não inventar.**

---

## 27. Revisão / liberação

```
PÃO HAMBÚRGUER 90g
5.000 unidades (gestor)
Turno A · Linha 01
integrationStatus: SYNCED
productionStatus: PRONTA → LIBERADA

[ LIBERAR PARA PRODUÇÃO ]
```

Fallback manual de criação de OP: **somente se necessidade real futura** — não presumir.
---

## 28. Tela 05 — Detalhe da OP

**Rota:** `/app/cockpit/production/orders/:orderId`

```
OP 260826-001 · Pão Hambúrguer 90g · ● EM PRODUÇÃO
Planejado 5.000 · Produzido 3.910 · 78%

BATIDAS: 01 ✓ · 02 ✓ · 03 ● · 04 ○ · 05 ○
LOTES: PH26082601 ...
```

---

## 29. Tela 06 — Lotes

| | |
|---|---|
| **Rota** | `/app/cockpit/production/lots` |
| **Pergunta** | Quais lotes existem e qual é o estado atual de cada um? |

Filtros: Hoje, Produto, Etapa, Status, OP, Equipamento.

---

## 30. Tela 07 — Detalhe do lote

Uma das telas mais importantes.

| | |
|---|---|
| **Rota** | `/app/cockpit/production/lots/:lotId` |
| **Dispositivos** | `[DESKTOP]` `[TABLET]` `[MOBILE]` |

---

## 31. Header do lote

```
PH26082601
PÃO HAMBÚRGUER 90g
● FERMENTAÇÃO
OP 260826-001 · Produção 26 AGO 2026
```

---

## 32. Corpo

Prioridade visual:

```
STATUS ATUAL → TIMELINE → QUANTIDADES → INGREDIENTES → EQUIPAMENTOS → OCORRÊNCIAS
```

---

## 33. Timeline

```
✓ AMASSAMENTO     08:10 → 08:22 · 12 min · Amassadeira 02 · Operador: João
✓ MODELAGEM       08:25 → 08:44 · 986 un. · 14 perdas
● FERMENTAÇÃO     09:05 · Previsto 14:05 · 03:22 restantes
○ FORNO
○ RESFRIAMENTO
○ EMBALAGEM
```

> Material-base: rastreabilidade com equipamentos, operadores e horários por estágio.

---

## 34. Tela 08 — Rastreabilidade

**Rota:** `/app/traceability`

```
RASTREABILIDADE
[ ESCANEAR QR CODE ]
ou
[ Digite o lote ] PH26082601 [ BUSCAR ]
```

---

## 35. Resultado da rastreabilidade

Após encontrar: **reutilizar a tela de lote**. Não criar duas páginas com o mesmo histórico.

Pode existir “modo rastreabilidade” com destaque para: matéria-prima, lotes dos ingredientes, datas, equipamentos, operadores, produção final.

---

## 36. FACTORY FLOOR

| | |
|---|---|
| **Rota** | `/app/floor` |
| **Prioridade** | `[TABLET]` `[MOBILE]` |

---

## 37. Shell do Factory Floor

**NÃO** usar sidebar.

```
┌──────────────────────────────┐
│ DC PÃES        AMASSADEIRA 02│
├──────────────────────────────┤
│           CONTEÚDO           │
├──────────────────────────────┤
│ ● ONLINE      operador João  │
└──────────────────────────────┘
```

---

## 38. Header operacional

| | |
|---|---|
| **Altura** | 56–64 px |
| **Conteúdo** | DC PÃES · ESTAÇÃO · hora |

Exemplo: `DC PÃES · AMASSADEIRA 02 · 14:32`

---

## 39. Navegação operacional

Não criar menu tradicional. No máximo: `[ Início ]` `[ Fila ]` `[ Ocorrências ]` — ou menu contextual discreto.

O operador deve permanecer quase sempre na tela da estação.

---

## 40. Estado 01 — Nenhum lote

```
AMASSADEIRA 02
PRONTO PARA PRODUZIR

[ ▣ ESCANEAR LOTE ]

3 LOTES AGUARDANDO
PH26082601 · Pão Hambúrguer
HD26082602 · Hot Dog
PF26082603 · Pão de Forma
```

---

## 41. Scanner

Botão primário com grande área (altura **64–72 px**). Ao tocar: abrir câmera **diretamente**.

Não: Abrir menu → escolher QR Code → ativar scanner.

---

## 42. Fallback manual

```
Não consegue escanear?
[ DIGITAR LOTE ]
```

Digitação é **fallback**.

---

## 43. Estado 02 — Lote identificado

```
PH26082601 · PÃO HAMBÚRGUER 90g
BATIDA 3 DE 5 · ● ● ● ○ ○

AMASSAMENTO
Ingredientes: ✓ Farinha ✓ Água ✓ Açúcar ✓ Fermento ✓ Gordura

[ INICIAR BATIDA ]
```

> Documento: confirmação dos ingredientes antes do início da batida.

---

## 44. Estado 03 — Processo ativo

```
AMASSAMENTO · PÃO HAMBÚRGUER · PH26082601
08:08 / 12:00
████████████████░░░░
● DENTRO DO PADRÃO

[ FINALIZAR AMASSAMENTO ]
Problema? Registrar ocorrência
```

---

## 45. Cronômetro

Nunca depender de cronômetro exclusivamente no navegador.

Persistir: `startedAt` · `expectedFinishAt`  
A interface calcula visualmente o restante (detalhe no documento técnico).

---

## 46. Estado 04 — Finalização

```
FINALIZAR MODELAGEM
Quantidade produzida [ 986 ]
Perda [ 14 ]
Produção 986 un. · Perda 1,4%
[ CONFIRMAR ]
```

> Modelagem: início, fim, quantidade, perda, operador e equipamento.

---

## 47. Estado 05 — Sucesso

```
✓ ETAPA CONCLUÍDA
PH26082601 · 986 unidades
Próxima etapa: EMBANDEJAMENTO
[ PRÓXIMO LOTE ]
```

Exibir ~1–2 segundos. Sem celebração exagerada.

---

## 48. KDS — Modelagem / Embandejamento

Tela adaptada à etapa. Incluir: quantidade esperada, início/fim, produção, perda, operador e equipamento.

---

## 49. KDS — Fermentação

Lógica própria:

```
FERMENTAÇÃO · CÂMARA 01
PH26082601 · PÃO HAMBÚRGUER
Entrada 09:05 · Saída prevista 14:05
03:22:14 restantes
██████████████░░
● NO PADRÃO
```

---

## 50. Fermentação — múltiplos lotes

```
CÂMARA 01
PH26082601 · Hambúrguer · 03:22 restantes · ● OK
HD26082601 · Hot Dog · 03:47 restantes · ● OK
PF26082602 · Pão Forma · 00:12 restantes · ● ATENÇÃO
```

> Material: grade com câmara, lote, produto, entrada, saída prevista e tempo restante.

---

## 51. Lote pronto

```
LOTE PRONTO
PH26082601 · PÃO HAMBÚRGUER
Fermentação concluída
[ ENVIAR PARA FORNO ]
```

---

## 52. KDS — Forno

```
FORNO · PH26082601 · PÃO HAMBÚRGUER
Selecionar forno: [ FORNO 01 ] [ FORNO 02 ]

FORNO 01 · Temperatura 180 °C · Tempo 14 min
[ INICIAR FORNEAMENTO ]
```

> Material: forno, temperatura/tempo programados, entrada, saída prevista; possibilidade de registrar valores reais.

---

## 53. KDS — Resfriamento

```
RESFRIAMENTO · PH26082601
Entrada 14:28 · Liberação 15:28
42 min restantes · ● RESFRIANDO
```

> Tempo mínimo evita embalagem de pão quente; bloquear embalagem antes da liberação.

---

## 54. Bloqueio operacional

```
EMBALAGEM AINDA NÃO LIBERADA
PH26082601
Faltam 18 min para concluir o resfriamento.
[ VOLTAR ]
```

**Não** usar erro técnico.

---

## 55. KDS — Embalagem

```
✓ LIBERADO PARA EMBALAGEM
[ INICIAR EMBALAGEM ]

Recebido 986 · Embalado 970 · Perda 16 · Pacotes 242 · Peso médio 360 g
[ CONCLUIR LOTE ]
```

---

## 56. Ocorrência operacional

Disponível durante qualquer etapa. Bottom sheet em tablet/mobile:

```
REGISTRAR OCORRÊNCIA
[ EQUIPAMENTO ] [ PRODUTO ] [ INSUMO ] [ QUALIDADE ] [ OUTRO ]
[ CANCELAR ]
```

---

## 57. Bottom sheets

Factory Floor deve preferir **Bottom Sheet** em vez de modal central.

Motivos: alcance no tablet; mantém contexto; mobile; ação próxima ao polegar.

---

## 58. Inputs numéricos

Ao tocar quantidade: abrir **teclado numérico**, não QWERTY.

---

## 59. FACTORY DISPLAY

| | |
|---|---|
| **Rota** | `/display/production` |
| **Uso** | `[TV]` |

Sem sidebar. Sem interação necessária.

---

## 60. Painel de produção

Inspirado no KDS principal do material:

```
DC PÃES · PRODUÇÃO DO DIA · 14:32

LOTE  PRODUTO      ETAPA         PREVISTO  STATUS
001   Hambúrguer   Fermentação   14:05     ● OK
002   Hot Dog      Modelagem     14:50     ● +4 MIN
003   Forma        Forno         14:40     ● +8 MIN
```

---

## 61. Melhorar o formato de TV

Não depender exclusivamente de tabela.

```
PRODUÇÃO DO DIA
18 LOTES · 13 concluídos · 4 rodando · 1 atrasado

ATENÇÃO
PH26082601 · FERMENTAÇÃO · +18 MIN

AMASSAMENTO 2 · MODELAGEM 1 · FERMENTAÇÃO 4 · FORNO 2 · RESFRIAMENTO 3 · EMBALAGEM 1
```

---

## 62. Auto-rotation opcional

TV pode alternar: VISÃO GERAL → LOTES → EQUIPAMENTOS — **somente se necessário**.

Não criar carrossel rápido. Tempo recomendado: **20–30 s** por tela.

---

## 63. Tela de Produtos

**Rota:** `/app/products` · Desktop

Listar: Pão Hambúrguer 90g, Pão Hot Dog, Pão de Forma…

---

## 64. Detalhe do produto

```
PRODUTO · PÃO HAMBÚRGUER 90g
[ Geral ] [ Ficha Técnica ] [ Processo ] [ Tempos ] [ Histórico ]
```

---

## 65. Ficha técnica

| INGREDIENTE | QUANTIDADE | UNIDADE |
|-------------|------------|---------|
| Farinha | 50 | kg |
| Água | 25 | L |
| Açúcar | 4 | kg |
| Fermento | 1 | kg |
| Gordura | 2 | kg |

Base da OP e dos apontamentos de ingredientes.

---

## 66. Tempos padrão

| Etapa | Tempo | Tolerância |
|-------|-------|------------|
| Amassamento | 12 min | +2 |
| Modelagem | 20 min | +5 |
| Fermentação | 300 min | ±15 |
| Forno | 14 min | +2 |
| Resfriamento | 60 min | +10 |
| Embalagem | 40 min | +10 |

Valores são **exemplos** e devem continuar configuráveis por produto.

---

## 67. Equipamentos

**Rota:** `/app/equipment`

```
OPERANDO 8 · PARADOS 1 · MANUTENÇÃO 1

AM01 Amassadeira 01 · ● OPERANDO
AM02 Amassadeira 02 · ● OPERANDO
FO01 Forno 01 · ● PARADO · 22 min
```

---

## 68. Detalhe do equipamento

```
FORNO 01 · ● OPERANDO
Lote atual PH26082601
Tempo operando hoje 6h22 · Parado 42 min · Utilização 91%
HISTÓRICO …
```

> Material: máquina mais produtiva, atraso e ociosidade.

---

## 69. Qualidade

```
QUALIDADE
PERDA HOJE 2,1% · OCORRÊNCIAS 3 · RETRABALHOS 1 · LOTES REPROVADOS 0
```

Não presumir critérios de reprovação ainda.

---

## 70. Perdas

```
PERDA POR PROCESSO
01 Modelagem 2,8% · 02 Embalagem 1,9% · 03 Amassamento 0,8%
```

Também: perda por produto. Material pede perda por produto, processo e linha de embalagem.

---

## 71. Pesquisa global

Cockpit: `⌕ Buscar lote, OP, produto...`

Prioridade: LOTES → ORDENS → PRODUTOS → EQUIPAMENTOS

---

## 72. QR Code

Qualquer tela de lote pode oferecer `[ QR ]`.

QR resolve para **referência do lote**. Não expor dados sensíveis ou ficha completa no QR.

---

## 73. Deep link

Conceitualmente: `/app/lot/PH26082601` (ou ID interno).

Scan deve abrir o contexto apropriado.

---

## 74. Permissões e navegação

Sidebar respeita permissões. Operador não vê menus administrativos. PCP não precisa de configurações avançadas por padrão.

Controle definitivo em documento posterior.

---

## 75. Estado online

| Shell | Tratamento |
|-------|------------|
| Cockpit | `● ONLINE` discreto no header |
| Floor | Status evidente: `● ONLINE` ou `○ SEM CONEXÃO · 2 registros pendentes` |

---

## 76. Firebase e arquitetura de tela

```
UI → HOOK / SERVICE / REPOSITORY → FIREBASE
```

Evitar `getDocs(...)` espalhado por dezenas de componentes.

---

## 77. Realtime por contexto

| Shell | Listeners |
|-------|-----------|
| Floor | estação, lote atual, fila relevante, alertas necessários |
| Cockpit | produção atual, atenção, estados agregados necessários |

**Não** carregar histórico inteiro.

---

## 78. Skeleton

Toda tela preserva estrutura durante loading. Não usar `Carregando...` no centro como padrão.

---

## 79. Estado vazio

Preferir: `✓ Nenhum lote em atraso.`  
Evitar: `Nenhum registro encontrado.`

---

## 80. Erro

Factory Floor (somente se arquitetura offline confirmar):

```
NÃO FOI POSSÍVEL REGISTRAR
Sua ação foi mantida neste dispositivo.
Tentaremos sincronizar novamente.
[ TENTAR AGORA ]
```

**Não** prometer persistência local antes de implementá-la.

---

## 81. Breakpoints

| Perfil | Faixa |
|--------|-------|
| Mobile | &lt; 640 px |
| Tablet | 640–1023 px |
| Desktop | 1024–1439 px |
| Large Desktop | ≥ 1440 px |
| TV | ≥ 1600 px |

Não usar breakpoint apenas para diminuir tudo proporcionalmente.

---

## 82. Tablet Factory Floor

Referência primária: **1024×768** · **1280×800**. Testar também orientação vertical.

---

## 83. Layout tablet horizontal

Preferencial quando fixado em máquina:

```
┌───────────────────────┬─────────────┐
│   PROCESSO ATUAL      │    FILA     │
│         (~70%)        │   (~30%)    │
└───────────────────────┴─────────────┘
```

---

## 84. Tablet vertical

```
PROCESSO ATUAL → AÇÃO → PRÓXIMOS LOTES
```

---

## 85. Mobile

Coluna única:

```
Lote · Produto · Etapa · Tempo · Status
[ AÇÃO PRINCIPAL ]
Dados secundários
```

---

## 86. Gestos

Não depender de: swipe escondido, long press, hover, double-click.

Ações industriais importantes devem estar **visíveis**.

---

## 87. Confirmação visual

Após registro operacional: `✓ REGISTRADO` por tempo curto (confiança).

---

## 88. Sons

Não implementar áudio nesta fase. Arquitetura preparada para alertas futuros apenas se necessidade industrial validada.

---

## 89. Cor não pode ser única informação

Não apenas círculo vermelho. Usar: `● ATRASADO · +18 min`

---

## 90. Hierarquia das páginas

O usuário deve chegar ao **LOTE** a partir de: Cockpit, Produção ao Vivo, OP, Rastreabilidade, Equipamento, Qualidade, busca global.

A página de lote é um **hub**.

---

## 91. Entidades centrais

```
PRODUTO → ORDEM → LOTE → ETAPA → EVENTO
```

Relacionadas: EQUIPAMENTO · OPERADOR · ESTAÇÃO · INGREDIENTE · OCORRÊNCIA · PERDA

---

## 92. Regra contra duplicação

Não criar “Detalhe do lote” e “Rastreabilidade do lote” com duas implementações. Reutilizar a mesma base.

---

## 93. Modais × páginas

| Usar | Para |
|------|------|
| **Página** | OP, lote, produto, equipamento, relatórios complexos |
| **Drawer** | detalhe rápido, lote no fluxo, preview, ações contextuais |
| **Bottom sheet** | Factory Floor |

---

## 94. URLs compartilháveis

Telas gerenciais importantes com URL direta, ex.: `/app/cockpit/production/lots/abc123` — bookmark, compartilhamento, histórico, refresh.

---

## 95. Shell persistente

| Shell | Persiste | Muda |
|-------|----------|------|
| Cockpit | sidebar + header | conteúdo |
| Floor | header da estação | contexto operacional |

---

## 96. O que NÃO implementar ainda

Este documento **não** autoriza automaticamente:

manutenção preventiva · estoque · compras · financeiro · expedição · logística · vendas · folha de pagamento · BI externo.

Somente adicionar novos domínios após definição funcional.

---

## 97. Ordem recomendada de construção visual

Antes do backend completo:

1. Design System  
2. Shell Cockpit  
3. Shell Factory Floor  
4. Home Cockpit  
5. Produção ao Vivo  
6. Lote  
7. PCP / Ordens sincronizadas (Doc 05)  
8. Floor Amassamento  
9. Floor Fermentação  
10. Floor Forno  
11. Floor Resfriamento  
12. Floor Embalagem  
13. Rastreabilidade  
14. Produtos  
15. Equipamentos  
16. Qualidade  

---

## 98. Ordem recomendada de validação

Validar primeiro:

```
LOTE + FLUXO OPERACIONAL + KDS
```

antes de investir fortemente em relatórios.

Sem apontamento operacional confiável, o gerencial não terá dados confiáveis.

---

## 99. Critério de sucesso da arquitetura

- Um **operador** deve executar a produção sem conhecer a estrutura administrativa.
- Um **gestor** deve enxergar toda a produção no Cockpit sem navegar por cada estação.

---

## 100. Instrução permanente ao Cursor

Antes de criar uma nova rota, perguntar:

1. Qual usuário usa esta tela?
2. Em qual dispositivo?
3. Qual pergunta ela responde?
4. Qual é a ação principal?
5. Essa informação já existe em outra tela?
6. Pode ser drawer em vez de página?
7. Pode ser contexto em vez de menu?

Se essas perguntas não tiverem resposta clara: **não criar a rota**.

---

## Arquitetura resumida

```
              SISTEMA GESTOR DC PÃES
                         │ API
                         ▼
                  INTEGRATION LAYER
                         │
                         DC PÃES FACTORY OS
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
        FACTORY COCKPIT      FACTORY FLOOR       FACTORY DISPLAY
              │                   │                   │
         Gestão / PCP          Tablets              TV/KDS
              │                   │
              └──────── FIREBASE EXISTENTE ──────────┘
                                  │
                     OP IMPORTADA → LOTE → ETAPAS → EVENTOS
```

> **Doc 05:** OP nasce no sistema gestor. Factory OS importa, valida e executa. Sem “Nova OP” como fluxo principal.