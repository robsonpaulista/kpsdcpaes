# DOCUMENTO 01 — PRODUCT VISION & PRODUCT PRINCIPLES

**DC Pães · Sistema Integrado de Produção**

| | |
|---|---|
| **Versão** | 1.0 |
| **Status** | Documento de produto |
| **Público** | Produto, Design, Engenharia e Cursor |
| **Plataformas** | Desktop · Tablet · Mobile |
| **Backend / Banco** | Firebase existente do cliente |

---

## 1. Visão do produto

O sistema da DC Pães deve funcionar como uma **plataforma operacional da fábrica**, conectando planejamento, execução, rastreabilidade e gestão em um fluxo contínuo.

O objetivo **não** é apenas registrar produção.

O objetivo é permitir que a fábrica saiba:

- O que deveria estar acontecendo?
- O que está acontecendo agora?
- O que está atrasado?
- O que precisa acontecer em seguida?
- Onde estão as perdas?
- Onde estão os gargalos?
- Qual equipamento está comprometendo o fluxo?
- Qual lote precisa de atenção?

O produto deve transformar dados operacionais em **orientação de ação**.

---

## 2. North Star do produto

A principal promessa do sistema é:

> Dar visibilidade do fluxo completo da produção e reduzir o esforço necessário para executar e registrar cada etapa.

| Ambiente | Promessa |
|----------|----------|
| **Chão de fábrica** | Menos digitação. Menos dúvida. Menos erro. |
| **Gestão** | Menos procura. Mais contexto. Decisão mais rápida. |

---

## 3. O produto possui dois mundos

Toda decisão de produto deve respeitar a existência de **duas experiências distintas**.

### 3.1 Factory Floor

Ambiente operacional.

**Usuários principais:** operadores, auxiliares, responsáveis por máquinas, encarregados de etapas, equipe de embalagem.

**Características:**

- Touch-first
- Mobile/tablet first
- Alta legibilidade
- Pouca informação por tela
- Ações grandes
- Fluxo guiado
- QR Code
- Cronômetros
- Status visuais
- Pouquíssima digitação

### 3.2 Factory Cockpit

Ambiente gerencial.

**Usuários principais:** PCP, supervisão, gerência, administração, coordenação de produção.

**Características:**

- Desktop-first
- Alta densidade informacional
- Visão geral da fábrica
- Comparações
- Alertas
- Ranking
- Gargalos
- Produção planejada × realizada
- Perdas
- Equipamentos
- Rastreabilidade
- Histórico

---

## 4. O mesmo dado, duas apresentações

**Regra fundamental:**

> Factory Floor e Factory Cockpit podem consumir os mesmos dados, mas **nunca** precisam apresentar esses dados da mesma maneira.

### Operador

```
FERMENTAÇÃO
PH26082601
02:14 restantes
● NO PADRÃO

[ FINALIZAR ETAPA ]
```

### Gestor

```
FERMENTAÇÃO

4 lotes em andamento
2 dentro do padrão · 1 próximo do limite · 1 atrasado

Tempo médio hoje: 4h58
Padrão: 5h00
Aderência: 96%
```

Mesma realidade operacional. Duas necessidades diferentes.

---

## 5. Personas centrais

Não criar personas fictícias excessivamente detalhadas. As personas devem representar **funções reais** do processo.

### PERSONA 01 — PCP / PLANEJAMENTO

**Objetivo:** Programar e liberar a produção a partir das OPs do sistema gestor.

> **Correção (Doc 05):** a OP **não nasce** no Factory OS. Nasce no sistema gestor e é importada/sincronizada (API). Factory OS = execução industrial.

**Precisa responder:**

- Quais OPs chegaram / foram sincronizadas hoje?
- Quais estão validadas, bloqueadas ou requerem atenção?
- Qual produto ainda não está mapeado?
- Quanto produzir (plano do gestor) e o que já está liberado?
- Qual linha/equipamento poderá executar?
- Quais lotes/batidas estão prontos para o Floor?

**Principais ações:** acompanhar sincronização; validar OP importada; mapear produto; enriquecer com dados industriais; liberar para produção; tratar alterações do gestor; acompanhar execução.

**Não é ação padrão:** criar OP do zero no Factory OS.

> Campos de plano (quantidade, data, produto) vêm do gestor. Ficha técnica: source a definir após análise da API (Docs 05 / 05A).

### PERSONA 02 — OPERADOR

**Objetivo:** Executar corretamente a etapa atual.

**Precisa responder:**

- Qual lote estou trabalhando?
- Qual produto?
- O que preciso fazer?
- Qual quantidade?
- Qual tempo?
- Está dentro do padrão?
- Qual é o próximo passo?

**Principais ações:** escanear lote; confirmar itens; iniciar; finalizar; informar quantidade; registrar perda; registrar ocorrência.

### PERSONA 03 — SUPERVISOR

**Objetivo:** Manter a produção fluindo.

**Precisa responder:**

- Onde estão os lotes?
- O que está atrasando?
- Qual etapa está acumulando?
- Qual equipamento está parado?
- O que precisa de intervenção agora?

**Principais ações:** acompanhar KDS; identificar gargalos; acompanhar atrasos; redistribuir operação quando permitido; tratar ocorrência; verificar disponibilidade de equipamento.

### PERSONA 04 — GESTOR

**Objetivo:** Entender performance e tomar decisões.

**Precisa responder:**

- Estamos entregando o plano?
- Quanto produzimos?
- Quanto perdemos?
- Qual produto gera mais perda?
- Qual etapa gera mais atraso?
- Qual equipamento performa melhor?
- Qual equipamento está mais parado?

> O material já prevê indicadores de produção planejada, realizada, aderência, eficiência, perdas, tempos, equipamentos, qualidade e ocorrências.

---

## 6. Mapa macro do produto

O sistema deve ser organizado por **domínios**.

```
FACTORY COCKPIT
├── Visão Geral
├── Produção
│   ├── Hoje
│   ├── Ordens de Produção
│   ├── Lotes
│   └── Histórico
├── PCP
│   ├── Programação / Hoje
│   ├── Ordens recebidas (sincronizadas)
│   ├── Validação / Atenção
│   └── Liberação para produção
├── Qualidade
│   ├── Perdas
│   ├── Ocorrências
│   ├── Retrabalho
│   └── Lotes reprovados
├── Equipamentos
│   ├── Estado atual
│   ├── Utilização
│   ├── Paradas
│   └── Histórico
├── Rastreabilidade
├── Produtos
│   ├── Cadastro
│   ├── Ficha técnica
│   └── Tempos padrão
├── Relatórios
└── Configurações
```

---

## 7. Factory Floor não deve copiar esse menu

No chão de fábrica, **evitar:**

- Dashboard
- Produção
- Lotes
- Equipamentos
- Relatórios
- Configurações

Isso exige navegação cognitiva desnecessária.

**Preferir:**

```
ESTAÇÃO ATUAL
        ↓
LOTE ATUAL
        ↓
AÇÃO ATUAL
```

---

## 8. Conceito de estação

Cada tablet pode estar associado a uma estação.

```
TABLET 03
ESTAÇÃO: FERMENTAÇÃO
Dispositivo: TAB-FERM-01
```

Isso permite que o sistema saiba antecipadamente:

- quais lotes são relevantes;
- quais ações estão disponíveis;
- quais equipamentos podem aparecer;
- quais dados devem ser destacados.

---

## 9. Home operacional

Se não existir lote selecionado:

```
FERMENTAÇÃO

4 LOTES AGUARDANDO

[ ESCANEAR LOTE ]

────────────────

PRÓXIMOS

PH26082601 · Hambúrguer · Pronto para entrada
HD26082602 · Hot Dog · Aguardando
PF26082604 · Pão de Forma · Aguardando
```

**Não mostrar gráficos.**

---

## 10. Home gerencial

A Home gerencial deve ser montada ao redor de **situação operacional**.

```
PULSO DA FÁBRICA
PRODUÇÃO DO TURNO
FLUXO AO VIVO
ATENÇÃO AGORA
GARGALOS
PERFORMANCE DAS LINHAS
PERDAS
EQUIPAMENTOS
QUALIDADE
```

---

## 11. Regra: situação antes de histórico

Sempre que existir dado atual e histórico, mostrar nesta ordem:

1. **AGORA**
2. **COMPARAÇÃO**
3. **HISTÓRICO**

Exemplo:

```
FORNO 02
● OPERANDO
3 lotes hoje

Eficiência 94%
↑ 3,8% vs. média 7 dias

[ Ver histórico ]
```

---

## 12. Princípio da exceção

O sistema **não** deve exigir que o usuário procure problemas. Problemas devem **emergir**. Normalidade pode ser mais silenciosa.

- 12 lotes normais → não precisa ocupar metade da tela
- **1 LOTE ATRASADO** → merece destaque

---

## 13. Attention Queue

O Cockpit deve possuir uma área chamada conceitualmente:

> **ATENÇÃO AGORA**

Exemplo:

```
ATENÇÃO AGORA                           3

CRÍTICO
PH26082601 · Fermentação · +18 min
[ Ver lote ]

ATENÇÃO
Forno 02 · Parado há 22 min
[ Ver equipamento ]

ATENÇÃO
HD26082603 · Perda acima do padrão · 4,8%
[ Analisar ]
```

Essa área é mais importante que muitos gráficos.

---

## 14. Regra de ação

Todo item crítico deve possuir uma **próxima ação** coerente.

Não transformar o Cockpit em painel meramente informativo.

---

## 15. Progressão visual

A gamificação refinada será baseada em:

**META · PROGRESSO · ADERÊNCIA · SEQUÊNCIA · POSIÇÃO · DESTAQUE · MOVIMENTO**

Exemplo:

```
META DO TURNO
12.480 / 15.000 un.
████████████████░░░░
83%
```

---

## 16. Score operacional

Poderá existir no futuro:

```
PULSO DA FÁBRICA
94 / 100
```

Porém: **não implementar fórmula** até que seja formalmente definida.

O Cursor deve usar placeholder estrutural ou ocultar o componente enquanto não houver regra validada.

---

## 17. Rankings permitidos

**Exemplos úteis:**

- Eficiência por linha
- Perda por produto
- Tempo por processo
- Utilização por equipamento
- Aderência por turno

**Evitar como padrão:**

- Melhores funcionários
- Piores funcionários

---

## 18. Produtos

Produto deve ser uma **entidade forte**.

Exemplo: **PÃO HAMBÚRGUER 90g**

- Ficha técnica
- Tempos padrão
- Peso
- Receita
- Processos
- Validade
- Parâmetros

> O documento-base deixa claro que os tempos devem variar por produto.

---

## 19. Ficha técnica

A OP deve herdar a ficha técnica do produto.

Exemplo-base:

| Insumo | Quantidade |
|--------|------------|
| Farinha | 50 kg |
| Água | 25 L |
| Açúcar | 4 kg |
| Fermento | 1 kg |
| Gordura | 2 kg |

O sistema deve poder registrar **lote de origem** do ingrediente para rastreabilidade.

---

## 20. Produção por batida

A arquitetura deve suportar OPs divididas em batidas.

```
OP 260826-001
5.000 unidades · 5 batidas

BATIDA 1 ✓
BATIDA 2 ✓
BATIDA 3 ●
BATIDA 4 ○
BATIDA 5 ○
```

Isso deve estar explícito na modelagem futura.

---

## 21. Quantidade em múltiplos níveis

Evitar um único campo genérico `quantity`.

Dependendo da etapa, poderemos ter:

- quantidade planejada
- quantidade recebida
- quantidade processada
- quantidade produzida
- quantidade aprovada
- quantidade embalada
- perda
- pacotes
- bandejas

> O material usa diferentes grandezas ao longo das etapas (ex.: produção esperada e perda na modelagem; bandejas no embandejamento; quantidade embalada/pacotes na embalagem).

---

## 22. Perda

Perda **não** deve ser somente um KPI final. Precisa possuir contexto.

```
PERDA
Quantidade     14 unidades
Percentual     1,4%
Etapa          Modelagem
Produto        Pão Hambúrguer 90g
Lote           PH26082601
Motivo         [quando registrado]
```

---

## 23. Ocorrências

Ocorrência deve ser registrada em poucos passos.

```
REGISTRAR OCORRÊNCIA

O que aconteceu?
[ Máquina ] [ Produto ] [ Qualidade ] [ Insumo ] [ Outro ]
        ↓
selecionar motivo
        ↓
[ CONFIRMAR ]
```

Texto livre opcional.

---

## 24. Equipamento

Estado conceitual:

```
OPERANDO · AGUARDANDO · PARADO · MANUTENÇÃO · INDISPONÍVEL
```

Cada equipamento deve acumular histórico.

---

## 25. Qualidade

Primeira versão deve prever estrutura para:

- lote reprovado
- retrabalho
- ocorrências
- perdas
- bloqueios
- liberação

Mesmo que nem todos sejam implementados no MVP.

---

## 26. Rastreabilidade

A busca precisa começar por:

**QR CODE** ou **LOTE**

Depois apresentar a história inteira do lote em **ordem cronológica**.

Não criar uma tela parecida com uma tabela fiscal. Preferir **timeline**.

---

## 27. Firebase — decisão arquitetural

O projeto utilizará **Firebase já existente** do mesmo cliente.

Portanto: **não** criar novo backend paralelo por padrão.

Antes de implementar qualquer camada de dados, o Cursor deverá inspecionar a configuração Firebase existente e identificar:

- Firebase Project ID
- Firestore
- Authentication
- Storage
- Cloud Functions
- Hosting
- Analytics
- App Check
- Realtime Database

somente os serviços **efetivamente existentes**.

---

## 28. Regra crítica sobre o Firebase existente

Não assumir que o projeto atual foi modelado para este sistema industrial.

```
INSPECIONAR
    ↓
MAPEAR
    ↓
IDENTIFICAR O QUE PODE SER REUTILIZADO
    ↓
ISOLAR O NOVO DOMÍNIO
```

**Nunca** misturar coleções indiscriminadamente.

---

## 29. Namespace / domínio

Preferir organização clara do novo domínio. Exemplo conceitual:

```
productionOrders
productionLots
productionSteps
products
technicalSheets
ingredients
ingredientLots
equipment
productionEvents
losses
occurrences
stations
users
roles
```

Os nomes definitivos serão estabelecidos no documento de modelagem Firebase.

---

## 30. Não migrar ou apagar dados existentes

**Regra absoluta:**

> O novo sistema não deve alterar, renomear ou remover estruturas existentes do cliente sem análise específica.

O Cursor deve considerar o Firebase existente um **ambiente compartilhado**.

---

## 31. Firebase Authentication

Se o projeto já possuir autenticação: **reutilizar quando compatível**.

O sistema deverá futuramente suportar papéis como:

```
ADMIN · PCP · MANAGER · SUPERVISOR · OPERATOR · QUALITY · VIEWER
```

A nomenclatura final será definida em documento próprio.

---

## 32. Firestore e operação em fábrica

A preferência inicial será usar **Firestore** como principal banco operacional, caso seja o banco já utilizado no projeto existente.

**Não assumir isso sem inspecionar.**

O documento técnico deverá avaliar: listeners em tempo real; cache; writes offline; sincronização; conflitos; segurança; custos de leitura; índices; volumes.

---

## 33. Offline

Firebase oferece recursos úteis para operação com conectividade instável, mas isso não elimina a necessidade de projetar o comportamento corretamente.

A interface deve comunicar estados como:

```
● ONLINE

○ SEM CONEXÃO
3 registros aguardando sincronização
```

**Nunca** bloquear silenciosamente uma ação operacional sem explicar o motivo.

---

## 34. Regra de consistência

Em operações críticas, não confiar apenas na interface.

Exemplo: dois tablets não devem conseguir concluir a mesma transição incompatível do lote sem controle de concorrência.

Esse ponto será tratado no documento técnico com: transaction; optimistic concurrency; versionamento; timestamps; regras Firestore/Cloud Functions quando apropriado.

---

## 35. Eventos de produção

Além do estado atual do lote, manter **histórico de eventos**.

Exemplo:

```
LOT_CREATED
MIXING_STARTED
MIXING_COMPLETED
MODELING_STARTED
MODELING_COMPLETED
PROOFING_STARTED
PROOFING_COMPLETED
BAKING_STARTED
...
```

Isso permitirá reconstruir o histórico.

**Evitar** guardar apenas `currentStatus = "BAKING"` e perder tudo que aconteceu antes.

---

## 36. Dados derivados

KPIs devem preferencialmente ser **derivados** dos dados operacionais.

| KPI | Derivação (conceitual) |
|-----|------------------------|
| Tempo real | `finishedAt - startedAt` |
| Perda % | `perda / quantidade recebida` |
| Aderência | `produção realizada / produção planejada` |

A fórmula final de cada KPI será documentada.

---

## 37. Fonte única de verdade

Evitar atualizar manualmente o mesmo estado em várias coleções sem necessidade.

Sempre definir: **qual entidade é a fonte oficial daquele dado?** — e derivar outras visualizações a partir dela.

---

## 38. Realtime

Nem tudo precisa ser realtime.

**Realtime prioritário para:**

- estado dos lotes
- cronômetros ativos
- fila da estação
- alertas
- equipamentos
- produção atual

Históricos e relatórios podem adotar estratégias mais econômicas.

---

## 39. Princípio de custo

Como Firebase possui custo associado ao volume de operações:

- não implementar listeners globais gigantes;
- evitar escutar toda a produção histórica para exibir 4 lotes em andamento;
- queries devem ser **contextuais**.

---

## 40. Perfis de tela

Toda especificação futura deverá marcar:

`[DESKTOP]` · `[TABLET]` · `[MOBILE]` · `[TV/KDS]`

para deixar explícito onde cada tela deve funcionar.

---

## 41. Matriz inicial

| Tela | Perfis |
|------|--------|
| Home gerencial | DESKTOP / TABLET |
| PCP | DESKTOP |
| Ordem de Produção | DESKTOP / TABLET |
| Produção ao vivo | DESKTOP / TV |
| KDS Estação | TABLET / MOBILE |
| Lote | TODOS |
| Rastreabilidade | DESKTOP / TABLET |
| Equipamentos | DESKTOP / TABLET |
| Ocorrência | TABLET / MOBILE |
| Relatórios | DESKTOP |
| Configurações | DESKTOP |

---

## 42. Regra de mobile

Mobile **não** significa simplesmente reduzir o desktop.

Em Factory Floor, mobile pode ser uma experiência **primária**. Portanto a hierarquia poderá mudar completamente.

---

## 43. Botões operacionais

Evitar `[ Salvar ]` quando uma ação mais específica for possível.

Preferir:

- `[ INICIAR AMASSAMENTO ]`
- `[ FINALIZAR MODELAGEM ]`
- `[ ENVIAR PARA FERMENTAÇÃO ]`
- `[ LIBERAR PARA EMBALAGEM ]`

O botão deve dizer **exatamente** o que acontecerá.

---

## 44. Confirmações

Evitar modal de confirmação para todas as ações.

Confirmação extra somente para: ação irreversível; perda relevante; reprovação; cancelamento; mudança excepcional; dados críticos.

---

## 45. Undo

Quando tecnicamente seguro, preferir:

```
Ação registrada
[ Desfazer ]
```

por alguns segundos, em vez de um modal antes de cada ação.

**Não** usar Undo para operações industriais que não possam ser revertidas logicamente.

---

## 46. Linguagem

A interface deve falar a **linguagem da fábrica**.

| Evitar | Preferir |
|--------|----------|
| Process entity | Lote |
| Workflow instance | Batida |
| Operation node | Forno, Câmara, Produção, Perda, Embalagem |

---

## 47. Product Principles

Toda feature deve obedecer estes dez princípios:

1. **O lote é o centro.**
2. **A próxima ação deve ser óbvia.**
3. **Digitação é exceção.**
4. **Status deve ser instantaneamente compreensível.**
5. **Problemas devem emergir.**
6. **Dados devem levar a uma ação.**
7. **O Factory Floor deve ser extremamente simples.**
8. **O Cockpit pode ser sofisticado, mas nunca confuso.**
9. **Histórico não pode ser perdido.**
10. **Tecnologia não pode atrapalhar a produção.**

---

## 48. Critério de aprovação de uma tela operacional

Antes de aprovar, responder **SIM** para:

- [ ] Um funcionário novo entende o que fazer?
- [ ] A ação principal está clara?
- [ ] Dá para operar com toque?
- [ ] Os botões são grandes?
- [ ] Existe digitação desnecessária? *(resposta desejada: não)*
- [ ] O status é legível à distância?
- [ ] A tela funciona sem hover?
- [ ] Há alguma informação que não ajuda a tarefa? *(resposta desejada: não)*
- [ ] É possível cometer um erro fácil por causa do design? *(resposta desejada: não)*

---

## 49. Critério de aprovação do Cockpit

Responder **SIM** para:

- [ ] Em 5 segundos sei se a fábrica está bem?
- [ ] Consigo identificar problemas?
- [ ] Consigo identificar o lote responsável?
- [ ] Consigo agir a partir do alerta?
- [ ] Existe hierarquia?
- [ ] Os KPIs possuem contexto?
- [ ] Os gráficos realmente ajudam?
- [ ] Existe excesso de card? *(resposta desejada: não)*
- [ ] Existe espaço vazio sem intenção? *(resposta desejada: não)*
- [ ] Existe informação duplicada? *(resposta desejada: não)*

---

## 50. Resultado esperado

O produto deve unir três capacidades:

```
EXECUÇÃO
    +
RASTREABILIDADE
    +
INTELIGÊNCIA
```

**Sem** tornar o chão de fábrica complexo.

---

## Adendo — origem da OP (Doc 05)

Sistema Gestor = source of truth da **OP**.  
Factory OS = source of truth da **execução industrial**.

PCP não cria OP por padrão; sincroniza, valida e libera. Ver Docs 05 e 05A.
