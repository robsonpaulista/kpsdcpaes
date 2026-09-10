# DOCUMENTO 00 — MASTER README

**DC Pães · Sistema Integrado de Produção**

| | |
|---|---|
| **Versão** | 1.0 |
| **Status** | Documento mestre |
| **Público** | Produto, Design, Engenharia e Cursor |
| **Plataformas** | Desktop · Tablet · Mobile |
| **Contexto** | Ambiente industrial / chão de fábrica |

---

## 1. Visão do produto

Este projeto **não** deve ser tratado como um dashboard administrativo tradicional.

O objetivo é construir um **sistema operacional da fábrica**, capaz de conectar planejamento, execução, acompanhamento e inteligência da produção em uma única plataforma.

O sistema deverá acompanhar o produto desde a criação da Ordem de Produção (OP) até a conclusão da embalagem, preservando todo o histórico necessário para rastreabilidade.

### Fluxo operacional

```
ORDEM DE PRODUÇÃO
        ↓
PESAGEM / AMASSAMENTO
        ↓
MODELAGEM / EMBANDEJAMENTO
        ↓
FERMENTAÇÃO
        ↓
FORNEAMENTO
        ↓
RESFRIAMENTO
        ↓
EMBALAGEM
        ↓
PRODUÇÃO CONCLUÍDA
```

Cada lote deve carregar consigo informações de produto, OP, quantidade, horários, operadores, equipamentos, perdas e demais registros pertinentes.

---

## 2. Princípio fundamental

Existem **duas experiências diferentes** dentro do mesmo produto.

### A. FACTORY COCKPIT

Interface gerencial.

**Utilizada por:** administração, PCP, gestores, supervisores, responsáveis pela produção.

**Objetivo:** Entender → decidir → priorizar → agir.

Pode apresentar maior densidade informacional, rankings, indicadores, comparações, tendências, alertas e gamificação refinada.

### B. FACTORY FLOOR

Interface operacional.

**Utilizada pelo** pessoal diretamente envolvido na produção.

**Prioridade absoluta:** Executar corretamente a próxima ação com o mínimo possível de interação.

O operador não deve precisar “navegar pelo sistema”. O sistema deve **conduzi-lo**.

---

## 3. Regra de ouro do Factory Floor

Toda tela operacional deve tentar responder somente:

> **O que estou fazendo agora e qual é minha próxima ação?**

- Nunca transformar uma tela de chão de fábrica em dashboard.
- Nunca apresentar informações sem utilidade para a tarefa atual.
- Nunca exigir que o operador procure uma funcionalidade que o próprio contexto do lote poderia determinar.

---

## 4. Filosofia de interação

**Scan → Understand → Act**

```
ESCANEAR
    ↓
ENTENDER
    ↓
EXECUTAR
```

O QR Code deve ser a principal forma de identificação do lote.

O material-base estabelece explicitamente:

```
escaneia → inicia processo → finaliza processo
```

como mecanismo para reduzir erros de apontamento.

**Portanto:** evitar digitação sempre que possível.

---

## 5. Política de cliques

Esta é uma **regra estrutural** do projeto.

| Tipo | Limite | Exemplo |
|------|--------|---------|
| Operações frequentes | 1–2 interações | Escanear lote → Iniciar etapa |
| Operações que exigem informação | máx. 3 interações | Finalizar → informar quantidade → confirmar |
| Operações excepcionais | fluxo maior permitido | Registrar ocorrência → problema → quantidade/perda → confirmar |

O sistema **nunca** deve acrescentar etapas apenas por organização técnica do software.

---

## 6. Zero digitação desnecessária

Prioridade de entrada:

1. QR Code / código de barras
2. Ação contextual
3. Seleção visual
4. Presets
5. Teclado numérico
6. Texto livre

**Texto livre é o último recurso.**

---

## 7. Arquitetura operacional

O material-base prevê estações específicas em tablets:

```
PCP / ADMINISTRATIVO
       ↓
TABLET 01 — Pesagem / Amassadeira
TABLET 02 — Modelagem / Embandejamento
TABLET 03 — Fermentação
TABLET 04 — Forno
TABLET 05 — Resfriamento / Embalagem
TABLET 06 — Embalagem
```

Todas convergindo para banco central e painel de gestão.

A arquitetura da aplicação deve respeitar essa lógica.

---

## 8. Lote como entidade central

O sistema **NÃO** deve ser arquitetado visualmente apenas ao redor de módulos.

A principal entidade operacional é:

> **LOTE** — ex.: `PH26082601` · Pão Hambúrguer 90 g

### Ciclo de vida do lote

```
CRIADO
 ↓
AGUARDANDO
 ↓
EM PRODUÇÃO
 ↓
FERMENTANDO
 ↓
FORNEANDO
 ↓
RESFRIANDO
 ↓
EMBALANDO
 ↓
CONCLUÍDO
```

---

## 9. Timeline viva do lote

Toda movimentação deve alimentar automaticamente uma timeline.

Exemplo:

```
PH26082601

✓ AMASSAMENTO
08:10 → 08:22 · 12 min · NO PADRÃO

✓ MODELAGEM
08:25 → 08:44 · 986 unidades · 1,4% perda

● FERMENTAÇÃO
09:05 → 14:05
██████████████░░░
42 min restantes

○ FORNO
○ RESFRIAMENTO
○ EMBALAGEM
```

Essa timeline servirá simultaneamente para: acompanhamento, operação, supervisão, diagnóstico, histórico e rastreabilidade.

---

## 10. Máquina de estados

O workflow **não** deve depender de telas independentes.

Cada lote possui um estado. Exemplo:

```
CREATED
WAITING_WEIGHING
WEIGHING
WAITING_MIXING
MIXING
WAITING_MODELING
MODELING
PROOFING
READY_FOR_OVEN
BAKING
COOLING
READY_FOR_PACKAGING
PACKAGING
COMPLETED
BLOCKED
```

A nomenclatura definitiva será estabelecida no documento de arquitetura.

**O importante:** a interface deve reagir ao estado do lote — **não o contrário**.

---

## 11. Tempo como entidade de primeira classe

Tempo não será apenas um dado armazenado. Será parte central da experiência.

Cada processo poderá possuir:

- tempo padrão
- tempo mínimo
- tempo máximo
- tolerância
- tempo real
- previsão
- status

Esses tempos devem ser definidos conforme o produto.

---

## 12. Linguagem de status

O sistema deve possuir linguagem **extremamente consistente**.

| Status | Representação |
|--------|----------------|
| NORMAL | ● NO PADRÃO |
| ATENÇÃO | ● ATENÇÃO · 12 min restantes |
| CRÍTICO | ● ATRASADO · +08 min |
| AGUARDANDO | ○ AGUARDANDO |
| CONCLUÍDO | ✓ CONCLUÍDO |

Estados equivalentes no KDS: dentro do tempo, próximo do limite, atrasado, aguardando, não iniciado e finalizado.

---

## 13. Alertas precisam gerar ação

**Nunca:**

> ⚠ Fermentação atrasada

**Preferir:**

```
FERMENTAÇÃO
PH26082601
+18 MIN

Lote aguardando forneamento.

[ LEVAR PARA FORNO ]
```

Um alerta deve responder:

1. O que aconteceu?
2. Onde?
3. Há quanto tempo?
4. O que fazer agora?

---

## 14. Factory Cockpit

A Home gerencial **não** deve ser uma coleção de KPIs.

**Pergunta principal:** Como está a fábrica agora?  
**Segunda pergunta:** O que precisa da minha atenção?

### Hierarquia sugerida

```
FACTORY COCKPIT
├── PULSO DA FÁBRICA
├── FLUXO EM TEMPO REAL
├── ATENÇÃO AGORA
├── PRODUÇÃO DO TURNO
├── GARGALOS
├── EFICIÊNCIA
├── PERDAS
├── EQUIPAMENTOS
└── QUALIDADE
```

---

## 15. Pulso da Fábrica

Indicador composto (futuro):

```
PULSO DA FÁBRICA
94 / 100
OPERAÇÃO SAUDÁVEL
```

Poderá considerar: aderência ao plano, atrasos, perdas, lotes bloqueados, eficiência, equipamentos, qualidade.

> **Importante:** a fórmula **não** deve ser inventada nesta fase. Deverá ser documentada e validada antes da implementação.

---

## 16. Gamificação

A gamificação existe para melhorar leitura e engajamento. **Nunca infantilizar** o ambiente industrial.

### Permitido

- Melhor desempenho
- Lotes consecutivos no padrão
- Eficiência %
- Meta do turno
- Posição da linha
- Comparativo vs. turno anterior

### Evitar

- XP, moedas, personagens, confete
- Rankings agressivos de funcionários
- Excesso de troféus
- Efeitos arcade

---

## 17. Princípio da gamificação

Preferencialmente gamificar: **processos, linhas, metas e resultados**.

Evitar transformar trabalhadores individualmente em ranking competitivo sem necessidade empresarial específica.

---

## 18. Design System

| | |
|---|---|
| **Identidade** | DC Pães |
| **Direção** | Industrial Premium + Operational Intelligence |

**Sensação desejada:** tecnologia, precisão, organização, indústria, velocidade, confiança, modernidade.

**Não parecer:** ERP antigo, sistema contábil, dashboard genérico, template administrativo, videogame.

---

## 19. Paleta

### Base neutra

```css
--black: #171717;
--graphite: #292929;
--white: #FFFFFF;
--surface: #F7F7F5;
--surface-secondary: #EFEFED;
--border: #DFDFDC;
--text: #171717;
--text-secondary: #696969;
--text-muted: #9A9A96;
```

Laranja será derivado da identidade visual oficial e documentado como token após definição cromática final.

### Uso semântico

| Cor | Papel |
|-----|-------|
| Branco / cinza | Estrutura |
| Preto | Informação |
| Laranja | Identidade / ação / progresso |
| Verde | Sucesso operacional |
| Amarelo | Atenção |
| Vermelho | Exceção / crítico |

**Não usar laranja indiscriminadamente.**

---

## 20. Tipografia

Recomendação inicial: **Inter** (ou equivalente definido no Design System).

Hierarquia privilegiando legibilidade em ambiente industrial.

**No Factory Floor:** números grandes, contraste elevado, labels curtas, textos mínimos, botões grandes.

---

## 21. Touch targets

Factory Floor deve ser **touch-first**.

| Tipo | Tamanho |
|------|---------|
| Mínimo | 48 × 48 px |
| Ações principais | 56–64 px de altura |

Não criar pequenos ícones clicáveis para operações críticas.

---

## 22. Responsividade

| Experiência | Prioridade |
|-------------|------------|
| Factory Cockpit | Desktop → Tablet |
| Factory Floor | Tablet → Mobile → Desktop |

Uma tela operacional **nunca** poderá depender de hover.

---

## 23. KDS

As telas KDS devem priorizar:

1. LOTE  
2. PRODUTO  
3. ETAPA  
4. TEMPO  
5. STATUS  
6. AÇÃO  

Informações secundárias ficam subordinadas.

O material prevê painel KDS geral de produção do dia (lote, produto, etapa, início, previsto, atraso, status) para visão instantânea da fábrica.

---

## 24. Rastreabilidade

Cada lote deverá permitir reconstruir seu histórico, incluindo entre outros:

produto, OP, data, ingredientes e lotes de origem, equipamentos, operador, horários, produção planejada, produção final, perda.

> **Nenhuma transição operacional importante pode destruir o histórico anterior.**

---

## 25. Equipamentos

Equipamentos serão entidades próprias.

| Código | Equipamento |
|--------|-------------|
| AM01 | Amassadeira 01 |
| AM02 | Amassadeira 02 |
| MD01 | Modeladora / Embandejadora |
| CF01 | Câmara Fermentação 01 |
| FO01 | Forno 01 |
| FO02 | Forno 02 |
| EM01 | Linha Embalagem 01 |

Isso permitirá medir utilização, atrasos e ociosidade por equipamento.

---

## 26. Conectividade

Requisito adicional de arquitetura (não definido pelo documento-base):

```
ONLINE
 ↓
perda de conexão
 ↓
OPERAÇÃO LOCAL TEMPORÁRIA
 ↓
fila de sincronização
 ↓
reconexão
 ↓
SYNC
```

A estratégia técnica definitiva será definida posteriormente.

> **Não implementar offline de maneira improvisada.**

---

## 27. Princípio técnico

Antes de criar qualquer feature, perguntar:

1. Existe componente equivalente?
2. Existe entidade equivalente?
3. Existe fluxo equivalente?
4. Existe token equivalente?

**Evitar duplicação.**

---

## 28. Regra para o Cursor

- **NÃO** implementar funcionalidades não especificadas apenas porque parecem úteis.
- Quando houver lacuna funcional: identificar → documentar → apresentar alternativa → aguardar decisão quando alterar regra de negócio.
- **Não inventar regra industrial.**

---

## 29. Regra de desenvolvimento

Antes de modificar uma tela existente:

1. Entender o fluxo
2. Identificar o usuário
3. Identificar a tarefa
4. Identificar a decisão
5. Determinar informação mínima
6. Reutilizar Design System
7. Implementar

**Não começar pelo componente visual.**

---

## 30. Métrica de sucesso da interface

| Experiência | Métrica |
|-------------|---------|
| Factory Cockpit | Tempo entre identificar um problema e decidir o que fazer |
| Factory Floor | Tempo e número de interações necessários para registrar corretamente uma operação |

---

## 31. Norte do produto

A aplicação deve progressivamente deixar de parecer um software que registra o que aconteceu.

Ela deve se tornar um sistema que diz:

> **o que está acontecendo, o que acontecerá em seguida e onde é necessário agir.**

Essa será a principal diferença entre este produto e um ERP/KDS convencional.
