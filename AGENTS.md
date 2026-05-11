# AGENTS.md — Construction BOQ Calculator

## Project Overview
This project is a desktop-first construction BOQ calculator targeting Pakistan and South Asia.

Primary goals:
- Offline-first
- Fast spreadsheet UX
- Professional BOQ exports
- Simple and reliable
- Solo-developer maintainable

---

# Technology Stack

## Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- AG Grid Community

## Desktop
- Tauri v2

## Database
- SQLite

## State Management
- Zustand

## Validation
- Zod

---

# Architecture Rules

## MUST FOLLOW

### 1. Feature-Based Structure
All code must live inside feature modules.

Example:
```txt
features/
  boq/
  projects/
  export/
```

Do not create random utility folders.

---

### 2. Pure Business Logic
All calculations must be pure functions.

Rules:
- no side effects
- no DOM access
- no database access
- deterministic outputs

---

### 3. Strict TypeScript
Rules:
- no `any`
- explicit interfaces
- typed function returns
- typed DB models

---

### 4. AG Grid is Core UX
The spreadsheet experience is the product.

Prioritize:
- keyboard navigation
- fast editing
- copy/paste
- performance
- low latency

Never sacrifice grid performance.

---

### 5. Offline First
The app must fully function without internet.

Never assume:
- cloud access
- APIs
- remote services

---

# UI/UX Rules

## UX Priorities
1. Speed
2. Simplicity
3. Familiarity
4. Reliability

The app should feel familiar to Excel users.

---

## Design Rules
- clean professional UI
- no excessive animations
- desktop-first layouts
- dense information display
- readable tables
- minimal clicks

---

# Database Rules

## SQLite Conventions
- snake_case column names
- indexed foreign keys
- timestamps on important tables
- migrations required

Never:
- hardcode schema assumptions
- bypass validation

---

# Validation Rules

All external inputs must validate through Zod.

Validate:
- forms
- imports
- DB writes
- exports
- settings

---

# State Management Rules

## Zustand Only
Do not introduce:
- Redux
- MobX
- Context-heavy state

Keep stores:
- modular
- feature-scoped
- predictable

---

# Export Rules

## PDF Exports
Exports must:
- print cleanly
- support A4
- include totals
- include company/project info
- preserve formatting

---

# Performance Rules

## Important
Large BOQs must remain responsive.

Requirements:
- virtualization
- memoization where needed
- avoid unnecessary renders
- efficient recalculation

---

# Forbidden Patterns

## NEVER DO THESE
- giant component files
- duplicated logic
- inline complex calculations
- business logic inside JSX
- direct SQL inside components
- untyped responses
- magic numbers

---

# Preferred Development Process

## Before Implementing
1. Read related feature module
2. Read existing types
3. Check architecture consistency
4. Reuse utilities

---

## When Creating Features
Always:
- create types first
- create validation schema
- create pure logic
- then create UI

---

# File Naming Rules

## Components
PascalCase:
```txt
BoqGrid.tsx
ProjectCard.tsx
```

## Utilities
camelCase:
```txt
calculateTotals.ts
formatCurrency.ts
```

---

# AI Agent Behavior

## Always Optimize For
- maintainability
- readability
- predictable architecture
- stable calculations
- production readiness

## Avoid
- unnecessary abstractions
- premature optimization
- overengineering
- experimental libraries

---

# MVP Scope Enforcement

The MVP is ONLY:
- BOQ editing
- calculations
- exports
- templates
- material rates

Do not expand scope into:
- ERP
- payroll
- inventory
- CRM
- accounting

---

# Success Criteria

The application should:
- feel faster than Excel
- reduce estimation mistakes
- generate professional reports
- work completely offline
- require minimal training
