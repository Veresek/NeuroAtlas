# Contributing to NeuroAtlas

Thank you for your interest in NeuroAtlas! This document outlines the rules and conventions that keep the codebase clean, modular, and maintainable.

## Project Status

NeuroAtlas is currently in the **MVP phase**. External pull requests are not yet open, but ideas, feedback, and knowledge contributions are welcome — see [Contact](./README.md#contact) in README.md.

---

## Code Conventions

### TypeScript

- **No `any`** — every data object has an interface. If you're unsure about a type, use `unknown` and narrow it.
- **Shared types** go in `src/types/brain.ts`. Types used by only one module go in `features/<module>/types.ts`.
- **Use `type` imports** for types only: `import type { BrainRegion } from "..."`.

### Data

- **All hardcoded data lives in `src/data/` as JSON files** — never in components.
- JSON format ensures easy future migration to MongoDB.
- Add new entries to the appropriate `.json` file and update the typed export in `data/index.ts` if needed.
- Components **consume** data, they never **mutate** it.

### Components

- **Feature-specific components** → `features/<module>/components/`
- **Reusable UI primitives** → `components/ui/` (buttons, cards, sliders — no domain knowledge)
- **Shared domain components** → `components/shared/` (SidePanel, RegionTag — used across features)

### Business Logic

- **Hooks** (`features/<module>/hooks/`) — logic that needs React state (useState, useEffect)
- **Engine** (`features/<module>/engine/`) — pure functions, no React dependency, easy to unit-test
- **Never** put business logic directly in JSX. Extract it.

### 3D / Three.js

- All R3F/Three.js logic stays in `features/brain-model/` and `lib/`.
- Communication between 3D layer and the rest of the app is **props + callbacks only**.
- Don't store 3D state in a global store — R3F has its own render loop.

### Styling

- **Tailwind CSS** — use utility classes, don't write custom CSS unless absolutely necessary.
- **Mobile-first** — every component must work on 375px viewport.
- **Light theme** is the default — design for light backgrounds.

### File Naming

- Components: `PascalCase.tsx` (e.g. `BrainViewer.tsx`, `SubstanceList.tsx`)
- Hooks: `camelCase.ts` (e.g. `useBrainRegions.ts`)
- Engine/utilities: `kebab-case.ts` (e.g. `daily-log-engine.ts`)
- Data: `kebab-case.json` (e.g. `brain-regions.json`)
- Types: `camelCase.ts` (e.g. `brain.ts`)

---

## Architecture Rules

1. **One module = one responsibility.** The 3D module doesn't know about the quiz. The quiz doesn't know about substances.
2. **Feature = folder.** Don't mix substances with habits with digital twin. Each feature is self-contained.
3. **Context per feature.** Don't create one giant global context. If a feature needs shared state, give it its own context within its folder.
4. **3D is isolated.** The Three.js layer communicates with the app exclusively through props and callbacks — never through global state.
5. **Data is separate.** Hardcoded data in `data/`, typed through `data/index.ts`. Components never contain data definitions.

---

## Git & Commits

### Branch Naming

- `feature/<short-description>` — new functionality
- `fix/<short-description>` — bug fixes
- `refactor/<short-description>` — code restructuring
- `data/<short-description>` — adding/updating neurobiological data

### Commit Messages

Use clear, descriptive messages:

```
feat: add substance list sidebar with category filtering
fix: prevent crash when clicking unregistered mesh name
refactor: extract highlight logic from BrainViewer to useHighlightEffect hook
data: add dopamine/cortisol change rules for sleep deprivation
```

Prefixes: `feat:`, `fix:`, `refactor:`, `data:`, `style:`, `docs:`, `chore:`

---

## Neurobiological Data Quality

Since NeuroAtlas presents scientific information, data quality matters:

- **Cite sources** when adding new substance/habit effects — add a `sources` field to the JSON entry if possible.
- **Use conservative values** — if a study says "up to 30% increase", use a lower bound, not the maximum.
- **Mark uncertainty** — if data is approximate or from a single study, note it in the description.
- **No pseudoscience** — claims must be backed by peer-reviewed research.

Example JSON entry with source:

```json
{
  "id": "caffeine",
  "name": "Caffeine",
  "category": "stimulant",
  "sources": ["Nehlig et al., 1992, Brain Research Reviews"],
  "effects": [...]
}
```

---

## Before Submitting a PR

- [ ] New data is in `data/` as JSON, not hardcoded in components
- [ ] New types are in `types/` (shared) or `features/<module>/types.ts` (local)
- [ ] Layout works on 375px viewport (mobile)
- [ ] No cross-feature coupling — each module is self-contained
