# Construction BOQ Calculator — Technical Specification

## Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS v4
- AG Grid Community

### Desktop
- Tauri v2

### Database
- SQLite

### Validation
- Zod

### State Management
- Zustand + Immer

---

# Folder Structure

```txt
src/
 ├── features/
 │    ├── projects/
 │    ├── boq/
 │    ├── rates/
 │    ├── templates/
 │    ├── export/
 │    └── settings/
 │
 ├── lib/
 ├── store/
 ├── components/
 ├── types/
 └── styles/
```

---

# Core Features

## Projects
- Create project
- Edit project
- Archive project
- Project dashboard

## BOQ Editor
- Spreadsheet editing
- Add/delete rows
- Section rows
- Quantity/rate formulas
- Keyboard navigation
- Copy/paste

## Rate Library
- Material rates
- Labour rates
- Search/filter
- Category grouping

## Templates
- Residential
- Commercial
- Grey structure
- Finishing work

## Export
- PDF export
- Excel export
- Print layout

---

# AG Grid Requirements

## Required Features
- Editable cells
- Keyboard-first navigation
- Multi-row paste
- Custom cell editors
- Inline validation
- Sticky footer totals

## Important
The spreadsheet UX is the core product experience.

---

# SQLite Tables

## projects
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT,
  project_type TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

## boq_items
```sql
CREATE TABLE boq_items (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  description TEXT,
  quantity REAL,
  unit TEXT,
  rate REAL,
  total REAL,
  sort_order INTEGER
);
```

## material_rates
```sql
CREATE TABLE material_rates (
  id INTEGER PRIMARY KEY,
  material_name TEXT,
  category TEXT,
  unit TEXT,
  rate REAL,
  city TEXT,
  updated_at TEXT
);
```

---

# Calculation Rules

## Formula
```txt
total = quantity × rate
```

## Project Total
```txt
grand_total =
subtotal +
tax +
contingency +
profit_margin
```

## Validation
- Quantity cannot be negative
- Rate cannot be negative
- Required fields must validate
- Totals auto-recalculate

---

# Export Engine

## PDF
Use:
- @react-pdf/renderer

Requirements:
- professional BOQ layout
- pagination
- company branding
- print optimization

## Excel
Use:
- xlsx

Requirements:
- merged headers
- formulas
- formatting
- print support

---

# Autosave Strategy

## Requirements
- Save every few seconds
- Save on cell edit
- Save on window close
- Crash recovery

---

# Coding Standards

## Rules
- Strict TypeScript only
- No any types
- No duplicated business logic
- Pure calculation functions
- Feature-based architecture
- Reusable UI components

---

# Important Engineering Rules

## Do NOT
- Put calculations inside components
- Mix DB queries with UI
- Use global mutable state
- Create giant files

## Always
- Keep business logic pure
- Validate inputs with Zod
- Use typed DB access
- Keep UI responsive
