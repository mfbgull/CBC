# Construction BOQ Calculator

A desktop-first Bill of Quantities (BOQ) calculator for construction professionals in Pakistan and South Asia.

## Features

- **Room-Based Specification Engine** — Define floors and rooms with L×W×H dimensions. Auto-calculates material quantities (cement, steel, bricks, sand, plaster, paint, flooring, MEP, etc.) using Pakistan construction thumb-rules.
- **AG Grid BOQ Editor** — Fast, keyboard-navigable spreadsheet interface. Copy/paste, inline editing, section headers, drag-to-reorder.
- **Rate Library** — Master rates for materials and labour. Editable cards view or AG Grid view. "Rate Calculator" panel shows 22 spec-relevant rates with library vs. default status.
- **Payment Plans** — 8-milestone construction phase schedule (Booking → Foundation → Structure → Roof → Finishing → MEP → Handover). Auto-recalculates amounts when total cost changes. Mark paid/partial per milestone.
- **Reports** — Phase-wise BOQ breakdown with KPI strip, material quantity summary, collapsible section rows.
- **Export** — PDF (jsPDF), Excel (xlsx), Print with professional A4 layouts.
- **Offline-First** — All data persisted locally. Works without internet.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Desktop | Tauri v2 |
| State | Zustand |
| Grid | AG Grid Community |
| Database | SQLite via localStorage (Tauri-ready) |
| Validation | Zod |

## Architecture

```
src/
  features/
    boq/          — AG Grid BOQ editor
    projects/    — Project CRUD
    spec/        — Room specification engine + calculations
    report/      — Phase-wise BOQ report
    payment/     — Milestone payment plans + print
    rates/       — Rate library (cards + grid views)
    templates/   — BOQ templates
    export/      — PDF/Excel/Print
    settings/    — Company settings
  lib/
    db.ts        — localStorage persistence (SQLite-ready)
    calculations.ts
    ui.tsx
  components/
    Sidebar.tsx
    Header.tsx
```

### Rules
- **Feature-based** — All code lives inside `features/` modules
- **Pure functions** — Calculations have no side effects, no DOM access
- **Strict TypeScript** — No `any`, explicit interfaces, typed returns
- **AG Grid is core UX** — Optimize for keyboard nav, copy/paste, low latency

## Getting Started

```bash
# Install dependencies
npm install

# Run development
npm run dev

# Build production (Tauri)
npm run tauri build
```

### Requirements
- Node.js 18+
- Rust (for Tauri build)

## Modules

| Tab | Description |
|---|---|
| **Projects** | Create and manage construction projects |
| **BOQ** | AG Grid spreadsheet — add, edit, reorder items |
| **Specification** | Room-based spec: floors → rooms → openings → Generate BOQ |
| **Report** | Phase breakdown with material quantities |
| **Payments** | Milestone payment schedule with print |
| **Rates** | Editable rate library with 22-item rate calculator |
| **Templates** | Save/load BOQ templates |
| **Export** | PDF, Excel, Print |
| **Settings** | Company name, contact, defaults |

## Data Persistence

All data stored in `localStorage` with separate namespaces:
- `boq_projects`, `boq_items`, `boq_rates`, `boq_templates`, `boq_settings`
- `boq_specs` — project specifications
- `boq_payment_plans` — payment schedules

Ready to migrate to SQLite when Tauri backend is fully configured.