# DOCUMENTO 03 — DESIGN SYSTEM & UI FOUNDATIONS

**DC Pães · Factory OS**

| | |
|---|---|
| **Versão** | 1.0 |
| **Status** | Design System Base |
| **Backend** | Firebase existente do cliente |
| **Experiências** | Factory Cockpit · Factory Floor · Factory Display |
| **Prioridade operacional** | Tablet / Mobile |
| **Prioridade gerencial** | Desktop / Tablet |

---

## 1. Objetivo visual

A interface deve transmitir:

> **Indústria + precisão + velocidade + controle + modernidade.**

A referência **não** deve ser um ERP convencional. Também não queremos uma interface excessivamente futurista.

**Resultado esperado:**

```
INDUSTRIAL + PREMIUM + MINIMALISTA + OPERACIONAL + GAMIFICAÇÃO REFINADA
```

A identidade da DC Pães deve aparecer claramente, mas **sem** transformar toda a aplicação em uma superfície laranja.

---

## 2. Duas densidades, um Design System

O mesmo Design System deverá produzir duas experiências.

| Factory Cockpit | Factory Floor |
|-----------------|---------------|
| Maior densidade | Menor densidade |
| Mais informação / comparação / contexto | Menos elementos |
| Rankings, gráficos, indicadores | Mais contraste |
| | Botões e números maiores |
| | Menos decisões / mais orientação |

**Não** criar dois sistemas visuais independentes.

---

## 3. Personalidade visual

**Palavras-chave:** preciso · sólido · rápido · limpo · confiável · industrial · contemporâneo

**Evitar:** ERP antigo · BI corporativo genérico · videogame · interface neon · glassmorphism excessivo · gradientes decorativos

---

## 4. Paleta estrutural

A maior parte da interface deve ser neutra.

```css
:root {
  --dc-black: #171717;
  --dc-graphite: #292929;

  --dc-white: #FFFFFF;

  --dc-bg: #F6F6F4;
  --dc-surface: #FFFFFF;
  --dc-surface-secondary: #F0F0ED;
  --dc-surface-tertiary: #E9E9E6;

  --dc-border: #DFDFDB;
  --dc-border-soft: rgba(23, 23, 23, 0.07);

  --dc-text: #171717;
  --dc-text-secondary: #666663;
  --dc-text-muted: #969691;
}
```

---

## 5. Laranja DC

O laranja será a cor de identidade e ação.

Como a tonalidade definitiva deverá ser conferida com os ativos oficiais da marca, criar token **sem** espalhar hexadecimal diretamente pelos componentes.

```css
--dc-orange: <COR_OFICIAL>;
--dc-orange-hover: <DERIVAÇÃO>;
--dc-orange-soft: <COR_OFICIAL com ~10%>;
--dc-orange-medium: <COR_OFICIAL com ~20%>;
```

Nunca hardcodear o laranja em dezenas de componentes. Tudo deve consumir o token.

---

## 6. Uso do laranja

**Usar principalmente em:** ação primária; item selecionado; progresso importante; identidade; foco; pequenos destaques; estados de execução quando apropriado.

**Evitar:** grandes backgrounds laranja; todos os cards com borda laranja; todos os ícones laranja; títulos laranja indiscriminadamente.

---

## 7. Cores semânticas

```css
--success: #17965A;
--success-soft: #E9F6EF;

--warning: #D99A19;
--warning-soft: #FFF5DB;

--danger: #D9473F;
--danger-soft: #FDECEA;

--info: #3F6FA8;
--info-soft: #EDF3FA;
```

Essas cores possuem significado. Não utilizar verde apenas porque “fica bonito”.

---

## 8. Regra de status

Toda cor semântica deve ser acompanhada por texto ou símbolo.

| Errado | Correto |
|--------|---------|
| `●` (vermelho sozinho) | `● ATRASADO · +18 min` |

---

## 9. Tipografia

**Recomendação:** Inter

```css
font-family:
  Inter,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Não utilizar várias famílias tipográficas.

---

## 10. Escala — Cockpit

```css
--text-xs: 10px;
--text-sm: 12px;
--text-md: 14px;
--text-lg: 16px;

--heading-sm: 18px;
--heading-md: 22px;
--heading-lg: 28px;

--metric-sm: 20px;
--metric-md: 28px;
--metric-lg: 36px;
```

---

## 11. Escala — Factory Floor

| Elemento | Tamanho |
|----------|---------|
| Label | 14–16 px |
| Produto / lote | 18–22 px |
| Título da etapa | 24–30 px |
| Cronômetro | 48–72 px |
| Ação principal | 16–20 px / 650 |

---

## 12. Pesos

| Peso | Uso |
|------|-----|
| 400 | Texto |
| 500 | Labels |
| 600 | Títulos |
| 650 / 700 | Números importantes |

Não usar bold em tudo. Se tudo é importante, nada é importante.

---

## 13. Números tabulares

Para cronômetros, quantidades, tempos e indicadores:

```css
font-variant-numeric: tabular-nums;
```

Evita que cronômetros “pulem” horizontalmente.

---

## 14. Espaçamento

Sistema base: **4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64**

Não criar espaçamentos aleatórios (13 px, 19 px, 27 px) sem necessidade específica.

---

## 15. Radius

### Cockpit

| Elemento | Radius |
|----------|--------|
| Container grande | 18 px |
| Card | 14 px |
| Microcard | 10 px |
| Pill | 999 px |

### Factory Floor

| Elemento | Radius |
|----------|--------|
| Container | 18 px |
| Botão | 14–16 px |
| Input | 12–14 px |
| Bottom sheet | `24px 24px 0 0` |

---

## 16. Bordas

```css
border: 1px solid var(--dc-border-soft);
```

Separadores: `border-color: rgba(23, 23, 23, 0.06);`

Não desenhar a interface inteira com caixas fortes.

---

## 17. Sombras

Muito discretas.

```css
box-shadow:
  0 1px 2px rgba(0, 0, 0, 0.025),
  0 6px 20px rgba(0, 0, 0, 0.025);
```

Hover desktop:

```css
box-shadow: 0 5px 18px rgba(0, 0, 0, 0.05);
```

Factory Floor: ainda menos sombra. Contraste e separação são mais importantes.

---

## 18. Superfícies

```
BACKGROUND #F6F6F4
    ↓
CONTAINER  #FFFFFF
    ↓
ÁREA SECUNDÁRIA #F0F0ED
```

Evitar card dentro de card dentro de card.

---

## 19. Ícones

**Preferência:** Lucide (ou biblioteca já consistente no projeto).

| Contexto | Tamanho |
|----------|---------|
| Cockpit | 16–18 px |
| Floor | 20–24 px |
| Ação operacional importante | 24–28 px |

Stroke: **1.75–2 px**. Não usar emojis como ícones de interface.

---

## 20. Botão primário — Cockpit

`[ LIBERAR PARA PRODUÇÃO ]` · Altura **40–44 px**

```css
background: var(--dc-orange);
color: #FFFFFF;
border-radius: 12px;
padding: 0 16px;
font-weight: 600;
```

---

## 21. Botão primário — Factory Floor

`[ INICIAR AMASSAMENTO ]`

| | |
|---|---|
| Altura mínima | 60 px |
| Ideal | 64–72 px |
| Largura | Preferencialmente `width: 100%` |

---

## 22. Botão crítico

Exemplo: `[ REPROVAR LOTE ]`

Não usar vermelho para qualquer “cancelar”. Vermelho é reservado para ações realmente destrutivas/críticas.

---

## 23. Botão secundário

```css
background: var(--dc-surface-secondary);
color: var(--dc-text);
```

Exemplo: `[ REGISTRAR OCORRÊNCIA ]`

---

## 24. Botão ghost

Ações terciárias: `Ver histórico →` — não competir com a ação principal.

---

## 25. Touch targets

| Tipo | Tamanho |
|------|---------|
| Mínimo absoluto (Floor) | 48 × 48 px |
| Preferencial | 56 × 56 px |
| Ações principais | 64 px+ |

---

## 26. Inputs

| Contexto | Altura |
|----------|--------|
| Cockpit | 40–44 px |
| Factory Floor | 52–60 px |

Label sempre visível. Evitar placeholder como única identificação.

---

## 27. Input numérico

```
QUANTIDADE PRODUZIDA
┌───────────────────────┐
│ 986                   │
└───────────────────────┘
```

No tablet/mobile: `inputmode="numeric"` (ou decimal quando apropriado).

---

## 28. Stepper

```
QUANTIDADE
[ − ]   986   [ + ]
```

Touch targets grandes. Não usar stepper para quantidades enormes quando digitação numérica for mais rápida.

---

## 29. Select operacional

Evitar dropdown pequeno. Em tablet, preferir cards selecionáveis:

```
SELECIONE O FORNO
┌───────────────┐  ┌───────────────┐
│ FORNO 01      │  │ FORNO 02      │
│ ● DISPONÍVEL  │  │ ● OPERANDO    │
└───────────────┘  └───────────────┘
```

Mais compreensível que `<select>`.

---

## 30. Checkbox operacional

```
✓ Farinha
```

Linha inteira tocável. Altura **52–60 px**. Não exigir precisão em checkbox de 16 px.

---

## 31. Card padrão Cockpit

```
┌────────────────────────────┐
│ TÍTULO                     │
│ descrição                  │
│ conteúdo                   │
└────────────────────────────┘
```

Padding: **16 px** ou **20 px**.

---

## 32. Card de KPI

```
ADERÊNCIA
94%
↑ 3,2% vs. ontem
```

Não criar gráfico em todo KPI. Gráfico só se acrescentar interpretação.

---

## 33. Card de lote — Cockpit

```
PH26082601
PÃO HAMBÚRGUER
FERMENTAÇÃO
03:22 restantes
● NO PADRÃO
```

Dimensões devem permitir vários cards simultaneamente.

---

## 34. Card de lote — Factory Floor

Maior, com mais respiro:

```
┌───────────────────────────────┐
│ PH26082601                    │
│ PÃO HAMBÚRGUER 90g            │
│ FERMENTAÇÃO                   │
│ 03:22 restantes               │
│ ● NO PADRÃO                   │
└───────────────────────────────┘
```

---

## 35. Ranking

```
01   LINHA 02                  97%
     ███████████████████████

02   LINHA 01                  91%
     █████████████████████

03   LINHA 03                  84%
     ███████████████████
```

Posição: **11–12 px / 650**. Primeiro colocado pode receber badge `TOP` em amarelo/louro suave.

---

## 36. Não transformar ranking em carnaval

Não: 🥇🥈🥉 gigantes. Preferir `01 · 02 · 03` + pequeno badge TOP.

---

## 37. Progress bar

```css
height: 6px;
border-radius: 999px;
background: var(--dc-surface-tertiary);
```

Fill padrão: `var(--dc-graphite)`. Meta/ação da marca: `var(--dc-orange)`.

---

## 38. Progress bar operacional

Maior: **8–12 px**.

```
FERMENTAÇÃO
████████████████░░░░
03:22 restantes
```

---

## 39. Timer

Componente fundamental.

```
TEMPO RESTANTE
03:22:14
● NO PADRÃO
```

Números: **56–72 px** (tablet).

---

## 40. Timer — estados

| Estado | Exibição |
|--------|----------|
| Normal | `03:22 · ● NO PADRÃO` |
| Próximo do limite | `00:12 · ● ATENÇÃO` |
| Ultrapassado | `+00:18 · ● ATRASADO` |

Não transformar toda a tela em vermelho.

---

## 41. Uso de fundo semântico

Permitido em pequenas regiões: `ATENÇÃO` → warning-soft; `ATRASADO` → danger-soft.

**Não** 100% da tela vermelha.

---

## 42. Attention Card

```
CRÍTICO
PH26082601
FERMENTAÇÃO · +18 min
Aguardando forneamento.
[ VER LOTE ]
```

Usar borda/indicador lateral discreto.

---

## 43. Attention Queue

Ordem: **CRÍTICO → ATENÇÃO → INFORMATIVO**

Dentro da mesma severidade: mais antigo ou mais urgente primeiro (regra futura).

---

## 44. Status Badge

```
● NO PADRÃO · ● ATENÇÃO · ● ATRASADO · ○ AGUARDANDO · ✓ CONCLUÍDO
```

Altura: **24–28 px**.

---

## 45. Timeline do lote

Componente central:

```
● AMASSAMENTO     08:10 → 08:22 · 12 min
● MODELAGEM       08:25 → 08:44 · 986 un.
◉ FERMENTAÇÃO     03:22 restantes
○ FORNO
○ RESFRIAMENTO
○ EMBALAGEM
```

---

## 46. Estados da timeline

| Estado | Símbolo |
|--------|---------|
| Concluído | ✓ |
| Atual | ◉ |
| Futuro | ○ |
| Problema | ! |

Sempre acompanhado de texto.

---

## 47. QR Scanner

Tela extremamente simples: câmera + guia QR + fallback `DIGITAR LOTE`.

---

## 48. Feedback de scan

| Resultado | Comportamento |
|-----------|----------------|
| Sucesso | `✓ LOTE IDENTIFICADO` · ~500–800 ms · prosseguir |
| Falha | QR não reconhecido · tentar novamente ou digitar |

---

## 49. Bottom Sheet

Tablet/mobile: handle + título + opções + ação. Preferido no Floor.

---

## 50. Drawer

Cockpit desktop: largura **380–480 px**.

Uso: preview de lote; detalhes rápidos; filtros; alertas; equipamento.

---

## 51. Modal

Usar com moderação: confirmação crítica; pequena edição; ação excepcional.

Não abrir modal para simplesmente mostrar informação.

---

## 52. Toast

| Tipo | Exemplo |
|------|---------|
| Sucesso | `✓ Etapa registrada` |
| Erro | `Não foi possível sincronizar.` |

Duração: **2–4 s**. Não usar toast para informação crítica que exige ação.

---

## 53. Skeleton

Mesma dimensão do conteúdo final. Sem spinner global quando puder preservar layout.

---

## 54. Tabelas

Cockpit: quando comparação tabular for adequada (`OP | PRODUTO | PLANEJADO | REALIZADO | STATUS`).

Factory Floor: **evitar** tabelas.

---

## 55. Gráficos

**Permitido (Cockpit):** barras, ranking, linha temporal, sparkline, progresso, distribuição.

**Evitar:** pizza com muitas categorias; gauge decorativo; radar; 3D; dezenas de cores.

---

## 56. Princípio de visualização

Antes de criar um gráfico:

> Qual pergunta este gráfico responde melhor que um número, ranking ou lista?

Se não houver resposta: **não criar**.

---

## 57. Sparklines

```
EFICIÊNCIA  94%  ▁▂▃▃▄▆▅▇█
```

Sem eixos, grid ou legenda.

---

## 58. Meta

```
META DO TURNO
12.480 / 15.000
████████████████░░░  83%
Faltam 2.520 unidades
```

A última linha é mais acionável do que mostrar apenas 83%.

---

## 59. Gamificação — sequências

```
17
LOTES CONSECUTIVOS
DENTRO DO PADRÃO
```

Ícone pequeno (ex.: Flame) — não emoji.

---

## 60. Achievement

```
[ Trophy ]
MELHOR RESULTADO · Linha 02 · 97% de eficiência
```

Não usar cinco achievements enormes simultaneamente.

---

## 61. Factory Pulse

Componente futuro:

```
PULSO DA FÁBRICA
94
OPERAÇÃO SAUDÁVEL
●●●●●●●●●○
```

Enquanto a fórmula não estiver definida: **não mostrar 94**. Usar `Calculando...` ou ocultar.

---

## 62. Segmentos

```
● ● ● ● ● ● ● ○ ○ ○
```

Pode representar aderência, progresso, utilização, sequência. Não substituir barra quando precisão for importante.

---

## 63. Cards clicáveis

Desktop:

```css
transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
```

Hover: `transform: translateY(-1px);` — **somente se clicável**.

---

## 64. Factory Floor não depende de hover

Nunca esconder ação, tooltip necessário ou informação crítica atrás de hover.

---

## 65. Animações

> Movimento deve comunicar mudança de estado, não decorar a interface.

**Permitido:** entrada suave; progress; mudança de status; drawer; bottom sheet; confirmação; count-up eventual.

---

## 66. Entrada

```
opacity 0 → 1
translateY 3px → 0
```

Duração: **160–220 ms**.

---

## 67. Bottom Sheet

```
translateY(100%) → translateY(0)
220–280 ms
```

---

## 68. Progress

```
scaleX(0) → scaleX(valor)
300–450 ms
```

Não repetir continuamente.

---

## 69. Timer

Timer **não** deve pulsar. Em atenção: uma transição suave de estado.

Não: piscar / pulsar / tremer continuamente (fadiga industrial).

---

## 70. Alertas críticos

Uma única microanimação de entrada. Depois permanecem estáticos.

---

## 71. Reduced Motion

Obrigatório:

```css
@media (prefers-reduced-motion: reduce) {
  /* reduzir/remover animações */
}
```

---

## 72. Som

Não faz parte do Design System v1. Não adicionar alertas sonoros sem requisito específico.

---

## 73. Responsividade do Cockpit

| Perfil | Colunas |
|--------|---------|
| Large Desktop | 12 |
| Desktop | 12 |
| Tablet | 8 |
| Mobile gerencial | 4 |

---

## 74. Grid Cockpit

```css
display: grid;
grid-template-columns: repeat(12, minmax(0, 1fr));
gap: 12px; /* large desktop: 12–16px */
```

Não usar gaps gigantes.

---

## 75. Conteúdo Cockpit — padding

| Perfil | Padding |
|--------|---------|
| Desktop | 20–24 px |
| Tablet | 16 px |
| Mobile | 12 px |

---

## 76. Factory Floor — padding

| Perfil | Padding |
|--------|---------|
| Tablet horizontal | 16–20 px |
| Tablet vertical | 16 px |
| Mobile | 12–16 px |

---

## 77. Layout Floor

Não forçar grid de dashboard. Preferir:

```
HEADER → CONTEXT → PROCESS → ACTION → SECONDARY
```

---

## 78. Safe areas

Respeitar `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)` quando aplicável.

---

## 79. Sticky action

Em mobile, ação principal pode permanecer no rodapé, respeitando safe area:

```
[ FINALIZAR ETAPA ]
```

---

## 80. Orientação

Factory Floor deve funcionar em **LANDSCAPE** e **PORTRAIT**. Não bloquear orientação inicialmente.

---

## 81. Landscape operacional

```
┌────────────────────────┬──────────────┐
│ PROCESSO               │ FILA         │
│ 08:08 de 12:00         │ Próximos     │
│ [ FINALIZAR ]          │ lotes        │
└────────────────────────┴──────────────┘
```

---

## 82. Portrait operacional

```
PROCESSO → 08:08 de 12:00 → STATUS → [ FINALIZAR ] → PRÓXIMOS LOTES
```

---

## 83. Acessibilidade

Contraste mínimo: **WCAG AA**. Factory Floor deve preferir contraste ainda maior.

---

## 84. Texto em caixa alta

Pode ser usado em: STATUS · LABEL · AÇÃO OPERACIONAL.

Não escrever parágrafos inteiros em caixa alta.

---

## 85. Linguagem de ação

Preferir verbo + objeto:

- INICIAR BATIDA
- FINALIZAR AMASSAMENTO
- ENVIAR PARA FORNO
- REGISTRAR PERDA
- CONCLUIR LOTE

---

## 86. Linguagem de erro

| Evitar | Preferir |
|--------|----------|
| Error 409 / Invalid transition | ESTE LOTE AINDA NÃO PODE SER EMBALADO · Faltam 18 minutos de resfriamento. |

---

## 87. Estados Firebase

UI deve prever: **LOADING · SUCCESS · EMPTY · ERROR · OFFLINE · SYNCING · SYNCED · CONFLICT**

Não deixar esses estados para “depois”.

---

## 88. Indicador de sincronização — Floor

| Estado | Exibição |
|--------|----------|
| Normal | `● ONLINE` |
| Sincronizando | `↻ SINCRONIZANDO` |
| Offline | `○ OFFLINE · 2 registros pendentes` |

Não ocupar grande espaço quando tudo está normal.

---

## 89. Conflito

```
ESTE LOTE FOI ATUALIZADO EM OUTRO DISPOSITIVO
Estado atual: FORNEAMENTO
[ ATUALIZAR TELA ]
```

Nunca sobrescrever silenciosamente informação crítica.

---

## 90. Firebase timestamps

Toda exibição de horário deve partir de timestamps confiáveis persistidos.

Não usar relógio local como fonte oficial de evento sem estratégia definida.

---

## 91. Loading otimista

Ações simples podem usar optimistic UI quando seguro. Transição crítica não deve aparecer como definitivamente persistida sem confirmação/sincronização.

---

## 92. Fotografia

Não adicionar imagens decorativas de pão, fábrica ou máquinas aos dashboards.

Fotos somente com função (ex.: ocorrência, inspeção, equipamento, evidência de qualidade).

---

## 93. Logo

Logo oficial DC Pães: compacta no Cockpit (sidebar/header); pequena no Floor. A marca não deve competir com a tarefa.

---

## 94. Dark Mode

Não é prioridade v1. Não implementar sem validação real.

---

## 95. Factory Display

TV: fontes maiores; contraste maior; menos elementos; leitura à distância.

**Não** simplesmente ampliar o Cockpit.

---

## 96. Escala TV

| Elemento | Tamanho |
|----------|---------|
| Título | 24–32 px |
| KPI | 40–64 px |
| Status | 18–24 px |
| Informação secundária | 14–18 px |

---

## 97. Componentes base esperados

Button · IconButton · Input · NumericInput · Select · OperationalSelect · Checkbox · Badge · StatusBadge · Card · MetricCard · LotCard · EquipmentCard · AttentionCard · ProgressBar · SegmentedProgress · Timer · Timeline · TimelineStep · Ranking · RankingRow · Sparkline · Drawer · BottomSheet · Modal · Toast · Skeleton · EmptyState · ConnectionStatus · QRScanner · SectionHeader · PageHeader

---

## 98. Não duplicar componentes

Antes de criar `ProductionStatusBadge`, verificar se `StatusBadge` já resolve. Preferir variantes.

---

## 99. Variantes

```tsx
<StatusBadge status="normal" />
<StatusBadge status="warning" />
<StatusBadge status="critical" />
<StatusBadge status="waiting" />
<StatusBadge status="completed" />
```

Não criar cinco componentes.

---

## 100. Tailwind / CSS

- Tailwind → centralizar tokens na configuração/tema.
- CSS variables → centralizar em `styles/tokens.css` (ou equivalente).

Não misturar estratégias sem necessidade.

---

## 101. Regra para o Cursor

Ao implementar uma tela, **não** começar estilizando diretamente a página.

Primeiro verificar: token? componente? variante? padrão? — só então criar algo novo.

---

## 102. Checklist — Cockpit

- [ ] A hierarquia está clara?
- [ ] Existem cards demais?
- [ ] Há espaço morto?
- [ ] Os números importantes aparecem primeiro?
- [ ] Os gráficos respondem perguntas?
- [ ] Problemas têm destaque?
- [ ] Existe ação contextual?
- [ ] O laranja está sendo usado com moderação?
- [ ] A gamificação parece adulta?
- [ ] Funciona em tablet?

---

## 103. Checklist — Factory Floor

- [ ] A ação principal é óbvia?
- [ ] Consigo tocar sem precisão extrema?
- [ ] O botão principal é grande?
- [ ] Existe digitação desnecessária?
- [ ] O cronômetro é legível?
- [ ] O lote / produto / status são evidentes?
- [ ] Funciona sem hover?
- [ ] Funciona em landscape e portrait?
- [ ] Existe feedback após tocar?
- [ ] Erros são compreensíveis?
- [ ] A conexão está tratada?

---

## 104. Regra dos 3 segundos

Em tela operacional, em ~3 s o funcionário deve identificar:

> QUAL LOTE? · QUAL PRODUTO? · QUAL ETAPA? · QUAL STATUS? · O QUE FAÇO?

Se não conseguir: redesenhar.

---

## 105. Regra dos 5 segundos

No Cockpit, em ~5 s o gestor deve identificar:

> ESTAMOS BEM? · QUAL A PRODUÇÃO? · EXISTE ATRASO? · ONDE? · O QUE PRECISA DE ATENÇÃO?

---

## 106. Resultado esperado

| Experiência | Sensação |
|-------------|----------|
| Factory Cockpit | “Eu consigo enxergar a fábrica.” |
| Factory Floor | “Eu sei exatamente o que fazer.” |

Essa diferença deve ser perceptível mesmo com o **mesmo** Design System.

---

## Adendo — validação industrial

O material funcional já estabelece estados úteis ao Design System: **dentro do tempo · próximo do limite · atrasado · aguardando próxima etapa · não iniciado · finalizado**.

A fermentação valida o Timer: entrada, previsão de saída, tempo restante e alerta quando o lote estiver pronto para forneamento.

Esses componentes não existem por estética — correspondem ao processo industrial descrito.
