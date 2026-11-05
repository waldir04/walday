# Tasks: Initial Application Foundation

**Input**: Design documents from `/specs/001-initial-app-foundation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Baseline smoke tests only; comprehensive tests follow future feature coverage requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Path Conventions

- **Web app (frontend)**: `frontend/src/`, `frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create frontend project structure per plan.md (`frontend/`)
- [x] T002 Initialize Vite + React + TypeScript project with dependencies (`frontend/package.json`)
- [x] T003 [P] Configure Tailwind CSS with design tokens (`frontend/tailwind.config.ts`)
- [x] T004 [P] Configure TypeScript strict mode (`frontend/tsconfig.json`)
- [x] T005 [P] Configure ESLint and Prettier (`frontend/.eslintrc`, `frontend/.prettierrc`)
- [x] T006 [P] Add `.env.example` with documented variables (`frontend/.env.example`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

- [x] T007 Setup FSD folder skeleton (`frontend/src/app`, `pages`, `widgets`, `shared`)
- [x] T008 [P] Configure Vite build and dev server (`frontend/vite.config.ts`)
- [x] T009 [P] Configure i18n resources (en/es, fallback) (`frontend/src/shared/i18n/`)
- [x] T010 Configure environment validation (required vs optional) (`frontend/src/shared/config/env.ts`)
- [x] T011 Setup error boundary component (`frontend/src/shared/ui/ErrorBoundary.tsx`)
- [x] T012 Setup loading-state conventions (`frontend/src/shared/ui/Loading.tsx`)
- [x] T013 Configure Git hooks (Husky + lint-staged) (`.husky/`, root config)
- [x] T014 Configure CI pipeline for critical quality gates (`.github/workflows/ci.yml`)

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - Access a running, responsive application shell (Priority: P1) 🎯 MVP

**Goal**: Runnable responsive shell with global navigation and basic page structure.

**Independent Test**: Open app on desktop/mobile; shell renders with navigation and default page.

### Implementation for User Story 1

- [x] T015 [P] [US1] Create app shell layout widget (`frontend/src/widgets/AppShell.tsx`)
- [x] T016 [P] [US1] Create global navigation component (`frontend/src/widgets/Navigation.tsx`)
- [x] T017 [US1] Create home page (`frontend/src/pages/HomePage.tsx`)
- [x] T018 [US1] Wire app entry point and providers (`frontend/src/main.tsx`, `frontend/src/app/App.tsx`)
- [x] T019 [US1] Add baseline smoke test for shell render (`frontend/tests/shell.test.tsx`)

**Checkpoint**: User Story 1 functional and testable independently

---

## Phase 4: User Story 2 - Navigate between basic routes (Priority: P1)

**Goal**: Routing foundation with navigation and not-found state.

**Independent Test**: Click nav links; URL and page content change without full reload; unknown route shows not-found.

### Implementation for User Story 2

- [x] T020 [P] [US2] Configure router with routes (`frontend/src/app/router.tsx`)
- [x] T021 [P] [US2] Create not-found page (`frontend/src/pages/NotFoundPage.tsx`)
- [x] T022 [US2] Create settings placeholder page (`frontend/src/pages/SettingsPage.tsx`)
- [x] T023 [US2] Integrate navigation with router

**Checkpoint**: User Stories 1 and 2 work independently

---

## Phase 5: User Story 3 - Developer can run, test, and quality-check locally (Priority: P2)

**Goal**: Dev/test/lint/format tooling and automated quality checks.

**Independent Test**: Run documented commands; verify dev server, tests, lint, format, hooks.

### Implementation for User Story 3

- [x] T024 [P] [US3] Document setup/run commands (`frontend/README.md` or root README)
- [x] T025 [US3] Verify pre-commit runs formatting + linting
- [x] T026 [US3] Verify pre-push runs typecheck + tests + build
- [x] T027 [US3] Verify CI runs critical quality gates independently

**Checkpoint**: All user stories independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple stories

- [x] T028 [P] Add design tokens documentation (`frontend/src/shared/ui/tokens.md` or config comments)
- [x] T029 [P] Additional accessibility verification (keyboard nav) for shell
- [x] T030 Run quickstart.md validation end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational
- **Polish (Final Phase)**: Depends on all desired stories

### User Story Dependencies

- **US1 (P1)**: After Foundational
- **US2 (P1)**: After Foundational; integrates with US1 navigation
- **US3 (P2)**: After Foundational

### Parallel Opportunities

- T003, T004, T005, T006 (setup) parallel
- T008, T009 (foundational) parallel
- T015, T016 (US1) parallel
- T020, T021 (US2) parallel

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 + Phase 2
2. Complete Phase 3 (US1)
3. Validate independently
4. Deploy/demo

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → MVP
3. US2 → routing validated
4. US3 → tooling validated

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story independently completable and testable
- Commit after each task or logical group
- Avoid vague tasks and same-file conflicts