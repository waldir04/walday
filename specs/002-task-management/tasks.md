# Tasks: Task Management

**Input**: Design documents from `/specs/002-task-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Baseline smoke tests only.

**Organization**: Tasks grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: User story (US1, US2, US3)

## Path Conventions

- **Web app (frontend)**: `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Feature module scaffolding

- [x] T001 Create feature module structure (`frontend/src/features/tasks/`)
- [x] T002 [P] Create Task type and validation (`frontend/src/features/tasks/model/task.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage and base UI

- [x] T003 Setup localStorage persistence helpers (`frontend/src/features/tasks/lib/storage.ts`)
- [x] T004 [P] Create TaskForm component (`frontend/src/features/tasks/ui/TaskForm.tsx`)
- [x] T005 [P] Create TaskItem component (`frontend/src/features/tasks/ui/TaskItem.tsx`)
- [x] T006 Create TaskList component (`frontend/src/features/tasks/ui/TaskList.tsx`)

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - Create and view tasks (Priority: P1) 🎯 MVP

**Goal**: Create tasks with title and view them.

**Independent Test**: Create a task and verify it appears.

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement task creation logic
- [x] T008 [US1] Render task list on Tasks page (`frontend/src/pages/TasksPage.tsx`)
- [x] T009 [US1] Add validation for empty title

**Checkpoint**: US1 functional independently

---

## Phase 4: User Story 2 - Edit and delete tasks (Priority: P1)

**Goal**: Edit details and delete with confirmation.

**Independent Test**: Edit title and delete with confirmation.

### Implementation for User Story 2

- [x] T010 [P] [US2] Implement edit task flow
- [x] T011 [US2] Implement delete with confirmation
- [x] T012 [US2] Integrate edit/delete into TaskItem

**Checkpoint**: US1 and US2 work independently

---

## Phase 5: User Story 3 - Complete and organize tasks (Priority: P2)

**Goal**: Toggle completion, set priority/due date/duration, organize by status.

**Independent Test**: Toggle completion and set fields.

### Implementation for User Story 3

- [x] T013 [P] [US3] Implement completion toggle
- [x] T014 [P] [US3] Add priority selector
- [x] T015 [US3] Add due date and duration inputs
- [x] T016 [US3] Organize tasks by completion status

**Checkpoint**: All stories functional

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T017 [P] Add empty state UI
- [x] T018 [P] Add i18n strings (en/es)
- [x] T019 Run quickstart validation

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup
- **User Stories (Phase 3+)**: Depend on Foundational
- **Polish (Final Phase)**: Depends on all stories

### Parallel Opportunities

- T002, T004, T005 parallel
- T013, T014 parallel

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 + Phase 2
2. Complete Phase 3 (US1)
3. Validate independently

### Incremental Delivery

1. Setup + Foundational
2. US1 → MVP
3. US2 → edit/delete
4. US3 → completion/organization

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Commit after each task or logical group
## Phase N+1: Tests (Constitution requirement)

- [x] T020 [P] [US1] Unit test for validateTitle in frontend/tests/task-model.test.ts
- [x] T021 [P] [US1] Unit test for TaskList rendering in frontend/tests/task-list.test.tsx
