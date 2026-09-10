# DOCUMENTO 05 — PRODUCTION ORDER INTEGRATION & PCP EXECUTION

**DC Pães · Factory OS**  
**Título conceitual (PT):** Integração de OP & Programação da Produção

| | |
|---|---|
| **Versão** | 1.0 |
| **Status** | Documento de produto / arquitetura |
| **Backend** | Firebase existente + Integration Layer |
| **Fonte da OP** | Sistema gestor DC Pães (via API) |
| **Relacionado** | [05A — ERP / OP Integration](05A-ERP-OP-INTEGRATION.md) |

---

## 1. Correção estrutural

A OP **não nasce** no Factory OS.

A OP nasce no **sistema gestor atual** da DC Pães. O Factory OS deve **importar / sincronizar** essa OP, provavelmente via API.

```
SISTEMA GESTOR DC PÃES
        ↓
      API
        ↓
FACTORY OS
        ↓
VALIDAÇÃO / NORMALIZAÇÃO
        ↓
LOTE / BATIDAS / EXECUÇÃO
        ↓
FACTORY FLOOR / KDS
        ↓
RASTREABILIDADE / COCKPIT
```

Isso evita duplicar o papel do ERP/gestor.

---

## 2. Princípio oficial

> **A OP nasce no sistema gestor. O Factory OS importa, valida, enriquece com informações industriais e executa.**

O Factory OS **não** é a fonte de origem da Ordem de Produção.  
A fonte oficial da OP é o sistema gestor já utilizado pelo cliente.

O Factory OS recebe a OP e passa a ser responsável pela **execução industrial** e pelos **apontamentos de chão de fábrica**.

---

## 3. Regra de ouro — duas fontes de verdade

| Sistema | Source of Truth |
|---------|-----------------|
| **Sistema Gestor** | SOURCE OF TRUTH **DA OP** |
| **Factory OS** | SOURCE OF TRUTH **DA EXECUÇÃO INDUSTRIAL** |

Essa divisão deve permanecer explícita em produto, UI e modelagem.

---

## 4. Responsabilidade de cada sistema

### Sistema Gestor

Fonte de origem para dados como (campos exatos dependem da API):

- OP
- Produto
- Quantidade planejada
- Data de produção
- Código do produto
- Outros campos administrativos disponíveis

### Factory OS

Responsável por:

- Importar OP
- Validar OP
- Relacionar produto
- Relacionar ficha técnica *(source da ficha: a definir — ver §12)*
- Preparar execução
- Gerar / controlar lote quando aplicável
- Gerenciar batidas
- Liberar para KDS
- Executar etapas
- Registrar tempos, operadores, equipamentos
- Registrar perdas e ocorrências
- Construir rastreabilidade
- Gerar indicadores industriais

---

## 5. O Factory OS não cria OP manualmente por padrão

**Removido como fluxo principal:**

```
[ + NOVA ORDEM ]
```

**Substituído por:**

```
ORDENS DE PRODUÇÃO
Sincronizadas do sistema gestor
```

Poderá existir futuramente um **fallback manual**, somente se houver necessidade real.  
**Não presumir isso agora.**

---

## 6. Home do PCP

```
PCP / PROGRAMAÇÃO

HOJE · 28 AGO

18 OPs recebidas
12 liberadas · 4 em produção · 2 aguardando validação

────────────────────────

ORDENS RECEBIDAS

260826-001
Pão Hambúrguer 90g · 5.000 un.
● PRONTA PARA PRODUÇÃO

260826-002
Pão Hot Dog · 4.000 un.
● EM PRODUÇÃO

260826-003
Pão de Forma · 3.500 un.
● REQUER ATENÇÃO
```

---

## 7. Fluxo de entrada

```
ERP / SISTEMA GESTOR
        ↓
   CONSULTAR API
        ↓
 RECEBER OPs NOVAS
        ↓
NORMALIZAR DADOS
        ↓
IDENTIFICAR PRODUTO
        ↓
VALIDAR CONFIGURAÇÃO INDUSTRIAL
        ↓
GERAR / ASSOCIAR ESTRUTURA OPERACIONAL
        ↓
LIBERAR PARA PRODUÇÃO
```

---

## 8. Importar ≠ executar imediatamente

Uma OP recebida da API pode estar no Factory OS e **ainda não** estar pronta para aparecer no chão de fábrica.

```
OP IMPORTADA
   ↓
VALIDANDO
   ↓
PRONTA PARA PRODUÇÃO
   ↓
LIBERADA
   ↓
EM PRODUÇÃO
```

Camada de segurança entre sincronização e liberação operacional.

---

## 9. Dois status — nunca misturar

### Status de integração

```
integrationStatus:
  "SYNCED"
  "PENDING_VALIDATION"
  "ERROR"
  "OUTDATED"
  "IGNORED"          # somente se caso de uso validado (Doc 05A)
```

### Status industrial / produção

```
productionStatus:
  "WAITING"
  "RELEASED"
  "IN_PROGRESS"
  "COMPLETED"
```

(Valores finais podem ser refinados; a **separação conceitual** é obrigatória.)

---

## 10. Identificador externo

A OP precisa preservar o identificador do sistema gestor.

```
ProductionOrder {
  id: "firebase-internal-id"

  externalId: "123456"
  externalOrderNumber: "260826-001"

  sourceSystem: "ERP_DC_PAES"
}
```

Nunca usar apenas o ID externo como documento Firebase sem avaliar formato e estabilidade.

---

## 11. Idempotência

Se a API devolver a mesma OP dez vezes (`260826-001` × 10), o sistema **não** pode criar três OPs.

Deve reconhecer `externalId` igual e atualizar/sincronizar a existente.

```
IMPORT ≠ CREATE

OP existe?
   ├── NÃO → importar
   └── SIM → verificar alterações
```

Detalhamento técnico: [Documento 05A](05A-ERP-OP-INTEGRATION.md).

---

## 12. Snapshot do dado externo

Preservar o que a origem informou naquele momento:

```
externalSnapshot: {
  orderNumber,
  productCode,
  plannedQuantity,
  productionDate
}
```

ou estrutura equivalente. Implementação final depende da API.

Ajuda a auditar: *“O que o sistema gestor informou naquele momento?”*

---

## 13. Produto — ponto crítico da integração

A API provavelmente enviará algo como `productCode = 001234`.

O Factory OS mapeia para `factory_products/{productId}`.

O cadastro do produto deve possuir, quando necessário:

- `externalProductId`
- `externalProductCode`

```
SISTEMA GESTOR          FACTORY OS
Código 001234      →    PÃO HAMBÚRGUER 90g
Descrição PAO HAMB 90G  externalCode: 001234
```

A associação deve ser **estável**.

---

## 14. OP com produto não mapeado

**Não** permitir liberação para o KDS.

```
OP 260826-014
PRODUTO NÃO CONFIGURADO

Código do sistema gestor: 001897
Descrição: Pão Australiano 70g

Esta OP não pode ser liberada até que
o produto seja configurado no Factory OS.

[ CONFIGURAR PRODUTO ]
```

---

## 15. Ficha técnica — em aberto

O material-base diz que a OP puxa automaticamente uma ficha técnica.

Ainda não está definido se a ficha também vem do sistema gestor ou será mantida no Factory OS.

| Dado | Source |
|------|--------|
| **OP** | Sistema Gestor |
| **Ficha técnica** | **A DEFINIR** após análise da integração |

**Não decidir sem verificar a API.** Registrar em 05A quando conhecido.

---

## 16. Quantidade e batidas — em aberto

A OP pode trazer `plannedQuantity`.

Já `numberOfBatches` e `massWeight` podem:

- vir do gestor;
- ser calculados no Factory OS;
- vir da ficha técnica;
- ser definidos por configuração.

**Verificar na API / operação.** Não inventar regra.

---

## 17. Não editar dados de origem livremente

Se a OP veio do gestor, campos como produto, quantidade planejada e número da OP **não** devem ser campos editáveis comuns no Factory OS.

Preferir leitura com indicação de origem:

```
OP 260826-001
PÃO HAMBÚRGUER 90g

Quantidade planejada
5.000 unidades
🔒 Sistema Gestor

Data
28/08/2026
🔒 Sistema Gestor

────────────────────

CONFIGURAÇÃO DE PRODUÇÃO

Turno     [ A ]
Linha     [ Linha 01 ]
Lotes     [...]

[ LIBERAR PARA PRODUÇÃO ]
```

Separação clara:

| Tipo | Origem |
|------|--------|
| Dado importado | Sistema gestor (leitura) |
| Dado operacional | Factory OS (editável quando permitido) |

Alterações administrativas do plano devem acontecer no sistema de origem, quando esse for o processo definido.

---

## 18. Sincronização de alterações

### Cenário

```
09:00  OP importada · 5.000 un.
09:15  Gestor altera para 6.000 un.
```

### Antes da produção

Se ainda não iniciou: pode atualizar automaticamente (`5.000 → 6.000`), **dependendo da regra** definida em 05A.

### Depois da produção iniciada

**Não** atualizar silenciosamente.

```
ALTERAÇÃO RECEBIDA DO SISTEMA GESTOR

OP 260826-001
Quantidade anterior: 5.000
Nova quantidade: 6.000

A produção desta OP já foi iniciada.

[ ANALISAR ALTERAÇÃO ]
```

Regra específica obrigatória no documento de integração (05A).

---

## 19. Mapa PCP (corrigido)

```
PCP
├── Programação / Hoje
├── Ordens recebidas (sincronizadas)
├── Validação / Atenção
├── Liberação para produção
└── Acompanhamento de execução
```

**Não** incluir “Nova OP” como item principal.

Rotas conceituais (substituem `/app/pcp/orders/new` como fluxo principal):

```
/app/pcp
/app/pcp/planning
/app/pcp/orders
/app/pcp/orders/:orderId
/app/pcp/schedule
```

---

## 20. Persona PCP (atualizada)

**Objetivo:** Programar e liberar a produção a partir das OPs do sistema gestor.

**Precisa responder:**

- Quais OPs chegaram hoje?
- Quais estão validadas / bloqueadas?
- Qual produto precisa de configuração?
- O que pode ser liberado para o Floor?
- O que já está em execução?

**Principais ações:**

- acompanhar sincronização;
- validar OP importada;
- mapear / configurar produto quando necessário;
- enriquecer com dados industriais (turno, linha, lotes/batidas quando aplicável);
- liberar para produção;
- tratar alterações do gestor em OPs já iniciadas;
- acompanhar execução.

**Não é ação padrão:** criar OP do zero no Factory OS.

---

## 21. Relação com Documento 04

A entidade `ProductionOrder` permanece, mas com campos de integração:

```
id                    # interno Firebase
externalId
externalOrderNumber
sourceSystem
integrationStatus
productionStatus
externalSnapshot
productId             # mapeado internamente
plannedQuantity       # espelho do gestor (leitura)
...
```

Campos operacionais do Factory OS (turno, linha, liberação, lotes, etc.) ficam separados dos campos de origem.

Detalhe de API, polling/webhook, retries e conflitos: **Documento 05A**.

> O Doc 05A (v1.0) é a especificação completa da Integration Layer: adapter, normalização, product mapping, change detection, cancelamento, observabilidade e testes críticos.

---

## 22. Arquitetura resumida

```
SISTEMA GESTOR
      │
      │ API
      ▼
INTEGRATION LAYER
      │
      ├── autenticação
      ├── normalização
      ├── idempotência
      ├── validação
      └── logging
      ▼
FIREBASE DC PÃES → FACTORY DOMAIN
      │
      ├── OP IMPORTADA
      ├── Produto
      ├── Lotes / Batidas
      ├── Etapas / Eventos
      ▼
FACTORY FLOOR → COCKPIT / RASTREABILIDADE
```

---

## 23. O que este documento NÃO autoriza

- Criar tela “Nova OP” como fluxo principal
- Editar livremente quantidade/produto/número vindos do gestor
- Liberar OP com produto não mapeado
- Assumir source da ficha técnica sem análise da API
- Inventar formato de batidas/peso sem validação
- Implementar integração real sem o Doc 05A e sem contrato da API

---

## 24. Substituição oficial

Tudo que, nos Documentos 00–04, tratava o Factory OS como **criador** da OP fica **substituído** por este princípio:

> Sistema Gestor = origem da OP · Factory OS = execução industrial.

Correções pontuais de rotas/menus constam nos adendos dos Docs 01 e 02.

---

## 25. Critério de sucesso

- OPs do dia aparecem no PCP sem digitação manual padrão
- Reimportação da mesma OP não duplica registro
- Produto não mapeado bloqueia liberação com ação clara
- Dados do gestor aparecem como leitura; configuração industrial é separada
- Alteração do gestor após início de produção nunca sobrescreve em silêncio
- Floor / KDS só vê OPs liberadas e prontas para execução
