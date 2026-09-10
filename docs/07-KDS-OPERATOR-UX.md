# DOCUMENTO 07 — KDS OPERATOR UX

**DC Pães · Factory OS**

| | |
|---|---|
| **Versão** | 1.0 |
| **Status** | Especificação de experiência operacional |
| **Área** | Chão de Fábrica |
| **Dispositivos prioritários** | Tablets e smartphones |
| **Usuário principal** | Operador de produção |
| **Entrada** | Lote/execução liberado pelo workflow |
| **Princípio** | Escanear → entender → executar → confirmar |

O documento-base prevê estações KDS ao longo da produção, uso de QR para evitar digitação e operação distribuída por tablets.

---

## 1. Objetivo

O Factory Floor **não** deve parecer um ERP reduzido para tablet.

Ele deve parecer uma **ferramenta de trabalho da máquina/estação**.

O operador precisa responder rapidamente:

- QUAL LOTE?
- QUAL PRODUTO?
- QUAL ETAPA?
- ESTÁ TUDO CERTO?
- O QUE EU FAÇO AGORA?

A interface responde o restante.

---

## 2. Mandamento principal

> **Uma tela. Uma etapa. Uma ação dominante.**

Evitar na mesma hierarquia: Iniciar · Editar · Transferir · Atualizar · Histórico · Configurar · Imprimir · Mais.

Preferir:

```
[ INICIAR BATIDA ]

Registrar ocorrência
```

---

## 3. O operador não navega pelo sistema

| Cockpit | Factory Floor |
|---------|---------------|
| Sidebar → Produção → OP → Lote → Etapa | ESCANEAR QR → LOTE IDENTIFICADO → TELA CORRETA |

O QR deve funcionar como principal atalho contextual.

---

## 4. Factory Floor Shell

Rota: `/app/floor` — **sem** sidebar.

```
┌─────────────────────────────────────┐
│ DC PÃES   AMASSADEIRA 02   ● ONLINE│
├─────────────────────────────────────┤
│              CONTEÚDO               │
├─────────────────────────────────────┤
│ João Silva                    14:28 │
└─────────────────────────────────────┘
```

---

## 5. Header

Contexto relevante: DC PÃES · AMASSADEIRA 02 · ● ONLINE

Espaço limitado: `AMASSADEIRA 02 · ●` + logo pequena.

A **estação** é mais importante que a marca naquele momento.

---

## 6. Operador

Quando identificado: `João Silva` — no rodapé/menu contextual, não no header principal.

---

## 7. Troca de operador

```
João Silva
[ TROCAR OPERADOR ]
```

Troca explícita para evitar registros no funcionário anterior. Autenticação definitiva ainda a definir.

---

## 8. Home da estação

Sem processo ativo:

```
AMASSADEIRA 02
PRONTO PARA PRODUZIR

[ QR ] ESCANEAR LOTE

3 lotes aguardando
```

---

## 9. Scanner como ação principal

Material: scan → iniciar → finalizar. Funcionário não deve digitar números de lote.

`[ ESCANEAR QR ]` = ação de primeira classe.

---

## 10. Scanner permanente

Tablets dedicados: scanner acessível direto pela Home.

Não: Menu → Produção → Scanner → Abrir câmera.

---

## 11. Área de leitura

```
ESCANEIE O QR DO LOTE
┌──────────────────────────────┐
│         ┌──────────┐         │
│         │    QR    │         │
│         └──────────┘         │
└──────────────────────────────┘
Posicione o código dentro da área.
```

---

## 12. Feedback imediato

```
✓ LOTE IDENTIFICADO
PH26082601
```

~500–800 ms → abrir contexto.

---

## 13. Não adicionar confirmação inútil

Evitar: “Lote encontrado. Deseja abrir? [ NÃO ] [ SIM ]”

O usuário acabou de escanear para abrir.

---

## 14. QR inválido

```
QR NÃO RECONHECIDO
Tente novamente.
[ ESCANEAR NOVAMENTE ]
Digitar lote
```

---

## 15. Entrada manual

Contingência secundária: `Não consegue escanear? DIGITAR LOTE`

Não colocar campo de lote permanente acima do scanner.

---

## 16. Lote inexistente

```
LOTE NÃO ENCONTRADO
PH26082601
Verifique o código ou tente escanear novamente.
[ ESCANEAR NOVAMENTE ]
```

---

## 17. OP ainda não sincronizada

```
LOTE AINDA NÃO DISPONÍVEL
A Ordem de Produção ainda não foi recebida pelo Factory OS.
Tente novamente em instantes.
[ TENTAR NOVAMENTE ]
```

Não expor `HTTP 504` / `ERP API failed` ao operador.

---

## 18. Lote na etapa correta

```
✓ LOTE IDENTIFICADO
PH26082601 · PÃO HAMBÚRGUER 90g · BATIDA 01/05
ETAPA AMASSAMENTO · ● PRONTO
[ CONTINUAR ]
```

---

## 19. Pode eliminar CONTINUAR

Se não houver nada a conferir: scanner leva direto à tela da etapa. Menos interação é melhor.

---

## 20. Lote em etapa errada

```
ESTE LOTE ESTÁ EM OUTRA ETAPA
PH26082601
Etapa atual FERMENTAÇÃO
Este tablet está configurado para AMASSAMENTO.
[ ESCANEAR OUTRO LOTE ]
```

---

## 21. Não permitir override operacional

Operador **não** recebe `[ FORÇAR AMASSAMENTO ]`. Exceções em outro fluxo.

---

## 22. Tela pré-processo

```
AMASSAMENTO
PH26082601 · PÃO HAMBÚRGUER 90g · BATIDA 01/05
INFORMAÇÕES DA ETAPA ...
[ INICIAR AMASSAMENTO ]
```

---

## 23. Hierarquia

```
ETAPA → LOTE / PRODUTO → CONTEÚDO OPERACIONAL → STATUS → AÇÃO
```

---

## 24. Não exagerar no código do lote

```
AMASSAMENTO             ← 28px
Pão Hambúrguer 90g      ← 22px
PH26082601              ← 16px
```

Produto e etapa compreendidos mais rápido que o código.

---

## 25. Botão principal

```
height: 64–72px
width: 100%
[ INICIAR AMASSAMENTO ]
```

Não botão de 40 px de desktop.

---

## 26. Sticky Action

Telas verticais: `[ FINALIZAR ETAPA ]` fixa na parte inferior — especialmente com checklist.

---

## 27. Checklist da Amassadeira

Material: conferência de ingredientes antes de iniciar.

```
INGREDIENTES
○ Farinha 50 kg
○ Água 25 L
○ Açúcar 4 kg
```

Linha inteira clicável.

---

## 28. Confirmado

```
✓ Farinha 50 kg
```

Não exigir toque preciso em checkbox pequena.

---

## 29. Lote do ingrediente

Quando fizer parte do apontamento:

```
FARINHA · 50 kg
Lote da matéria-prima [ ESCANEAR ]
```

Preferir leitura de código se insumos tiverem identificação.

---

## 30. Não inventar QR de ingrediente

Material recomenda registrar lotes de origem, mas não define identificação física. Scanner de matéria-prima = possibilidade, não requisito confirmado.

---

## 31. Todos conferidos

```
5 DE 5 INGREDIENTES · ✓ TUDO CONFERIDO
[ INICIAR BATIDA ]
```

---

## 32. Processo ativo

Antes: preparar. Depois: acompanhar tempo e finalizar. Prioridade muda completamente.

---

## 33. Tela ativa padrão

```
AMASSAMENTO · Pão Hambúrguer 90g · PH26082601
TEMPO DECORRIDO 08:17 · ● NO PADRÃO · Padrão 12 min
████████████████░░░░
[ FINALIZAR AMASSAMENTO ]
Registrar ocorrência
```

---

## 34. Timer como protagonista

Tablet: **48–72 px** · `font-variant-numeric: tabular-nums`

---

## 35. Não usar timer gigantesco em toda estação

Amassadeira / Forno: timer pode dominar. Fermentação (múltiplos lotes): padrão visual muda.

---

## 36. Status temporal

```
● NO PADRÃO · ● ATENÇÃO · ● ATRASADO +08 min
```

Lógica alinhada ao material KDS.

---

## 37. Não pintar a tela toda

Mesmo atrasado: background neutro. Usar badge · indicador · barra · pequena superfície semântica.

---

## 38. Botão de ocorrência

Secundário: `Registrar ocorrência` — não competir com FINALIZAR ETAPA.

---

## 39. Bottom Sheet de ocorrência

```
REGISTRAR OCORRÊNCIA
O que aconteceu?
[ EQUIPAMENTO ] [ PRODUTO ] [ PROCESSO ] [ QUALIDADE ] [ OUTRO ]
[ CONFIRMAR ]
```

Categorias propostas — validar.

---

## 40. Motivo após categoria

Não abrir formulário enorme. Ex.: EQUIPAMENTO → PARADA · AJUSTE · FALHA · OUTRO (se catálogo existir).

---

## 41. Texto livre

Só quando necessário. Teclado = último recurso.

---

## 42. Ocorrência registrada

```
✓ OCORRÊNCIA REGISTRADA
```

Volta imediatamente ao processo. Não redirecionar para módulo de ocorrências.

---

## 43. Ocorrência bloqueante

```
PROCESSO BLOQUEADO
Falha no equipamento
Aguardando liberação do supervisor.
```

Lógica a validar.

---

## 44. Finalização simples

Sem dados adicionais: FINALIZAR → `✓ ETAPA CONCLUÍDA`. Sem “Tem certeza?” para ação rotineira.

---

## 45. Quando usar confirmação

Somente se: difícil de reverter · resultado a informar · risco operacional · valor anormal.

---

## 46. Modelagem exige resultado

```
FINALIZAR MODELAGEM
Quantidade esperada 1.000
QUANTIDADE PRODUZIDA [ 986 ]
Perda calculada 14 un. · 1,4%
[ CONFIRMAR ]
```

---

## 47. Teclado numérico

`inputmode="numeric"` — não QWERTY. Campo grande.

---

## 48. Valor sugerido

Pré-preencher produzido com esperado? **Não definir ainda.** Acelera operação, mas incentiva confirmação sem medição. Validar com a fábrica.

---

## 49. Perda

Quando calculável: ESPERADO · PRODUZIDO → PERDA · %

---

## 50. Embandejamento

```
EMBANDEJAMENTO · Pão Hambúrguer 90g · PH26082601
Quantidade 986 un. · BANDEJAS [ 42 ]
Tempo 12:08 · ● NO PADRÃO
[ CONCLUIR ]
```

---

## 51. Stepper

Para 42 bandejas, +/- a partir de zero é ruim. Preferir teclado numérico; stepper só para pequenos ajustes.

---

## 52. Fermentação é diferente

Torre de controle compacta: câmara, lote, produto, entrada, previsão, tempo restante.

---

## 53. Fermentação — landscape

```
FERMENTAÇÃO · ● ONLINE · 3 LOTES ATIVOS

CÂMARA 01 · Hambúrguer · PH26082601 · 00:42 restantes · ● NO PADRÃO
CÂMARA 02 · Hot Dog · HD26082602 · 00:12 restantes · ● ATENÇÃO

[ + ENTRADA DE LOTE ]
```

---

## 54. Ordenação da Fermentação

```
ATRASADOS → PRONTOS → PRÓXIMOS DO LIMITE → DEMAIS
```

Não simplesmente número da câmara.

---

## 55. Lote pronto

```
PRONTO PARA FORNEAMENTO
Pão Hambúrguer 90g · PH26082601 · Câmara 01
Pronto há 06 min
[ TRANSFERIR PARA FORNO ]
```

Alerta de lote pronto = requisito do material.

---

## 56. Transferir para forno

Preferência arquitetural: **estação de destino confirma fisicamente a chegada** (melhor rastreabilidade).

---

## 57. Portanto

```
Fermentação: PRONTO PARA FORNO
Forno: SCAN QR → CONFIRMA TRANSFERÊNCIA
```

Evita dizer que o lote está no forno quando ainda está na câmara.

---

## 58. Forneamento

```
FORNEAMENTO · Pão Hambúrguer 90g · PH26082601
FORNO [ FORNO 01 ] · TEMPERATURA 180°C · TEMPO 14 min
[ INICIAR FORNEAMENTO ]
```

---

## 59. Equipamento indisponível

```
FORNO 01 · ● EM USO · 12 min restantes
FORNO 02 · ● DISPONÍVEL
```

Linha inteira selecionável.

---

## 60. Forno ativo

```
FORNO 01 · Pão Hambúrguer 90g · PH26082601
TEMPO RESTANTE 08:42 · 180°C · ● NO PADRÃO
[ FINALIZAR FORNEAMENTO ]
Registrar ocorrência
```

---

## 61. Temperatura real

Se apontamento manual: `[ 182 ] °C`. Não assumir captura automática de máquina.

---

## 62. Resfriamento

```
RESFRIAMENTO · Pão Hambúrguer 90g · PH26082601
LIBERAÇÃO EM 38:42 · Mínimo 60 min · ● RESFRIANDO
EMBALAGEM BLOQUEADA
```

---

## 63. Atingiu mínimo

```
✓ LIBERADO PARA EMBALAGEM
PH26082601
Resfriamento mínimo concluído.
[ PRÓXIMO LOTE ]
```

Não significa embalagem iniciada.

---

## 64. Embalagem

Mais dados do material — mesmo assim, **não** formulário ERP.

---

## 65. Embalagem em blocos

```
FINALIZAR EMBALAGEM
PRODUÇÃO: Recebido 986 · Embalado [ 970 ]
EMBALAGENS: Pacotes [ 97 ] · Peso médio [ 900 ] g
IDENTIFICAÇÃO: Fabricação 28 AGO · Validade [ ... ] · Lote PH26082601
PERDA: 16 un. · 1,6%
[ FINALIZAR LOTE ]
```

---

## 66. Dados automáticos

Fabricação do dia preenchida automaticamente. Não digitar data de hoje.

---

## 67. Validade

Se calculável via shelf life do produto: mostrar automaticamente. Material **não** define regra — não implementar cálculo até fonte oficial.

---

## 68. Finalização do lote

```
✓ LOTE CONCLUÍDO
PÃO HAMBÚRGUER 90g · PH26082601
970 UNIDADES EMBALADAS
[ PRÓXIMO LOTE ]
```

---

## 69. Zero clique desnecessário após sucesso

Sucesso ~1–2 s e retorna à estação, ou `[ PRÓXIMO LOTE ]`. Definir após teste operacional.

---

## 70. Fila

```
PRÓXIMOS
PH26082604 · Hambúrguer · ● PRONTO
HD26082603 · Hot Dog · ○ AGUARDANDO
```

---

## 71. A fila não substitui QR

QR = identificação física principal. Fila = antecipação operacional.

---

## 72. Landscape tablet

```
┌────────────────────────┬───────────────┐
│ PROCESSO ATUAL (~70%)  │ PRÓXIMOS 30%  │
│ 08:42 · ● NO PADRÃO    │ lote 02…      │
│ [ FINALIZAR ]          │               │
└────────────────────────┴───────────────┘
```

---

## 73. Portrait

```
PROCESSO ATUAL → 08:42 → ● NO PADRÃO → [ FINALIZAR ] → PRÓXIMOS
```

---

## 74. Smartphone

Só processo atual; fila abaixo. Sem duas colunas.

---

## 75. Uso com luva

Botões grandes · espaçamento maior · cards tocáveis · sem tiny icons · sem menus minúsculos.

---

## 76. Não usar swipe como única ação

Controles visíveis obrigatórios.

---

## 77. Não depender de tooltip

Tablet sem hover confiável. Informação necessária visível.

---

## 78. Contraste

Floor privilegia legibilidade (metros de distância). Cockpit pode ser mais delicado.

---

## 79. Textos mínimos

Preferir `FINALIZAR BATIDA` a “Clique aqui para finalizar a batida atual”.

---

## 80. Confirmações

Evitar modal rotineiro “TEM CERTEZA?” — vira botão que ninguém lê.

---

## 81. Confirmação contextual

Mostra o que será registrado:

```
FINALIZAR MODELAGEM · Produzido 986 · Perda 14 · 1,4%
[ CONFIRMAR ]
```

---

## 82. Valores anormais

```
CONFIRA A QUANTIDADE
A quantidade informada está 50% abaixo do esperado.
500 unidades
[ CORRIGIR ] [ CONFIRMAR 500 ]
```

Limite configurado — não inventado.

---

## 83. Sem conexão

Processo atual permanece visível: `○ SEM CONEXÃO · Tentando reconectar...`

---

## 84. Ação indisponível offline

```
FINALIZAÇÃO TEMPORARIAMENTE INDISPONÍVEL
Precisamos confirmar o estado atual deste lote antes de avançar.
Tentando reconectar...
```

---

## 85. Não culpar o usuário

Preferir `SEM CONEXÃO COM O SISTEMA` a “Você perdeu a conexão.”

---

## 86. Sincronização pendente

```
↻ SINCRONIZAÇÃO PENDENTE
```

Não dizer `✓ SINCRONIZADO` antes da confirmação.

---

## 87. Firebase não aparece na UX

Nunca `Firestore offline` para operador. Área técnica/admin apenas.

---

## 88. Tablet bloqueado

Dispositivo associado à estação: operador comum não altera acidentalmente. Configuração protegida.

---

## 89. Modo estação

```
DISPOSITIVO → STATION ID → FACTORY FLOOR
```

Após login do operador, contexto pronto.

---

## 90. Login

Não projetar login complexo agora. Verificar Auth existente. UX deve suportar **ESTAÇÃO + OPERADOR ATUAL** como conceitos distintos.

---

## 91. Sessão

Tablet compartilhado: sessão do dispositivo ≠ identidade do operador. Detalhe em Roles & Permissions.

---

## 92. Tela de bloqueio operacional

```
AMASSADEIRA 02
SELECIONE O OPERADOR
[ JOÃO ] [ MARCOS ] [ IDENTIFICAR OUTRO ]
```

Possibilidade — não implementar até definir autenticação.

---

## 93. Feedback tátil

Vibração curta após scan/ação = aprimoramento. Não depender.

---

## 94. Som

Não implementar inicialmente. Ambiente ruidoso + vários tablets = confusão.

---

## 95. Alertas

```
ATENÇÃO · PH26082601 · Fermentação · 15 min restantes
```

Não popup bloqueando tarefa sem necessidade.

---

## 96. Alertas da própria estação

Maior prioridade. Outras estações → Cockpit/Display ou área secundária.

---

## 97. Full-screen crítico

Só situação realmente bloqueante — não atraso normal.

---

## 98. Empty state

```
TUDO CERTO POR AQUI
Nenhum lote aguardando nesta estação.
```

Sem ilustração decorativa grande.

---

## 99. Loading

`CARREGANDO LOTE...` com skeleton. Não spinner gigante.

---

## 100. Atualização em background

Realtime sem layout pular. Preservar posição dos elementos.

---

## 101. Mudança de status

`NO PADRÃO → ATENÇÃO`: transição discreta. Sem animação contínua.

---

## 102. Registro de toque

Após toque: `[ FINALIZANDO... ]` — desabilitar botão imediatamente (anti duplo envio).

---

## 103. Sucesso

Somente após política de confirmação: `✓ ETAPA REGISTRADA`

---

## 104. Erro concorrente

```
ESTE LOTE JÁ FOI ATUALIZADO
Etapa atual FORNEAMENTO
[ ATUALIZAR ]
```

Não permitir sobrescrita.

---

## 105. Histórico no Floor

Sem histórico completo. Resumo via “Ver informações do lote”. Rastreabilidade completa = Cockpit.

---

## 106. Informações rápidas

Bottom sheet: lote · produto · OP · etapa · início.

---

## 107. Sem dados administrativos irrelevantes

Não mostrar: Firebase ID · Integration ID · API status · createdAt · updatedAt · hash · version.

---

## 108. Factory Display ≠ Factory Floor

| Display | Floor |
|---------|-------|
| VER | FAZER |

Não reutilizar tela de TV no tablet.

---

## 109. Componentes específicos

StationHeader · OperatorBadge · ConnectionIndicator · QRScanner · LotIdentity · ProductIdentity · OperationalChecklist · OperationalChecklistItem · ProcessTimer · TimingStatus · PrimaryOperationalAction · SecondaryOperationalAction · NumericEntry · QuantitySummary · StationQueue · StationQueueItem · EquipmentSelector · OccurrenceSheet · OperationalSuccess · OperationalBlock · OperationalError

---

## 110. Componentes reutilizáveis

Não criar MixingTimer / BakingTimer / CoolingTimer se `ProcessTimer` com variantes resolve.

---

## 111. ProcessScreen

```tsx
<ProcessScreen station={station} lot={lot} step={step} status={status}>
  ...
</ProcessScreen>
```

Padroniza: header · identidade · status · rodapé · ações.

---

## 112. Station behavior

Diferença entre estações = configuração/domínio + componentes específicos. Não cópia integral da página.

---

## 113. Critério de aprovação

- [ ] Operador entende a etapa sem treinamento de software?
- [ ] Produto / lote / ação principal evidentes?
- [ ] Toque com baixa precisão possível?
- [ ] Sem digitação evitável?
- [ ] Timer legível? Status com texto?
- [ ] Erro explica o que fazer?
- [ ] Landscape e portrait?
- [ ] Sem hover? Sem depender só de cor?
- [ ] Duplo toque protegido? Concorrência tratada?
- [ ] Offline tratado?

---

## 114. Meta de interação

Fluxo normal:

```
SCAN → CONFERIR → INICIAR → FINALIZAR
```

Cada transição = uma decisão óbvia, não sequência de formulários.

---

## 115. Meta cognitiva

Em ~3 segundos:

> “Estou produzindo o quê, em qual etapa e o que faço agora?”

---

## 116. Fluxo UX final

```
FACTORY FLOOR → ESTAÇÃO FIXA → ESCANEAR QR → IDENTIFICAR LOTE
  → VÁLIDO → ETAPA ATUAL → READY → INICIAR → IN_PROGRESS
       → NORMAL ou OCORRÊNCIA → FINALIZAR → REGISTRAR RESULTADO
       → SUCCESS → PRÓXIMO LOTE
  → INVÁLIDO → EXPLICAR
```

---

## 117. O ponto mais importante

> O KDS deve **retirar** decisões de software do funcionário, não adicionar.

O material original já aponta nessa direção: QR por lote para não digitar números — essencialmente escanear, iniciar e finalizar.

Nosso trabalho é levar esse princípio para **todas** as telas operacionais.
