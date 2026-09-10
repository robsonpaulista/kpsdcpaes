# DC Pães · Sistema Integrado de Produção

Sistema operacional da fábrica — não um dashboard administrativo.

Conecta planejamento (OP do sistema gestor), execução, acompanhamento e inteligência da produção até a embalagem, com rastreabilidade completa.

## Experiências

| | Factory Cockpit | Factory Floor | Factory Display |
|---|---|---|---|
| **Quem** | PCP, gestores, supervisores | Operadores no chão | TV / painel |
| **Objetivo** | Entender → decidir → priorizar → agir | Próxima ação, mínimo de cliques | Visão instantânea do dia |
| **Prioridade de tela** | Desktop → Tablet | Tablet → Mobile | TV (≥1600px) |

## Norte

> O que está acontecendo, o que acontecerá em seguida e onde é necessário agir.

## Fontes de verdade

| Dado | Source of Truth |
|------|-----------------|
| Ordem de Produção | Sistema gestor (via API) |
| Execução industrial | Factory OS |

## Documentação

| Doc | Conteúdo |
|-----|----------|
| [00 — Master README](docs/00-MASTER-README.md) | Visão mestre, Design System, regras estruturais |
| [01 — Product Vision & Principles](docs/01-PRODUCT-VISION.md) | North Star, personas, domínios, Firebase, critérios de aprovação |
| [02 — Information Architecture](docs/02-INFORMATION-ARCHITECTURE.md) | Shells, rotas, mapa de telas, Floor/Cockpit/Display |
| [03 — Design System](docs/03-DESIGN-SYSTEM.md) | Tokens, tipografia, componentes, densidades, checklists UI |
| [04 — Data Model & Firebase](docs/04-DATA-MODEL-FIREBASE.md) | Entidades, eventos, Regra Zero, service layer |
| [05 — OP Integration & PCP](docs/05-PRODUCTION-ORDER-INTEGRATION.md) | OP nasce no gestor; Factory OS importa, valida e executa |
| [05A — ERP / OP Integration](docs/05A-ERP-OP-INTEGRATION.md) | API, adapter, idempotência, mapping, sync, testes críticos |
| [06 — Production Workflow](docs/06-PRODUCTION-WORKFLOW.md) | Máquina de estados, etapas, timers, transações |
| [07 — KDS Operator UX](docs/07-KDS-OPERATOR-UX.md) | Chão de fábrica: scan → ação, shell, checklist UI |
| [08 — KDS Stations](docs/08-KDS-STATIONS.md) | Contrato por estação: entrada, apontamento, saída |
| [09 — Management Cockpit](docs/09-MANAGEMENT-COCKPIT.md) | Home gerencial, Atenção Agora, fluxo ao vivo, KPIs |
| [10 — Traceability + Quality](docs/10-TRACEABILITY-QUALITY.md) | Timeline do lote, perdas, ocorrências, bloqueio, audit |
| [11 — Technical Implementation](docs/11-TECHNICAL-IMPLEMENTATION.md) | Stack, camadas, ordem de build, DoD, QA |
| [Firebase Existing Audit](docs/firebase-existing-audit.md) | Auditoria Fase 0 — Firebase ainda não localizado neste workspace |
| [ENV Setup](docs/ENV-SETUP.md) | Como criar `.env.local` com credenciais Firebase |

## App

```bash
cp .env.example .env.local   # preencha com o Firebase Console
npm install
npm run dev
```

- Cockpit: http://localhost:3000/app/cockpit  
- Floor: http://localhost:3000/app/floor  
- Status Firebase / mock OPs: http://localhost:3000/app/settings/integrations/dev  

## Material-base

- `KPS INDUSTRIA - DC PAES.pdf`

## Próximo passo de implementação

Vertical slice: SyncService → Firestore (`factory_*`) → OPs no Cockpit → mapping → lote → QR → Floor start/complete → timeline.

> **Fase 0 concluída.** Fundação iniciada (shells + mock source + tokens). Aguardando `.env.local` preenchido para gravar no Firebase.
