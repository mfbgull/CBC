# Construction BOQ Calculator — Product Plan

## Vision
A desktop-first, offline-first BOQ (Bill of Quantities) estimation tool for:
- Small contractors
- Quantity surveyors
- Residential builders
- Construction estimators

Primary market:
- Pakistan
- South Asia
- Emerging markets

Core objective:
Replace fragile Excel workflows with a faster, safer, professional BOQ workflow.

---

# Core Problems

## Existing Workflow
Most estimators currently use:
- Excel spreadsheets
- WhatsApp rate sharing
- Printed schedules
- Manual calculations

Problems:
- Broken formulas
- No revision tracking
- Slow report generation
- No reusable templates
- Inconsistent formatting
- Difficult collaboration

---

# Key Market Gaps

## Pakistan / South Asia
Current software is:
- too expensive
- enterprise-focused
- not localized
- cloud dependent
- difficult to learn

Missing:
- Urdu support
- local units
- local material rates
- offline-first workflow
- simple UX

---

# MVP Goals

## Must Have
- Project management
- BOQ spreadsheet editor
- Quantity + rate calculations
- Material rate library
- Templates
- PDF export
- Excel export
- Print-ready reports
- SQLite local database
- Autosave

## Should Have
- Keyboard shortcuts
- Bulk editing
- Copy/paste support
- Revision snapshots
- Search/filter

## Future Features
- AI-assisted estimation
- OCR from drawings
- Drawing quantity extraction
- Cloud sync
- Team collaboration
- Contractor comparison

## Do NOT Build Yet
- ERP
- Payroll
- Inventory management
- CRM
- Accounting
- BIM integration

---

# UX Strategy

## Principles
- Spreadsheet-first UX
- Keyboard-driven workflow
- Fast data entry
- Excel familiarity
- Low learning curve

## Important UX Features
- AG Grid editing
- Multi-cell paste
- Inline calculations
- Sticky totals
- Fast navigation
- Autosave

---

# Technical Stack

## Frontend
- React
- TypeScript
- Vite
- Tailwind
- AG Grid

## Desktop Layer
Preferred:
- Tauri v2

Alternative:
- Electron

## Database
- SQLite

## State Management
- Zustand

## Validation
- Zod

## Export
- @react-pdf/renderer
- xlsx

---

# Monetization

## Best Model
Freemium

Free:
- Limited projects
- Basic exports

Paid:
- Unlimited projects
- Premium templates
- Advanced exports
- AI tools

## Regional Pricing
Affordable pricing is critical for South Asia adoption.

---

# Biggest Risks

## 1. Overbuilding
Keep MVP focused.

## 2. Poor Spreadsheet UX
Grid quality determines adoption.

## 3. Incorrect Calculations
Trust is critical.

## 4. Complex UI
Construction users prefer simple software.

---

# Roadmap

## Phase 1
- Core BOQ editor
- SQLite
- Calculations
- Export system

## Phase 2
- Templates
- Revision management
- Improved UX

## Phase 3
- AI assistance
- OCR
- Smart estimation

## Phase 4
- Cloud sync
- Collaboration
- Marketplace

---

# Success Metric

The app must feel:
- faster than Excel
- safer than Excel
- easier than enterprise software
