# NeuroAtlas — Client

Frontend for NeuroAtlas. React + TypeScript + Tailwind CSS + React Three Fiber.

## Getting Started

```bash
cd client
npm install
npm run dev        # dev server at localhost:5173
npm run build      # production build (tsc + vite build)
npm run lint       # eslint
```

## Folder Structure

```
src/
├── main.tsx                  # Entry point — mounts <App/> to DOM
├── App.tsx                   # Root component, layout (header + sidebar + viewer + panel)
├── style.css                 # Tailwind import + global styles (reset, fonts)
│
├── features/                 #  BUSINESS MODULES — each feature is a self-contained folder
│   ├── brain-model/          #   Module A: 3D brain model
│   │   ├── components/       #     BrainViewer, BrainRegionHighlight
│   │   ├── hooks/            #     useBrainRegions, useHighlightEffect
│   │   ├── types.ts          #     Local types (if not global)
│   │   └── constants.ts      #     Local constants
│   │
│   ├── substances/           #   Module B: Substances, emotions, diseases
│   │   ├── components/       #     SubstanceList, SubstanceDetail, SubstanceCard
│   │   ├── hooks/            #     useSubstances, useSubstanceEffects
│   │   ├── types.ts
│   │   └── constants.ts
│   │
│   ├── habits/               #   Module C: Good and bad habits
│   │   ├── components/       #     HabitList, HabitCard, HabitMetric
│   │   ├── hooks/            #     useHabits
│   │   ├── types.ts
│   │   └── constants.ts
│   │
│   └── digital-twin/         #   Module D: Digital Twin (quiz + visualization)
│       ├── components/       #     DailyQuiz, TwinViewer
│       ├── hooks/            #     useDailyLog
│       ├── engine/           #     Decision rules — pure functions, easy to test
│       │   └── daily-log-engine.ts  # getTwinHighlightRegions(), getTwinNeurotransmitterChanges()
│       ├── types.ts
│       └── constants.ts
│
├── data/                     #   HARDCODED DATA — separated from logic (JSON for future MongoDB migration)
│   ├── index.ts              #     Typed exports: brainRegions, substances, habits, regionById, meshToRegionId
│   ├── brain-regions.json    #     Region name → mesh names mapping from GLB
│   ├── substances.json       #     Substances → regions + descriptions + intensity
│   ├── habits.json           #     Habits → regions + metrics %
│   ├── emotions.json         #     Emotions → regions + descriptions (TODO)
│   └── diseases.json         #     Diseases → regions + descriptions (TODO)
│
├── types/                    #   GLOBAL TYPES — shared across modules
│   └── brain.ts              #     BrainRegion, Substance, Habit, DailyLog, NeurotransmitterChange, HighlightRegion
│
├── components/
│   ├── ui/                   #   UI primitives: Button, Card, Slider, Badge
│   └── shared/               #   Shared components: SidePanel, RegionTag
│
├── lib/                      #   Utilities and helpers
│   ├── three-helpers.ts      #     GLB loading, raycasting, mesh coloring
│   └── utils.ts              #     clamp(), formatPercent(), etc.
│
└── assets/                   #   Static assets (icons, images)
```

## What Goes Where

### New UI component → `components/ui/`

Button, Card, Slider, Badge — reusable, domain-agnostic primitives.

### New feature-specific component → `features/<module>/components/`

SubstanceCard, HabitMetric, DailyQuiz — things that only make sense within one module.

### New data → `data/` (as JSON)

Every new substance, habit, or region goes into the appropriate `.json` file in `data/`. **Never** hardcode data in components. JSON format makes future MongoDB migration trivial.

### New shared type → `types/`

If a type is used in 2+ modules (e.g. `BrainRegion` used by both brain-model and substances) → `types/brain.ts`. If only in one module → `features/<module>/types.ts`.

### New business logic → `features/<module>/hooks/` or `engine/`

- **Hook** = logic with React state access (useState, useEffect)
- **Engine** = pure functions (input → output), no React, easy to unit-test

### New 3D helper → `lib/three-helpers.ts`

Anything Three.js/R3F related that isn't a component — model loading, transforms, mesh coloring.

## Conventions

| Rule                  | Details                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| **TypeScript strict** | Zero `any`. Every data object = interface.                                                       |
| **Data in `data/`**   | Components only consume, never mutate. JSON format for easy DB migration.                        |
| **3D isolated**       | All R3F/Three.js logic in `features/brain-model/` and `lib/`. Communication = props + callbacks. |
| **Feature = folder**  | Don't mix substances with habits with twin. Each module = independent folder.                    |
| **Mobile-first**      | From the first component — layout must work on 375px.                                            |

## Checkpoints

| CP  | Goal                                                               | Commit tag                |
| --- | ------------------------------------------------------------------ | ------------------------- |
| CP0 | Scaffold + 3D Hello World (GLB loads, rotates)                     | `cp0-brain-hello`         |
| CP1 | Interactive regions (click/hover → highlight → name)               | `cp1-interactive-regions` |
| CP2 | Side panel + substance list (click → model + description)          | `cp2-substances-panel`    |
| CP3 | Habits with % metrics                                              | `cp3-habits`              |
| CP4 | Digital Twin: quiz + region neurotransmitter changes visualization | `cp4-digital-twin-quiz`   |
| CP5 | Digital Twin: quiz → dynamic 3D model                              | `cp5-dynamic-twin`        |
| CP6 | Polish: routing, mobile, loading, error boundaries                 | `cp6-polish`              |

## Anti-patterns

- **Don't** put business logic in UI components → extract to hooks or `engine/`
- **Don't** store 3D state in a global store — R3F has its own loop, communicate via refs and events
- **Don't** hardcode region colors in components → mapping in `data/`
- **Don't** make one giant context → context per feature
- **Don't** skip types "because it's faster"
- **Don't** build the backend before CP6 — frontend with hardcoded data is enough for MVP

## Digital Twin — Neurotransmitter Visualization

The Digital Twin module visualizes **changes in neurotransmitter production in specific brain regions** based on the user's daily log inputs. Instead of abstract "health bars", each quiz result maps to concrete changes:

- **Region-specific**: e.g. "dopamine ↓ in prefrontal cortex" (not just "dopamine is low")
- **Directional**: `increase` or `decrease` — shows whether production goes up or down
- **Magnitude**: 0–1 scale controlling visualization intensity on the 3D model

Example: sleeping 5 hours → `cortisol ↑ 0.8 in amygdala` + `dopamine ↓ 0.7 in prefrontal cortex`
