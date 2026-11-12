# Walday Constitution

This document defines **how** Walday must be engineered. `docs/product-overview.md` defines **what** Walday is intended to accomplish and which product requirements guide its development. Where the two documents overlap, the product overview governs product behavior and this constitution governs engineering standards.

## Core Principles

### I. Clean Code, SOLID, and Simplicity (NON-NEGOTIABLE)

The codebase MUST prioritize readability, maintainability, and clarity.

- Follow Clean Code principles and apply SOLID where appropriate.
- Write self-documenting code with meaningful names for variables, functions, components, classes, and modules.
- Prefer simple and explicit solutions over unnecessary abstractions.
- Keep functions and components focused on a single responsibility.
- Each module MUST have one primary reason to change.
- Avoid duplicated logic and unnecessary coupling.
- Avoid premature optimization and overengineering.
- Do not introduce speculative abstractions for imagined future needs; solve the problem at hand.
- Use abstractions when they provide clear benefits, not merely to follow a pattern.
- Keep business logic separate from presentation, HTTP, and infrastructure concerns.
- Avoid excessively large files, components, functions, and modules. A unit MUST remain reviewable in a single pass; split it by responsibility rather than by line count.
- Comments explain complex decisions, constraints, or non-obvious behavior, never what the code already expresses.

SOLID and design patterns are applied pragmatically rather than mechanically. Complexity MUST be justified by a current requirement, not by an anticipated one.

### II. Strict TypeScript and Type Safety (NON-NEGOTIABLE)

TypeScript MUST be used throughout frontend and backend.

Compiler settings:

- `strict: true` MUST be enabled in every TypeScript project, including the solution-level configuration and every referenced project.
- `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` MUST also be enabled.
- Relaxing any of these settings requires a constitutional amendment, not a per-project decision.

Type discipline:

- The use of `any` is strictly prohibited, whether explicit or implicit.
- `@ts-ignore` and `@ts-expect-error` MUST have an adjacent justification. Prefer `@ts-expect-error` with the expected error described. Use them only for genuine third-party typing defects.
- Type assertions (`as`) and non-null assertions (`!`) are permitted only at validated boundaries and MUST have a written justification. They MUST NOT be used to silence the compiler.
- Use `unknown` when a value is genuinely unknown and narrow it safely before use.
- Use generics when they provide meaningful type reuse and stronger type safety.
- Prefer explicit domain types, interfaces, and discriminated unions with well-defined contracts.
- Avoid duplicating types when they can be shared through a contract or schema.
- Prefer literal unions over TypeScript `enum`; where the compiler forbids enums (for example `erasableSyntaxOnly`), literal unions are mandatory.

Runtime validation:

- External data MUST be validated at runtime with Zod when it enters the application: HTTP requests and responses, browser storage, environment variables, and third-party API payloads.
- Do not assume API responses, environment variables, or third-party data are valid simply because TypeScript types describe them.
- Contract types SHOULD be derived from Zod schemas (`z.infer`) so that validation and static types have a single source of truth.
- Prisma types and persistence models MUST NOT be exposed through the API; map them to domain models or DTOs.

Type safety MUST be preserved across every application boundary.

### III. Frontend Architecture: Feature-Sliced Design (NON-NEGOTIABLE)

The frontend MUST follow Feature-Sliced Design (FSD).

Layer model:

- The canonical layers are `app`, `pages`, `widgets`, `features`, `entities`, and `shared`.
- Imports MUST flow downward only: `app` may import any lower layer, `pages` may import `widgets`, `features`, `entities`, and `shared`, and so on. A layer MUST NOT import from a layer above it.
- Slices at the same layer MUST NOT import each other directly. `features` and `entities` communicate through their public APIs and are composed by higher layers.
- Each slice exposes a public API through an `index.ts` file. Importing another slice's internal files is prohibited.

Responsibilities:

- `shared` contains UI primitives, utilities, configuration, and infrastructure adapters. It MUST NOT contain business rules.
- Data-fetching hooks and server-state logic belong in `entities` or `features`, never in `shared`.
- `entities` hold domain models, validation, and business rules for a single domain concept.
- `features` hold user interactions and use cases composed from entities.
- `pages` and `widgets` compose features and entities into screens and layout regions.
- `app` holds providers, routing, global configuration, and application-level composition.

Structure:

- Avoid relative import chains that climb directories (`../../../`). Use configured path aliases.
- Avoid circular dependencies and uncontrolled cross-feature imports.
- Features MUST remain cohesive and reasonably independent.
- Avoid unnecessary layers or folders without a clear architectural purpose.
- Tests MUST be colocated with their subject or mirrored in a test location without breaking layer boundaries.

### IV. Backend Architecture and Modular Design (NON-NEGOTIABLE)

The backend MUST follow a layered, feature-oriented architecture.

Mandatory request flow: `routes → controllers → services → repositories`, with validation, authentication, authorization, not-found handling, and centralized error middleware.

Layer responsibilities:

- `routes`: path definitions and middleware wiring only. No business logic, no validation logic beyond attaching middleware.
- `controllers`: parse validated input, call a service, and map the result to an HTTP response. Controllers MUST NOT contain business logic and MUST NOT access Prisma.
- `services`: framework-agnostic business rules, transaction orchestration, and typed domain errors. Services MUST NOT depend on Express request or response objects.
- `repositories`: the sole access point to Prisma. Repositories MUST NOT contain HTTP concerns or business rules.

Request validation:

- Zod validation is mandatory on **every** endpoint for `body`, `params`, and `query`, even when a given part is empty.
- Request bodies MUST use strict schemas (`.strict()`) unless a documented reason justifies allowing unknown keys.
- Handler input types MUST be inferred from the validation schemas, not declared separately.

Error handling:

- A single centralized error middleware MUST produce one response envelope, stable machine-readable codes, and a correct HTTP status mapping.
- Production responses MUST NOT include stack traces, database errors, or internal identifiers.
- Logged errors MUST be correlated with the request and MUST NOT contain secrets or personal data.
- Asynchronous errors MUST reach the error middleware without producing unhandled rejections.

Cross-cutting concerns:

- Configuration MUST be typed and validated at startup; the application MUST fail fast on invalid or missing configuration.
- CORS MUST use an explicit per-environment allowlist. Wildcard origins MUST NOT be combined with credentials.
- Request body size limits MUST be configured.
- Sensitive endpoints (authentication, account changes, guest data migration) MUST be rate limited, whether at the edge/proxy or through approved middleware.

Express and Prisma MUST NOT be coupled to business rules. Frontend FSD layers MUST NOT be reproduced in the backend.

### V. React Component Design and Reusability

React components MUST remain small, focused, and maintainable.

- Prefer small components with clear responsibilities.
- Presentational components MUST NOT fetch data or contain business rules.
- Separate data access, state management, and presentation; extract logic into custom hooks when appropriate.
- Component props MUST be explicitly typed. Variant-driven components SHOULD use discriminated unions rather than loosely related boolean flags.
- Prefer composition over configuration-heavy components and compound components when they provide a meaningful API.
- Keep state as close as possible to where it is needed.
- Avoid deep prop drilling; lift composition or use targeted context rather than introducing indiscriminate global state.
- Avoid excessively large JSX structures and deeply nested conditional rendering.
- Use memoization only when there is a demonstrated or reasonably justified performance benefit; avoid premature `React.memo`, `useMemo`, and `useCallback`.
- Forms MUST be controlled and validated with a shared Zod schema. Field errors MUST be associated with their inputs (for example through `aria-describedby`) and, for longer forms, summarized accessibly.

Reusable components have clear APIs, predictable behavior, and appropriate tests.

### VI. Styling, Design Tokens, and Visual Consistency

Tailwind CSS is the only styling mechanism.

- CSS-in-JS, component kits, and additional styling frameworks are prohibited.
- Inline styles are prohibited unless a justified technical need exists.
- `!important` is prohibited unless there is a clear and justified technical reason.
- Arbitrary values are permitted only when the design system has no suitable token.

Design tokens:

- Design tokens MUST have a single source of truth: the Tailwind v4 `@theme` block. Duplicated token definitions in a legacy Tailwind configuration file MUST be consolidated into that source when the affected area is touched.
- The semantic palette MUST define at least `primary`, `surface`, `muted`, `border`, `danger`, `success`, `warning`, and `focus`, and MUST meet WCAG AA contrast where used for text and interface elements.
- Components MUST NOT contain raw hex colors; they MUST use semantic tokens.
- Typography MUST follow an explicit hierarchy (display, title, body, caption) with consistent spacing, radius, shadow, and density scales.
- Visual implementation MUST align with Walday's calm, friendly, minimalist direction, with a light theme by default.

Layout and interaction:

- Use semantic HTML and follow a logical heading hierarchy.
- `focus-visible` styling is mandatory on every interactive element and MUST be consistent across the application.
- Layouts MUST be mobile-first and fully responsive, verified at 360, 768, 1024, and 1440 pixel widths.
- No horizontal scrolling may be introduced at supported widths.
- Touch targets MUST be at least 24 by 24 CSS pixels (44 pixels recommended).
- Motion MUST be minimal and MUST respect `prefers-reduced-motion`.

Mandatory asynchronous UX states: every asynchronous surface MUST implement all of the following.

- **Skeleton** loading state that matches the final layout. A spinner, loose text such as "Loading…", or layout-shifting placeholder is not acceptable.
- **Empty state** with a clear explanation and a primary call to action when the user can act.
- **Error state** with a localized message and a retry action when retry is meaningful.
- **Success feedback** for mutations that change user-visible data.

Loading and status changes MUST be exposed to assistive technologies (`aria-busy`, live regions) and MUST avoid avoidable layout shift.

### VII. Testing Strategy and Quality Assurance (NON-NEGOTIABLE)

- Use Vitest and React Testing Library for frontend unit and component testing.
- Use Vitest for backend services, repositories, and route-level integration tests.
- Route integration tests MUST exercise the real application with network dependencies mocked.
- Apply the Arrange-Act-Assert (AAA) pattern.
- Test observable behavior rather than implementation details.
- Avoid tests excessively coupled to internal component structure; snapshot-only tests are not evidence of correctness.
- Control time and timers deterministically. Unit tests MUST NOT perform real network calls.
- Prioritize meaningful tests for business rules, critical user journeys, and edge cases.
- Test loading, success, empty, and error states, plus relevant boundary states.
- Test Zod validation at boundaries, authorization and ownership rules, transactions and rollback behavior, and centralized error middleware.
- Test keyboard interaction and accessible roles for critical journeys.
- Mock external services and network dependencies appropriately.
- Backend business logic, services, validation, and API behavior MUST also be tested.

Coverage: minimum 80% global; approximately 90% for critical business logic and high-risk functionality. Exclusions MUST be justified and documented. Do not sacrifice test quality to increase coverage. Coverage is an indicator of completeness, not proof of quality.

**No task is complete without the relevant tests written and passing.**

### VIII. Performance and Resource Efficiency

- Avoid unnecessary rendering and expensive computations.
- Apply route-level code splitting and lazy loading where appropriate.
- Separate third-party dependencies into appropriate bundles when beneficial.
- Avoid loading unnecessary resources during initial application startup.
- Use memoization only when justified.
- Use virtualization for large collections when rendering all elements would negatively affect performance.
- Optimize network requests: no request waterfalls, no repeated identical requests, and deliberate TanStack Query `staleTime` and invalidation behavior.
- Review bundle size and dependency impact whenever a dependency is added.
- Optimize images and assets.
- Enable HTTP compression for production responses where supported.
- Consider Core Web Vitals and use Lighthouse to identify relevant performance issues.
- Backend queries MUST select only required fields, MUST NOT produce N+1 query patterns, and MUST avoid unbounded result sets.
- Establish performance budgets when sufficient baseline information is available.

Performance improvements MUST be based on actual bottlenecks or reasonable architectural evidence.

### IX. Scalability, Resilience, and Fault Isolation

- Keep modules cohesive and loosely coupled.
- Avoid making unrelated features depend on a single external service.
- Handle third-party API failures gracefully.
- Provide meaningful loading, empty, and error states.
- Failure of a non-critical service, especially weather, MUST NOT prevent task management, agenda, or dashboard functionality.
- Communicate degraded states explicitly and in a localized way (`stale`, `unavailable`) rather than presenting outdated or missing data as current.
- Use explicit timeouts, bounded retries with backoff, and caching with a defined TTL for external requests.
- Prefer last-known-good data over hard failure where the contract allows it, clearly marked as stale.
- Never propagate raw provider errors to the interface; map them to stable codes.
- Isolate failures per feature and allow partial degradation.
- Avoid uncontrolled propagation of errors between application modules.
- Design interfaces and contracts that can evolve without unnecessary breaking changes.
- Do not introduce premature microservices or distributed infrastructure.

### X. API Contracts and Independent Deployment (NON-NEGOTIABLE)

- Zod schemas are the source of truth for request and response contracts.
- Shared or synchronized contract schemas MUST be kept consistent between frontend and backend and covered by contract tests where duplication is unavoidable.
- Define clear request and response structures for every endpoint.
- Maintain a single error envelope: `{ "error": { "code": string, "message": string, "details"?: unknown } }`, with stable machine-readable codes.
- Return correct HTTP status codes and never expose internal implementation details through API responses.
- Keep frontend and backend responsibilities clearly separated and deployable independently.
- Configure CORS explicitly for required application origins.
- Do not use unrestricted wildcard CORS policies in production when credentials are involved.
- Keep environment-specific origins and endpoints configurable.
- Apply appropriate HTTP caching headers.
- Never cache user-specific or sensitive responses in shared caches.
- Document API behavior and important contract decisions.

Backend errors MUST provide stable, machine-readable codes so the frontend can display localized messages. The API versioning strategy remains deferred.

### XI. Constants, Hardcoded Values, and Configuration Management

- Do not scatter magic numbers, unexplained string literals, or business constants throughout the codebase.
- Define named constants for meaningful business rules, thresholds, limits, default values, and shared application values.
- Centralize configuration that is shared or environment-dependent in a dedicated, typed configuration module.
- Environment configuration MUST be validated with Zod at startup on both frontend and backend, and the application MUST fail fast when required values are missing or invalid.
- Only public, non-sensitive values may be exposed to the frontend through `VITE_*` variables. Secrets MUST never be shipped to the client.
- Direct access to `import.meta.env` or `process.env` MUST be centralized in the configuration module; components and services MUST consume validated config, not raw environment values.
- Timeouts, TTLs, limits, origins, and provider endpoints MUST be named per-environment configuration.
- A `.env.example` MUST be maintained with every documented variable.
- Do not hardcode API URLs, credentials, secrets, environment-specific endpoints, timeouts, or other deployment-specific settings.
- Use literal unions or typed structures when they improve consistency and type safety.
- Keep configuration responsibilities separate from business logic.

Practical exception: simple, self-explanatory values intrinsic to an operation may remain inline when extracting them would reduce readability or add unnecessary indirection. The objective is to eliminate magic values and duplicated rules, not to create a constant for every string or number.

### XII. Security and Data Protection (NON-NEGOTIABLE)

- Never commit secrets, credentials, private keys, or sensitive environment configuration.
- Validate and sanitize external input at appropriate boundaries.
- Apply authentication and authorization checks on every protected backend resource.
- Enforce ownership checks on every user-scoped resource query and mutation to prevent insecure direct object references. Never rely on a client-supplied user identifier for authorization.
- Never rely exclusively on frontend validation for security.
- Protect against common web vulnerabilities, including injection, XSS, and CSRF, where applicable.
- If cookie-based authentication is chosen, cookies MUST be `httpOnly`, `Secure`, and use an appropriate `SameSite` policy.
- Authentication tokens MUST NOT be stored in `localStorage`.
- Apply CSRF protection where cookie-based sessions make it relevant.
- Use secure transport through HTTPS in production.
- Apply appropriate security headers, including a Content Security Policy.
- Avoid exposing sensitive information in logs, API responses, or error messages.
- Hash passwords with an established, adaptive algorithm; never store or log plaintext credentials.
- Follow least-privilege principles.
- Protect user-specific data and ensure one user cannot access another user's information.
- Enforce request payload limits and rate limiting on sensitive endpoints.
- Treat third-party API responses as untrusted external data.
- Prisma queries MUST be parameterized. Raw SQL (`$queryRaw`, `$executeRaw`) requires written justification and safe parameterization.
- `dangerouslySetInnerHTML` is prohibited unless the content is sanitized by a justified, reviewed mechanism.
- Data read from `localStorage` MUST be treated as untrusted and validated on read.
- Guest storage MUST clearly warn that locally stored information can be lost if browser storage is cleared or the device changes.
- Review authentication, session, and token-management decisions during the appropriate planning stage.

### XIII. Accessibility and Inclusive Design (a11y) (NON-NEGOTIABLE)

Target: WCAG 2.2 Level AA. Accessibility is considered during specification, design, implementation, and testing.

Semantic structure:

- Use semantic HTML elements appropriately; maintain a logical heading hierarchy.
- Use native form controls and interactive elements whenever possible.
- Ensure buttons, links, inputs, and other controls have meaningful accessible names.
- Do not use semantic elements incorrectly to achieve visual effects.
- Use ARIA only when native HTML semantics are insufficient.
- Provide a skip link to the main content where navigation precedes it.
- The document `lang` attribute MUST reflect the active locale.

Keyboard accessibility:

- All essential functionality MUST be available through keyboard interaction.
- Maintain a visible and consistent `focus-visible` indicator and a logical focus order; prevent keyboard traps.
- Manage focus appropriately in dialogs, menus, forms, and other interactive components, including returning focus to the invoking element when a dialog closes.
- Do not require precise pointer movement to complete essential tasks.

Screen reader support:

- Provide appropriate labels and descriptions.
- Associate form fields with their instructions and validation messages.
- Communicate dynamic changes, loading states, and important status updates; use live regions for asynchronous results and localized announcements.
- Ensure meaningful information is not communicated exclusively through icons, colors, or visual positioning.
- Use ARIA live regions appropriately; do not use ARIA as a replacement for correct semantic HTML.

Visual accessibility:

- Meet WCAG 2.2 AA contrast requirements: at least 4.5:1 for normal text and 3:1 for large text and interface components.
- Ensure interactive targets meet the WCAG 2.2 minimum target size.
- Do not use color as the only way to communicate status, priority, or errors.
- Support browser zoom and text resizing; maintain readable typography and sufficient spacing.
- Respect `prefers-reduced-motion`; ensure focus indicators are clearly visible; avoid unnecessary animations.

Responsive and touch accessibility:

- Ensure accessible interaction on desktop and mobile devices.
- Provide sufficiently large and well-spaced touch targets per WCAG 2.2.
- Avoid interactions depending exclusively on hover.
- Preserve usability at different viewport sizes and zoom levels.

Forms and validation:

- Provide visible labels and clear instructions.
- Display validation errors meaningfully and accessibly; associate errors with fields and provide an accessible error summary for longer forms.
- Communicate submission success and failure; preserve user input when practical after validation failures.

Asynchronous interfaces:

- Loading surfaces MUST expose `aria-busy` and announce completion or failure through appropriate live regions.
- Skeletons MUST be hidden from assistive technologies when they carry no information, while the busy state remains announced.
- Weather and planning suggestions MUST NOT rely exclusively on icons or colors and MUST communicate reasoning through text.

Walday-specific requirements:

- Weather information MUST NOT rely exclusively on icons or colors, and unavailable or stale weather MUST be stated in text.
- Agenda entries and chronological relationships MUST be understandable to assistive technologies.
- Planning suggestions MUST communicate reasoning through text, not just visual indicators.
- Task completion and priority changes MUST be communicated accessibly.
- Dialogs and interactive menus MUST support appropriate focus management and keyboard operation.
- Language selection and document language MUST be exposed correctly to assistive technologies.

Accessibility testing:

- Include accessibility checks in component and integration testing.
- Use tools such as axe-core and Lighthouse where appropriate; these are evaluation tools made available in development and CI, not runtime dependencies.
- Test keyboard navigation and focus management.
- Perform manual screen reader checks for critical user journeys.
- Automated tools MUST NOT be considered sufficient proof of accessibility compliance.

Accessibility violations affecting critical user journeys MUST be treated as defects.

### XIV. Internationalization and Localization (i18n/l10n) (NON-NEGOTIABLE)

Initial supported languages: English (`en`), Spanish (`es`). The architecture MUST allow additional languages without structural changes.

The project uses `i18next` and `react-i18next`. These are the approved internationalization libraries; introducing another i18n library requires a constitutional amendment.

Translation architecture:

- English is the canonical source language for translation keys and developer-facing technical artifacts.
- All user-facing interface text MUST be externalized from React components into structured translation resources.
- Hardcoded user-facing text inside components is prohibited.
- Use descriptive, consistent translation keys; organize logically by feature or shared interface area.
- Keep translation resources separate from business logic.
- Support fallback behavior when a translation is missing; English is the fallback language.
- Persist the user's language preference when appropriate.
- Allow users to switch languages without requiring a full application reload.
- Load translation resources efficiently, using lazy loading where appropriate.
- Translate pluralization and interpolation via the i18n library's safe mechanisms, never through ad hoc string concatenation.

Localized content MUST include navigation and interface labels, buttons and actions, form labels and validation messages, notifications and feedback, empty/loading/error states, planning suggestions, weather descriptions, and accessibility labels and screen reader descriptions.

Locale-aware formatting:

- Format dates, times, numbers, currencies, and units with `Intl` according to the selected locale.
- Respect relevant calendar and regional conventions.
- Keep timezone preferences independent from the selected interface language.
- Keep weather unit preferences independent from the selected interface language.
- Avoid assuming all users share the same date, time, or measurement conventions.
- Handle dynamic translation interpolation safely.

Backend localization:

- Backend APIs MUST return stable, machine-readable error codes rather than localized user-facing messages.
- The frontend MUST translate those codes into the selected language.
- Technical logs and developer-facing messages MUST remain in English.
- If the backend generates user-facing messages, it MUST support an appropriate localization strategy.

### XV. Documentation and Technical Communication

- Document important architectural decisions and their rationale.
- Keep project documentation aligned with the actual implementation.
- Document setup instructions, environment variables, and development workflows.
- Maintain clear API documentation where appropriate.
- Document non-obvious business rules and important edge cases.
- Prefer concise, useful documentation over excessive or duplicated descriptions.
- Keep technical documentation, code comments, naming conventions, and development artifacts in English.
- Ensure documentation changes accompany significant architectural or behavioral changes.
- Record durable architectural decisions as Architecture Decision Records (ADRs).
- Document constitutional exceptions as ADRs, including scope and remediation intent.

### XVI. Automated Quality Gates and Git Hooks

- Every application in the repository MUST expose the same script contract, runnable from the application directory: `lint`, `typecheck`, `test`, and `build`.
- These scripts MUST be the canonical entry points; Git hooks and CI MUST invoke the same commands rather than duplicating their logic.
- Git hooks SHOULD be configured to execute relevant quality checks before commits and pushes.
- Pre-commit hooks SHOULD execute fast checks, such as formatting and linting of staged files.
- Pre-push hooks SHOULD execute more comprehensive checks: type checking, tests, and production build validation.
- Hook execution MUST remain reasonably fast to avoid disrupting the development workflow.
- Do not duplicate expensive validations across multiple stages without a clear reason.
- Critical quality checks MUST also run in CI/CD pipelines, regardless of local Git hook execution.
- Local Git hooks MUST NOT be considered a replacement for CI/CD validation.
- Ensure all developers and contributors can install and use the same hook configuration consistently.
- Document how to install, execute, and troubleshoot the project's Git hooks.
- Any mechanism to bypass hooks MUST be treated as an exceptional action, not a normal development workflow.

Hook tooling (for example Husky with lint-staged) is development tooling and MUST NOT introduce runtime dependencies.

### XVII. Frontend Server State and Async UX (NON-NEGOTIABLE)

TanStack Query is the only server-state mechanism.

- Server data MUST be read and written through `useQuery` and `useMutation` (or their framework-equivalent APIs).
- The following are prohibited: `useEffect` for HTTP requests, manual `fetch` calls inside components, and parallel stores that duplicate server data (Redux, MobX, Zustand, or ad hoc context stores).
- Data-fetching hooks belong in `entities` or `features`, never in `shared`.

Query discipline:

- A single `QueryClient` is configured at the application root.
- Query keys MUST be produced by a key factory to avoid inconsistent or duplicated keys.
- `staleTime`, `gcTime`, and refetch behavior MUST be deliberate per resource, not left to defaults without review.
- Mutations MUST invalidate or update the affected queries after success.
- Optimistic updates are permitted only with a defined rollback path and visible error feedback.
- The query cache MUST be cleared on sign-out.
- Sensitive query data MUST NOT be persisted to storage.

Mutation UX:

- Every mutation MUST expose a pending state, prevent duplicate submission while pending, and report failure explicitly. Mutations MUST NOT fail silently.
- Every asynchronous surface MUST implement the skeleton, empty-with-CTA, and error-with-retry states defined in Principle VI.

Boundary with local persistence:

- `useEffect` is permitted for non-network side effects, including synchronizing local persistence, subscriptions, timers, and focus management. It is not permitted for fetching or mutating server data.
- Guest data stored in `localStorage` is not server state. It MUST be encapsulated behind a storage or repository layer (for example in `shared/lib` infrastructure or an entity repository) and MUST NOT be read or written ad hoc throughout components.
- Persisted guest data MUST be versioned, validated on read, and migrated safely when its shape changes.

### XVIII. Data Integrity and Persistence with Prisma (NON-NEGOTIABLE)

PostgreSQL and Prisma are the official persistence layer.

Schema and migrations:

- `schema.prisma` is the source of truth for the data model.
- Migrations MUST be versioned, committed, and reviewed. Applied migrations MUST NOT be edited.
- `prisma db push` is prohibited in production environments.
- The Prisma Client is the typed access layer. Explicit `select` (or `include` where justified) MUST be used to avoid over-fetching.
- `$queryRaw` and `$executeRaw` require written justification and safe parameterization.
- Prisma types MUST NOT leak into API contracts or UI models; map them to domain models and DTOs.

Transactions and invariants:

- Transactions are mandatory for multi-write invariants, including guest-to-account migration, accepting a rescheduling suggestion that touches multiple records, and create or update operations that check for conflicts.
- Partial writes MUST NOT be possible for a single user action.
- Transactions MUST be kept short and free of external network calls.

Modeling:

- Constraints and indexes MUST exist for real query filters and uniqueness rules (for example a user and date combination).
- Foreign keys and `onDelete` behavior MUST be explicit.
- Records MUST have creation and update timestamps; identifiers MUST be UUIDs unless a documented reason exists otherwise.
- Status and type fields SHOULD use database enums or constrained values, aligned with literal unions in application code.

Ownership and concurrency:

- Every query and mutation on user-owned resources MUST be scoped by the authenticated user identifier, and the repository layer MUST enforce ownership.
- Optimistic concurrency control (`updatedAt` or an explicit version field) MUST be used where concurrent edits can cause data loss.

Guest data:

- Locally persisted data MUST have an explicit versioned schema and MUST be validated on read.
- Guest-to-account migration MUST be explicit, transactional on the server, and safe against partial failure.
- Local and remote data MUST NOT be mixed without a defined conflict-resolution strategy.

### XIX. External Integrations and Weather Resilience (NON-NEGOTIABLE)

Open-Meteo is the approved weather provider. It is consumed through native `fetch` from the backend; no provider SDK is used.

- The frontend MUST NOT call the provider directly. All weather access goes through the backend proxy.
- Provider responses MUST be validated with Zod and mapped to an internal domain model. Provider DTOs MUST NOT reach the UI.
- Requests MUST use `AbortController` with a configurable timeout (approximately 3 to 5 seconds).
- Retries MUST be bounded, applied to GET requests only, and use backoff with jitter.
- Weather data MUST be cached with a TTL keyed by location, units, and time window. Background revalidation and brief negative caching are expected.
- When fresh data is unavailable, the system MUST fall back to last-known-good data marked as `stale` rather than failing the surface.
- Provider failures MUST map to stable codes such as `WEATHER_UNAVAILABLE` and `WEATHER_STALE`. Raw provider errors MUST NOT reach the client.
- Weather logs MUST NOT contain personal data such as precise user coordinates beyond what the provider request requires.
- Provider usage terms and attribution requirements MUST be honored.
- Weather is optional context: it MUST never become a dependency for tasks, agenda, or the dashboard.

### XX. Technology Stack Governance and Dependency Discipline (NON-NEGOTIABLE)

The approved stack is defined in **Technology Stack and Architectural Boundaries**. That table is closed.

- A new runtime dependency MUST be justified in writing with: the need it addresses, alternatives considered, bundle and performance impact, license, security posture, and constitutional fit.
- Prefer platform APIs and existing dependencies over adding new ones.
- Duplicated concerns are prohibited by default. Examples: HTTP clients instead of native `fetch`, Redux/MobX/Zustand for server state, CSS-in-JS or UI kits alongside Tailwind, form libraries that duplicate Zod validation, date libraries instead of `Intl`, and `lodash`-style utility libraries without specific need.
- Development-only tooling (ESLint or oxlint, Prettier, Husky, lint-staged, axe-core, Lighthouse) is permitted without amendment and MUST be documented.
- Lockfiles MUST be committed.
- The Node.js version MUST be pinned in the repository.
- Dependency updates MUST be reviewed; deprecated or unmaintained packages MUST NOT be introduced.
- Minor and patch upgrades within an approved major version are routine maintenance. Major version upgrades, replacements, or removals require a constitutional amendment.

## Technology Stack and Architectural Boundaries

The following stack is approved as of version 2.0.0 of this constitution. Versions indicate the approved major line; routine minor and patch updates within it do not require an amendment.

| Area | Approved technology | Notes |
|---|---|---|
| Frontend framework | React 19 | Functional components and hooks |
| Language | TypeScript 5 | Strict settings everywhere (Principle II) |
| Build tool | Vite | |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite` | `@theme` is the only token source |
| Routing | React Router 7 | Routing structure aligned with FSD |
| Server state | TanStack Query | Exclusive server-state mechanism (Principle XVII) |
| Validation | Zod | HTTP, storage, environment, and external API boundaries |
| Internationalization | i18next 26, react-i18next 17 | No alternative i18n library (Principle XIV) |
| Frontend testing | Vitest 5, React Testing Library, jest-dom | |
| Lint and formatting | ESLint, Prettier (oxlint permitted) | Development tooling |
| Backend runtime | Node.js LTS | Version pinned in the repository |
| Backend framework | Express | |
| Backend language | TypeScript | Same strict settings as frontend |
| Backend validation | Zod | `body`, `params`, and `query` on every endpoint |
| ORM | Prisma | Sole persistence access layer (Principle XVIII) |
| Database | PostgreSQL | |
| Backend testing | Vitest | Services, repositories, and route integration |
| Weather integration | Open-Meteo via backend proxy | Native `fetch`; no SDK (Principle XIX) |
| Authentication | Email/password and Google sign-in | Provider and session strategy deferred |

Architectural boundaries:

- Walday is a React single-page application backed by an independent JSON API.
- GraphQL, microservices, and server-side rendering are not part of the approved architecture.
- The frontend lives in `frontend/`; the backend lives in `backend/` once implemented. Frontend and backend MUST be deployable independently.
- Environment-specific origins and endpoints MUST be configurable per environment.
- The stack is changeable only through a constitutional amendment. A feature specification or implementation plan MUST NOT introduce a technology outside this table.
- The backend MUST expose a documented JSON contract; the versioning mechanism itself remains deferred.

Frontend standards:

- Use functional React components and hooks.
- Keep presentation, application state, and business logic appropriately separated.
- Use TanStack Query as the exclusive server-state mechanism.
- Avoid global client-state libraries unless a concrete requirement justifies one.
- Use accessible, reusable UI components aligned with the design tokens.
- Validate forms with Zod schemas shared with the boundary contract where possible.
- Ensure asynchronous operations expose loading, empty, success, and failure states.
- Review bundle size and dependency impact when adding libraries.
- Keep routing and navigation consistent with the feature structure.

Backend standards:

- Use TypeScript consistently across the backend.
- Keep controllers focused on HTTP request and response handling.
- Place business rules in application or domain services.
- Validate every request at the system boundary.
- Use centralized error handling with stable codes.
- Avoid leaking database or infrastructure details into business logic or API responses.
- Keep database operations predictable and efficient.
- Use transactions when business consistency requires them.
- Keep API responses consistent.
- Avoid unnecessary abstractions or infrastructure.

## Development Workflow, Quality Gates, and Definition of Done

### Specification workflow

Before creating or modifying a feature specification, implementation plan, or task list, the work MUST review:

1. `docs/product-overview.md` for product scope and business rules.
2. This constitution for engineering standards.

The Spec Kit flow is: specification, then plan including an explicit Constitution Check, then tasks, then implementation.

- A plan's Constitution Check MUST reference principles by number and name. Renumbering principles is prohibited for this reason.
- Specifications authored after this amendment MUST also evaluate Principles XVII through XX.
- Requirements that conflict with this constitution or the product overview MUST be identified explicitly rather than silently reinterpreted.

### Quality gates

- Every application MUST expose `lint`, `typecheck`, `test`, and `build` scripts and they MUST pass before a task is considered complete.
- Pre-commit checks SHOULD run fast validation such as linting and formatting of staged files.
- Pre-push checks SHOULD run `typecheck`, `test`, and `build`.
- CI MUST run the same commands and MUST be mandatory for pull requests.
- Git hooks MUST NOT replace CI validation.
- Bypassing hooks or CI is an exceptional action that MUST be justified and reviewed.

### Definition of Done

A task is complete only when all of the following hold:

- `lint`, `typecheck`, `test`, and `build` pass.
- Relevant tests exist for new business logic and critical flows, and they pass.
- No `any`, unjustified type assertions, or unjustified suppressions were introduced.
- Untrusted data is validated with Zod at every boundary it crosses.
- Loading, empty, error, and success states are implemented for asynchronous surfaces.
- Keyboard interaction, focus behavior, and responsive layout at supported widths were verified.
- User-facing copy exists in both `en` and `es`.
- Documentation or an ADR was updated when architecture, contracts, configuration, or behavior changed.
- No secrets or sensitive data were introduced into code, configuration, logs, or fixtures.
- CI is green.
- The change complies with this constitution, and any exception is recorded and justified.

### Code review

- Reviews MUST verify constitutional compliance, not only functional correctness.
- Reviewers MUST check for duplicated logic, unnecessary complexity, type safety, runtime validation, test quality, accessibility, responsive behavior, performance impact, security implications, and documentation.
- Exceptions MUST be recorded and justified; silent deviations are defects.
- AI-generated code MUST meet the same quality, security, testing, and review standards as manually written code.

## Architectural Decisions Intentionally Deferred

The constitution MUST NOT prematurely lock down decisions that require further product or technical analysis. The following remain open until the relevant specification and planning work:

- Authentication provider selection and configuration beyond the product-mandated email/password and Google sign-in options.
- Session management and token strategy.
- Guest-to-account migration implementation details and conflict resolution.
- API versioning strategy.
- PWA offline capabilities and synchronization behavior.
- Hosting and deployment configuration.
- Monitoring, logging, and observability tooling.
- Specific caching policies beyond the requirements in Principles IX and XIX, and performance budgets.
- The mechanism for sharing API contracts between frontend and backend.
- Where rate limiting is enforced (edge/proxy versus application middleware).
- Detailed database schema and relationships, defined per feature specification within the constraints of Principle XVIII.

These decisions MUST be made through the Spec Kit workflow and documented when they have meaningful architectural impact. Do not introduce infrastructure or design patterns solely because they are common in larger systems.

## Governance

The constitution is the authoritative source of project-wide engineering principles.

- All specifications, plans, tasks, and implementation work MUST be consistent with the constitution.
- New features MUST respect the established architectural and quality standards.
- If an implementation decision conflicts with a constitutional principle, the conflict MUST be explicitly identified and resolved.
- Any exception MUST have a clear justification and, when durable, an ADR.
- Changes to the constitution MUST be intentional and reviewed.
- Do not weaken an existing principle merely to accommodate a shortcut or temporary implementation convenience.

### Amendments

1. Propose the change with its rationale and affected principles.
2. Classify the version bump according to the rules below.
3. Review the change for conflicts with the product overview and existing specifications.
4. Update affected templates, plans, and specifications that cite the changed principles.
5. Record the amendment date in the footer.

### Versioning

The constitution uses semantic versioning:

- MAJOR: incompatible changes to existing principles, renumbering, or governance changes.
- MINOR: new principles or substantial additions.
- PATCH: clarifications, corrections, or wording improvements that do not change the intended requirements.

### Transitional compliance

- New code and changed code MUST comply with this version immediately.
- Existing code that predates this version MUST be brought into compliance when the affected area is touched, and MUST NOT be used as precedent for new work.
- Pre-existing debt MUST NOT block unrelated features, but a change MUST NOT introduce new violations.
- Violations affecting security, data integrity, or accessibility of critical journeys take priority over cosmetic compliance.
- Deviations MUST be recorded in the known-gaps register below or in an ADR until resolved.

### Known-gaps register (as of 2.0.0)

These gaps are tracked, not accepted as compliant behavior. Each MUST be closed when the affected area is touched.

- TanStack Query is not yet installed and no `QueryClientProvider` is configured.
- TypeScript strictness flags are not yet enabled in the frontend `tsconfig` files.
- The shared loading component is a text placeholder rather than a layout-matching skeleton.
- Design tokens are duplicated between the Tailwind v4 `@theme` block and a legacy Tailwind configuration file.
- The frontend environment module is an unvalidated stub.
- The backend application does not exist yet; Principles IV, X, XVIII, and XIX describe its mandatory target state.
- Git hooks invoke scripts that are not currently runnable from the repository root; the per-application script contract is the target state.

The constitution should evolve as the project matures, but changes MUST preserve its role as a consistent engineering standard.

**Version**: 2.0.0 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-11-12
