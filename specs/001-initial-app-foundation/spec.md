# Feature Specification: Initial Application Foundation

**Feature Branch**: `001-initial-app-foundation`

**Created**: 2026-10-30

**Updated**: 2026-11-12

**Status**: Draft

**Input**: User description: "Create a specification for the initial technical foundation of Walday."

## 1. Purpose and Scope

### 1.1 Purpose

Define the initial frontend foundation required to develop the Walday MVP incrementally. The foundation MUST establish a runnable, responsive, accessible, testable, and maintainable application shell and shared infrastructure without implementing any business feature.

This specification is governed by:

- `docs/product-overview.md` for product scope, visual direction, accessibility, localization, and business rules.
- `.specify/memory/constitution.md` for engineering standards and the approved technology stack.

### 1.2 In Scope

| Area | Included capability |
|---|---|
| Application setup | Frontend project setup, development server, production build, preview, and reproducible install. |
| Entry point and lifecycle | Single root mount, deterministic startup sequence, provider composition, global styles, and cleanup. |
| Responsive shell | Mobile-first application layout with semantic regions and supported viewport behavior. |
| Navigation and pages | Global navigation, active route indication, page structure, and placeholder pages. |
| Design system foundation | Design tokens, typography, spacing, color, radius, shadow, density, and light theme. |
| UI primitives | Only the accessible primitives required by the shell. |
| Routing foundation | Declarative routes, client-side navigation, deep links, history behavior, and not-found handling. |
| UX states | Error, loading, empty, and success conventions, including skeleton loading. |
| Development environment | Development server, test runner, browser-like test environment, and test setup. |
| Code quality | Linting, formatting, strict type checking, and canonical quality scripts. |
| Git and CI | Git hooks, pull-request workflow, and CI quality gates. |
| Configuration | Typed environment configuration, validation, and documented variables. |
| Accessibility | WCAG 2.2 AA foundation, keyboard operation, focus, semantics, and responsive behavior. |
| Architecture | FSD boundaries, path aliases, type safety, and approved dependency discipline. |
| Localization foundation | English and Spanish resources, runtime language-change mechanism, and document language. |
| Server-state foundation | Approved server-state mechanism configured at the root, without business queries. |
| Documentation | Setup, scripts, configuration, hooks, architecture, testing, and deferred decisions. |
| Performance and security baseline | Initial bundle discipline, font strategy, secret handling, and safe defaults. |

### 1.3 Out of Scope

The following are explicitly out of scope for this feature:

- Task management, daily commitments, daily agenda, weather integration, and planning suggestions.
- Authentication, guest-to-account migration, cloud synchronization, and user identity.
- Full backend implementation, API endpoints, database schema, Prisma models, and CORS.
- Weather provider integration, caching, and external-service resilience behavior.
- User-preferences UI, the visible language selector, and language-preference persistence; these belong to the user-preferences feature.
- Full design system or component library, dark theme, advanced animations, and branding assets.
- PWA installation, service workers, offline caching, and background synchronization. These remain part of the broader MVP but require a separate specification.
- Analytics, monitoring, error-reporting services, and user tracking.
- Production hosting, deployment configuration, CDN setup, and SPA rewrite rules.
- Production security headers, Content Security Policy, and edge/proxy configuration.
- API versioning, contract-sharing mechanism, and backend session strategy.

### 1.4 Deferred to Planning

The following decisions MUST be evaluated during planning and MUST NOT be treated as fixed by this specification:

- The exact route set beyond the home route, one secondary placeholder route, and the not-found route.
- The responsive navigation pattern at narrow widths, provided every destination remains reachable.
- Exact token values, font loading strategy, icon strategy, and visual density.
- Code-splitting boundaries and route-level lazy-loading granularity.
- The mechanism used to enforce FSD import boundaries, lint rules, and formatting.
- Hook tooling details and staged-file strategy, within constitutional requirements.
- Coverage exclusions for non-executable bootstrap, configuration, and tooling files.
- Test file organization, provided it respects FSD boundaries.
- The name and shape of a future backend base URL configuration value.
- CI provider, caching, and matrix details.
- Production hosting, SPA history fallback, CSP, and security-header configuration.
- Browser-support matrix within modern evergreen browsers.
- Commit-message and branch-naming conventions.

## Clarifications

### Session 2026-11-12

- Q: Should the foundation include a visible language switcher, or only the localization mechanism and English/Spanish resources? → A: Mechanism only; the visible switcher belongs to the user-preferences feature.
- Q: What should determine the initial interface language when no user preference exists? → A: Default to English when no explicit stored preference exists; implicit browser-language detection is deferred, and explicit language persistence belongs to the user-preferences feature.
- Q: Which screen reader and browser pair should define the manual accessibility baseline? → A: VoiceOver with Safari on macOS and iOS; the broader assistive-technology matrix remains deferred.

## 2. User Scenarios & Testing

### User Story 1 - Open a responsive application shell (Priority: P1)

As a visitor, I can open Walday on desktop or mobile and see a calm, responsive application shell with clear navigation and page content.

**Why this priority**: No feature can be delivered without a runnable, responsive shell.

**Independent Test**: Serve the production build and open the root URL at 360, 768, 1024, and 1440 pixel widths; verify semantic regions, navigation, default content, and no horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** a built application, **When** a visitor opens the root URL, **Then** the shell renders a banner/header, primary navigation, main content region, and a default page heading.
2. **Given** a 360-pixel-wide viewport, **When** the application loads, **Then** the layout reflows without horizontal scrolling, clipped content, or inaccessible navigation.
3. **Given** 768, 1024, and 1440 pixel widths, **When** the viewport is resized, **Then** content remains readable, components do not overlap, and no essential functionality is removed.
4. **Given** a 400% browser zoom level, **When** the shell is viewed, **Then** content reflows without loss of information or functionality.

---

### User Story 2 - Navigate between routes and recover from unknown URLs (Priority: P1)

As a user, I can navigate between foundation routes, reload or deep-link to a route, and get a clear not-found page for unknown URLs.

**Why this priority**: Routing and navigation underpin every future feature.

**Independent Test**: Use navigation links, direct URLs, browser back/forward, and unknown paths; verify URL, content, title, focus, and not-found behavior.

**Acceptance Scenarios**:

1. **Given** the application shell, **When** the user selects a navigation item, **Then** the URL updates and the route content renders without a full page reload.
2. **Given** a defined route, **When** the user reloads or opens its URL directly, **Then** the route renders inside the shell and the correct document title is set.
3. **Given** an unknown route, **When** it is opened, **Then** a localized not-found page renders with a link back to the home route and no redirect loop.
4. **Given** navigation history, **When** the user goes back or forward, **Then** the correct route, content, title, and focus state are restored.
5. **Given** any completed route change, **Then** focus moves to the new page heading or main region and the change is announced to assistive technologies.

---

### User Story 3 - Operate the foundation with a keyboard and assistive technology (Priority: P1)

As a keyboard-only or screen-reader user, I can understand the page structure, skip repeated navigation, move through controls, and use all foundation routes.

**Why this priority**: Accessibility is a core product requirement and a constitutional quality gate.

**Independent Test**: Complete the shell and routing journey using only a keyboard, then verify landmarks, headings, names, focus order, announcements, contrast, and target sizes with VoiceOver and Safari and automated checks.

**Acceptance Scenarios**:

1. **Given** the page has loaded, **When** the user presses Tab from the beginning, **Then** a skip link becomes visible first and moves focus to the main content.
2. **Given** the shell, **When** VoiceOver with Safari inspects it, **Then** banner, navigation, and main landmarks are exposed with an accessible navigation name and a logical heading hierarchy.
3. **Given** keyboard navigation, **When** the user moves through interactive elements, **Then** focus order is logical, focus is always visible, and no keyboard trap occurs.
4. **Given** a route change or error fallback, **When** it occurs, **Then** focus and announcements orient the user without relying on color or visual position.
5. **Given** 200% text resizing, **When** the shell is used, **Then** text remains readable and no content or control is lost.

---

### User Story 4 - Use the foundation in English or Spanish (Priority: P2)

As an English- or Spanish-speaking user, I can see foundation interface text in my language, and the application can apply a language change without reloading.

**Why this priority**: English and Spanish are required from the initial product release.

**Independent Test**: Set the application language to English and Spanish through the language-change mechanism; verify navigation, page titles, not-found, error, loading, empty, and accessibility labels; verify `lang` and document title updates.

**Acceptance Scenarios**:

1. **Given** no explicit stored language preference, **When** the application loads, **Then** foundation interface text is displayed in English and the document language is English.
2. **Given** a browser whose preferred language is Spanish but no explicit stored preference exists, **When** the application loads, **Then** it still starts in English; implicit browser-language detection is deferred.
3. **Given** the language-change mechanism applies Spanish, **When** the language change completes, **Then** foundation interface text, document title, and document language update without a full reload and without losing the current route.
4. **Given** a missing Spanish translation, **When** the interface renders, **Then** English fallback text is shown instead of a raw key, blank element, or runtime error.
5. **Given** longer Spanish text or a narrow viewport, **When** labels render, **Then** essential text wraps or reflows without clipping or horizontal scrolling.
6. **Given** an unsupported language value, **When** it is applied, **Then** the application falls back to English and remains usable.

---

### User Story 5 - See clear loading and error states (Priority: P2)

As a user, when a route loads slowly or something fails, I see a localized, accessible state that explains what happened and lets me recover.

**Why this priority**: Predictable failure and loading behavior prevents a fragile foundation from becoming a fragile product.

**Independent Test**: Force a rendering error, delay a lazily loaded route, fail a route chunk, and complete loading; verify fallback, skeleton, announcements, layout stability, and recovery.

**Acceptance Scenarios**:

1. **Given** an unhandled rendering error, **When** the error boundary catches it, **Then** a localized fallback renders without stack traces or sensitive data, focus moves to its heading, and recovery actions are keyboard accessible.
2. **Given** an error limited to one route or feature, **When** it occurs, **Then** the failure is contained to that scope, the shell remains usable where practical, and the user can retry or navigate away.
3. **Given** a route that loads slowly, **When** loading is in progress, **Then** a layout-matching skeleton is shown, the region is marked busy, and no avoidable layout shift occurs.
4. **Given** a failed route chunk request, **When** loading fails, **Then** a localized error state offers a working retry action.
5. **Given** loading completes or fails, **When** the state changes, **Then** assistive technologies are notified through an appropriate live region.
6. **Given** a retry, **When** the retry succeeds, **Then** the application recovers to a usable state rather than remaining in a loop.

---

### User Story 6 - Set up, validate, and contribute to the project (Priority: P2)

As a developer, I can clone the repository, follow documented setup, run the canonical quality commands, and rely on Git hooks and CI to block regressions.

**Why this priority**: Consistent tooling and quality gates enable safe incremental development.

**Independent Test**: From a fresh clone, follow the README, run all canonical scripts, trigger a pre-commit and pre-push violation, and verify CI behavior.

**Acceptance Scenarios**:

1. **Given** a fresh clone and a supported Node.js version, **When** the developer follows the documented setup, **Then** dependencies install reproducibly and the development server starts.
2. **Given** the documented scripts, **When** the developer runs `lint`, `typecheck`, `test`, and `build`, **Then** all commands succeed from a clean install.
3. **Given** a staged formatting or lint violation, **When** the developer commits, **Then** the pre-commit hook blocks the commit with an actionable message.
4. **Given** a type, test, or build failure, **When** the developer pushes, **Then** the pre-push hook blocks the push.
5. **Given** a pull request, **When** CI runs, **Then** it executes the same canonical commands from a clean install and the pull request cannot merge while checks fail.
6. **Given** invalid environment configuration, **When** the application starts, **Then** it fails fast with a clear, non-sensitive message; with no required variables, it starts normally.

---

### Edge Cases

- **Bootstrap failure**: If the root element is missing, configuration is invalid, or initialization fails, the application MUST fail with a clear, safe message and MUST NOT render a blank screen or expose secrets, stack traces, or raw configuration values.
- **JavaScript disabled**: The page MUST show an accessible `<noscript>` message explaining that Walday requires JavaScript; it MUST NOT pretend the application is functional.
- **Direct deep links and refreshes**: Every declared route MUST work when loaded directly; production hosting rewrite behavior MUST be documented as a deployment requirement.
- **Unknown nested routes**: Unknown paths, including nested and trailing segments, MUST resolve to the not-found state without redirect loops.
- **History navigation**: Back and forward navigation MUST restore the correct route, title, and focus state.
- **Slow or failed code chunks**: A slow route chunk MUST show a layout-stable loading state; a failed chunk MUST show a retryable error state.
- **Unhandled asynchronous errors**: Error boundaries do not catch event-handler or promise failures; the foundation MUST define a safe, non-silent convention for these failures.
- **Missing translations**: Missing keys MUST fall back to English and MUST NOT render raw keys, blank labels, or runtime errors.
- **Unsupported language values**: Invalid or unsupported language values MUST fall back to English without breaking the current route.
- **Storage unavailable or corrupt**: If language preference persistence is introduced, unavailable, cleared, or malformed storage MUST fall back to defaults and MUST NOT block startup.
- **Long localized text**: Spanish labels and larger text MUST wrap, truncate only non-essential content, and MUST NOT cause horizontal scrolling or clipped controls.
- **Zoom and text resizing**: The shell MUST remain usable at 200% text resizing and 400% zoom.
- **Reduced motion**: Motion MUST be minimal and MUST respect `prefers-reduced-motion`; loading skeletons MUST NOT rely on motion to convey meaning.
- **Touch and hover**: Essential interactions MUST NOT depend on hover and MUST meet the minimum target size.
- **Font or third-party asset failure**: The application MUST fall back to a readable system font and MUST NOT depend on a render-blocking third-party resource.
- **Empty and error states**: An empty state MUST provide a primary action only when the user can act; an error state MUST offer retry only when retry is meaningful.
- **Hook or CI failure**: Failures MUST be actionable and documented; bypassing hooks or CI MUST be treated as exceptional.
- **Node or lockfile mismatch**: A mismatched Node.js version, missing lockfile, or non-reproducible install MUST be detected and documented rather than silently producing inconsistent results.

## 3. Requirements

### 3.1 Application Setup and Lifecycle

- **FR-001**: The system MUST provide a runnable single-page frontend application with a single root mount, a documented development server, a production build, and a preview command.
  - The entry point MUST compose global styles, internationalization, configuration, and application providers in a deterministic order before rendering the application.
  - Mounting and unmounting MUST not leave duplicate global listeners, timers, or subscriptions.
  - The production build MUST behave like the development build except for development-only tooling.

- **FR-002**: Startup MUST validate required configuration and initialize the approved internationalization mechanism before the first application render.
  - Invalid or missing required configuration MUST stop startup with a clear, non-sensitive message.
  - With no required configuration values, the application MUST start normally using documented defaults.
  - Bootstrap failures MUST NOT expose secrets, stack traces, raw environment values, or translation keys.

- **FR-003**: When JavaScript is unavailable, the application MUST render an accessible fallback message explaining that JavaScript is required; the fallback MUST NOT be presented as a working application.

### 3.2 Shell, Layout, Navigation, and Routing

- **FR-004**: The system MUST provide a semantic application shell with:
  - A banner/header region containing the Walday identity and primary navigation.
  - A navigation landmark with an accessible name.
  - A main landmark that is the target of the skip link.
  - A consistent page container and spacing system across routes.
  - One primary `h1` per page and a logical heading hierarchy.
  - Placeholder pages that clearly do not represent implemented business features.

- **FR-005**: The layout MUST be mobile-first and responsive.
  - It MUST be verified at 360, 768, 1024, and 1440 pixel widths.
  - It MUST NOT introduce horizontal scrolling, clipped controls, or overlapping content at supported widths.
  - It MUST reflow at 400% zoom and remain usable at 200% text resizing.
  - No essential navigation, content, or action may be removed solely because the viewport is narrow.
  - Touch targets MUST be at least 24 by 24 CSS pixels, with 44 by 44 CSS pixels recommended.

- **FR-006**: Global navigation MUST expose every foundation route that is intended for user navigation.
  - The current route MUST be indicated visually and programmatically, for example through `aria-current`.
  - Navigation MUST be keyboard operable and MUST NOT depend on hover.
  - At narrow widths, the responsive pattern is deferred to planning, but every destination MUST remain reachable and operable.

- **FR-007**: The system MUST provide a declarative routing foundation.
  - It MUST include a home route, at least one secondary placeholder route to validate nested navigation, and a catch-all not-found route.
  - Client-side navigation MUST update the URL and content without a full page reload.
  - Direct URL loads, refreshes, and browser back/forward MUST resolve the correct route.
  - Each route MUST define or derive a unique document title and a clear page heading.
  - Route changes MUST move focus to the new page heading or main region and announce the change to assistive technologies.
  - Route definitions MUST be extensible by later feature specifications without rewriting the shell.

- **FR-008**: Unknown routes MUST render a localized, accessible not-found state.
  - It MUST include a working link to the home route.
  - It MUST set a meaningful document title and heading.
  - It MUST NOT redirect in a loop or expose internal route details.
  - It MUST handle unknown nested paths and trailing segments consistently.

- **FR-009**: The routing and shell architecture MUST allow later features to add pages without weakening FSD boundaries or duplicating layout logic.

### 3.3 Design System Foundation

- **FR-010**: The system MUST define design tokens as a single source of truth using the approved Tailwind v4 theme mechanism.
  - The semantic palette MUST include at least `primary`, `surface`, `muted`, `border`, `danger`, `success`, `warning`, and `focus`.
  - Typography MUST define an explicit hierarchy for display, title, body, and caption.
  - Spacing, radius, shadow, and density scales MUST be defined consistently.
  - The default theme MUST be light.
  - The visual direction MUST feel calm, friendly, minimalist, modern, clear, and practical.
  - Unnecessary visual complexity, excessive animation, and distracting interface elements MUST be avoided.
  - The interface MUST prioritize readability, clear information hierarchy, and predictable interactions.
  - Dark theme is out of scope, but the token structure MUST NOT prevent a future theme.

- **FR-011**: Components MUST consume semantic tokens rather than raw visual values.
  - Components MUST NOT contain raw hexadecimal colors.
  - Arbitrary values are permitted only when the design system has no suitable token.
  - Text and interface color combinations MUST meet WCAG 2.2 AA contrast: at least 4.5:1 for normal text and 3:1 for large text and interface components.
  - Focus styling MUST use the shared focus token and MUST be consistent across interactive elements.
  - Token changes MUST propagate without editing individual components.

- **FR-012**: The system MUST provide only the reusable UI primitives required by the initial shell, such as button, link, layout container, and skeleton.
  - Primitives MUST have explicitly typed props and predictable behavior.
  - Primitives MUST support accessible names, visible focus, disabled states where relevant, and minimum target sizes.
  - Presentational primitives MUST NOT fetch data, contain business rules, or import feature internals.
  - A comprehensive component library or full design system implementation is out of scope.

### 3.4 Error Handling and Async UX States

- **FR-013**: The application MUST provide an application-level error boundary for unhandled rendering errors.
  - The fallback MUST be localized and MUST explain the failure in user-facing terms.
  - It MUST provide recovery actions such as retry, reload, or return home.
  - Focus MUST move to the fallback heading and the failure MUST be announced to assistive technologies.
  - It MUST NOT expose stack traces, internal identifiers, or sensitive data.
  - Error logging MUST be safe and MUST NOT contain secrets or personal data.

- **FR-014**: Route-level and feature-level failures MUST be isolated and recoverable.
  - Route-level errors MUST render within the shell where practical and MUST offer a meaningful recovery action.
  - Feature-level asynchronous or event-handler errors MUST be handled within their scope and MUST NOT crash unrelated areas.
  - The foundation MUST define a safe, non-silent convention for unhandled promise rejections and global errors.
  - A single failure MUST NOT automatically become an application-wide failure when containment is possible.

- **FR-015**: Loading UX MUST follow a consistent skeleton convention.
  - Skeletons MUST match the final layout closely enough to avoid avoidable layout shift.
  - A spinner, loose text such as "Loading…", or a layout-shifting placeholder MUST NOT be used as the only loading treatment.
  - Loading regions MUST expose `aria-busy`; skeletons that carry no information MUST be hidden from assistive technologies.
  - Completion and failure MUST be announced through an appropriate live region.
  - Motion MUST be minimal and MUST respect `prefers-reduced-motion`.
  - Lazily loaded routes MUST provide a layout-stable fallback and a retryable error state when the chunk fails.

- **FR-016**: The foundation MUST define and demonstrate the empty, error, and success conventions required by the constitution.
  - An empty state MUST explain why no content is shown and MUST provide a primary action when the user can act.
  - An error state MUST use a localized message and MUST offer retry when retry is meaningful.
  - A successful mutation MUST provide visible success feedback when it changes user-visible data.
  - The conventions and reusable primitives MUST be tested even though this feature does not introduce business asynchronous surfaces.

### 3.5 Accessibility

- **FR-017**: The foundation MUST meet the semantic and keyboard requirements of WCAG 2.2 AA.
  - Use semantic HTML landmarks, native controls, and a logical heading hierarchy.
  - Provide a skip link before repeated navigation.
  - Every interactive element MUST have a meaningful accessible name and a visible `focus-visible` indicator.
  - Focus order MUST be logical and keyboard traps MUST NOT exist.
  - Use ARIA only when native HTML semantics are insufficient.
  - Dialog, menu, and overlay focus management requirements MUST be documented for future components, including returning focus to the invoking element.
  - The document `lang` attribute MUST reflect the active locale.

- **FR-018**: Visual and perceptual accessibility MUST be preserved.
  - Information MUST NOT be conveyed by color, icon, or visual position alone.
  - Contrast MUST meet WCAG 2.2 AA.
  - Touch targets MUST meet the minimum target size.
  - The interface MUST support browser zoom and text resizing without loss of content or functionality.
  - Motion MUST be minimal and MUST respect `prefers-reduced-motion`.
  - Essential interactions MUST NOT depend exclusively on hover.

- **FR-019**: Accessibility MUST be verified, not assumed.
  - Automated accessibility checks MUST run in component and integration tests for the shell, navigation, not-found, error, and loading states.
  - Manual keyboard verification MUST cover the critical foundation journey.
  - A manual screen-reader check MUST cover the shell, navigation, route changes, and error recovery using VoiceOver with Safari on macOS and iOS as the required baseline.
  - Broader screen-reader and browser combinations remain part of the deferred browser-support matrix.
  - Automated tools used for verification MUST be development and CI tooling, not runtime dependencies.
  - Accessibility violations affecting critical journeys MUST be treated as defects.

### 3.6 Internationalization and Localization

- **FR-020**: The system MUST initialize the approved i18n stack with English and Spanish foundation resources.
  - English is the canonical source language and the fallback language.
  - Spanish is required for all foundation interface text.
  - When no explicit stored language preference exists, the application MUST start in English; implicit browser-language detection MUST NOT override the English default, and explicit language persistence belongs to the user-preferences feature.
  - Missing translations MUST fall back to English without rendering raw keys or blank interface text.
  - Translation resources MUST be organized by shared or feature area and load efficiently.

- **FR-021**: All user-facing text MUST be externalized from components.
  - This includes navigation and shell labels, page titles, not-found content, error and loading messages, empty and success messages, aria labels, and screen-reader descriptions.
  - Hardcoded user-facing interface text inside components is prohibited.
  - Translation keys MUST be descriptive and consistently organized.
  - Pluralization and interpolation MUST use the i18n library's mechanisms, not ad hoc string concatenation.

- **FR-022**: Locale behavior MUST be correct and reversible.
  - The application MUST be able to change between English and Spanish through the language-change mechanism without a full application reload and without losing the current route.
  - The document language and document title MUST update with the active locale.
  - Dates, times, numbers, and units MUST use locale-aware formatting when introduced; components MUST NOT hardcode locale-specific formats.
  - Timezone and weather-unit preferences MUST remain independent from the interface language in the future.
  - The foundation MUST expose a stable language-change mechanism; the visible language selector, preference persistence, and preferences UI belong to the user-preferences feature.
  - Unsupported language values MUST fall back to English and MUST NOT break the current route.

### 3.7 Architecture and Type Safety

- **FR-023**: The frontend MUST follow Feature-Sliced Design.
  - The canonical layers are `app`, `pages`, `widgets`, `features`, `entities`, and `shared`.
  - Imports MUST flow downward only.
  - Slices at the same layer MUST NOT import each other's internals; they MUST use public `index.ts` APIs.
  - Relative import chains that climb directories MUST NOT be used; configured path aliases MUST be used.
  - `shared` MUST NOT contain business rules; data-fetching hooks belong in `entities` or `features`.
  - `app` owns providers, routing, global configuration, and application composition.
  - Unused layers MUST NOT be created solely to satisfy the pattern.
  - Circular dependencies and uncontrolled cross-feature imports MUST NOT exist.
  - Tests MUST be colocated with their subject or mirrored in a test location without breaking layer boundaries.

- **FR-024**: TypeScript MUST be configured with all constitutional strictness settings.
  - `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` MUST be enabled in every TypeScript project, including tooling configurations.
  - Explicit or implicit `any` is prohibited.
  - Type assertions and non-null assertions are permitted only at validated boundaries with written justification.
  - `@ts-ignore` and `@ts-expect-error` require adjacent justification and MUST NOT silence compiler errors.
  - External data MUST be validated with Zod at the boundary where it enters the application; contract types SHOULD be derived from Zod schemas.
  - `typecheck` MUST fail on any violation.

- **FR-025**: The application root MUST establish the approved server-state mechanism.
  - A single TanStack Query client and provider MUST be configured at the application root.
  - Deliberate defaults and a query-key factory convention MUST be documented for future resources.
  - No business queries or mutations are introduced by this feature.
  - Components MUST NOT use `useEffect` or manual `fetch` for server data, and parallel server-state stores are prohibited.
  - Query cache data MUST NOT be persisted to storage in this feature.

- **FR-026**: The foundation MUST remain simple and free of speculative abstractions.
  - Abstractions MUST be justified by a current requirement, not an imagined future one.
  - Meaningful thresholds, limits, defaults, and shared values MUST be named constants rather than scattered magic values.
  - New runtime dependencies MUST be justified in writing with need, alternatives, bundle and performance impact, license, security posture, and constitutional fit.
  - Dependency updates MUST be reviewed; deprecated or unmaintained packages MUST NOT be introduced.
  - Major version changes, replacements, or removals MUST require a constitutional amendment.
  - Only technologies in the approved stack may be introduced.

### 3.8 Configuration and Backend Boundary

- **FR-027**: Environment configuration MUST be typed, centralized, and validated.
  - Direct access to `import.meta.env` or `process.env` MUST be centralized in the configuration module.
  - The configuration module MUST validate values with Zod at startup.
  - Required and optional variables MUST be distinguished.
  - No mandatory variable may be introduced unless genuinely required by the initial application.
  - With no required variables, startup MUST succeed using documented defaults.
  - Invalid configuration MUST fail fast with a clear, non-sensitive message.
  - Configuration validation MUST be covered by tests.

- **FR-028**: Environment documentation and secret handling MUST be explicit.
  - A `.env.example` MUST document every available variable, including purpose, required/optional status, and safe defaults. When no variables are required, it MUST say so explicitly.
  - Only public, non-sensitive values may be exposed through `VITE_*` variables.
  - Secrets MUST never be shipped to the client or committed to the repository.
  - Environment files containing secrets MUST be ignored by version control, with only the example file committed.
  - `import.meta.env` access outside the configuration module MUST be prohibited.

- **FR-029**: The foundation MUST define a clean boundary for future backend integration without implementing one.
  - This feature MUST NOT add a backend, API client, authentication layer, network calls, database, or persistence schema.
  - A future backend base URL MUST be introduced through validated configuration rather than hardcoded values.
  - Future API errors MUST use stable machine-readable codes that the frontend translates into localized messages.
  - Future API contracts SHOULD be Zod-first and shared or synchronized with contract tests where duplication is unavoidable.
  - Frontend and backend MUST remain independently deployable.

### 3.9 Testing and Quality Tooling

- **FR-030**: The system MUST provide a frontend development and testing environment using the approved stack.
  - Vitest, React Testing Library, and jest-dom MUST be configured with a browser-like test environment.
  - The test setup MUST provide cleanup, deterministic time and timers, controlled timezone and locale, and mocks for unavailable browser APIs.
  - Tests MUST follow Arrange-Act-Assert, assert observable behavior, and avoid snapshot-only assertions as evidence of correctness.
  - Tests MUST cover the shell, navigation, route changes, not-found, error boundary, loading skeleton, empty/error/success conventions, English and Spanish resources, configuration validation, and critical accessibility behavior.
  - Unit tests MUST NOT perform real network calls; external services and network dependencies MUST be mocked.
  - Keyboard interaction and accessible roles MUST be tested for the critical foundation journey.
  - Loading, success, empty, error, and relevant boundary states MUST be tested.

- **FR-031**: Coverage MUST be configured and enforced according to the constitution.
  - The global minimum is 80%, with approximately 90% for critical business logic and high-risk functionality.
  - Exclusions for non-executable bootstrap, configuration, and tooling files MUST be documented and justified.
  - Coverage MUST NOT be increased with artificial tests, and coverage MUST NOT be treated as proof of quality.

- **FR-032**: Code quality and formatting MUST be enforced with shared tooling.
  - Approved linting and formatting tools MUST be configured for the frontend.
  - Rules MUST align with the constitution, including prohibitions on `any`, unsafe type escapes, hook misuse, and prohibited import patterns where enforceable.
  - Formatting verification MUST be available and MUST pass with zero errors.
  - Conflicting or duplicate tooling MUST NOT be introduced.
  - Tooling MUST be development-only and MUST NOT become a runtime dependency.

- **FR-033**: Every application MUST expose the canonical script contract.
  - `lint`, `typecheck`, `test`, and `build` MUST be runnable from the application directory using the repository's documented package manager.
  - `build` MUST fail when type checking fails.
  - Git hooks and CI MUST invoke these same scripts rather than duplicating their logic.
  - The Node.js version MUST be pinned in the repository.
  - Lockfiles MUST be committed, and CI MUST install reproducibly from them.

### 3.10 Git Workflow, CI, and Documentation

- **FR-034**: Git hooks MUST support the pre-commit and pre-push strategy.
  - Pre-commit SHOULD run fast checks such as formatting and linting of staged files.
  - Pre-push SHOULD run type checking, tests, and production build validation.
  - Hooks MUST be installable through documented setup and MUST fail with actionable messages.
  - Hook execution MUST remain reasonably fast and MUST NOT duplicate expensive validations unnecessarily.
  - Bypassing hooks MUST be treated as an exceptional, justified action.
  - Local hooks MUST NOT replace CI validation.

- **FR-035**: CI MUST independently enforce the critical quality gates.
  - CI MUST run `lint`, `typecheck`, `test`, and `build` from a clean install using the committed lockfile and pinned Node.js version.
  - CI MUST run on pull requests and MUST be mandatory before merge.
  - CI MUST NOT rely on local Git hooks and MUST NOT require secrets for the foundation checks.
  - Automated accessibility checks that run as part of the test suite MUST execute in CI.
  - Expensive checks MUST NOT be duplicated across stages without a clear reason.

- **FR-036**: The repository MUST use a documented Git and review workflow.
  - Changes MUST integrate through pull requests, not direct pushes to the protected default branch.
  - Pull requests MUST pass required CI checks before merge.
  - Review MUST verify constitutional compliance, not only functional correctness.
  - Bypassing hooks or CI MUST be justified and reviewed.
  - Secrets MUST NOT be committed to the repository or its history.

- **FR-037**: Documentation MUST make the foundation operable by a new contributor.
  - The README MUST cover setup, prerequisites, scripts, environment variables, hook installation and troubleshooting, testing, supported viewports, route map, architecture boundaries, and localization.
  - Documentation MUST explain how to add a route, a shared primitive, and a translation key without violating FSD.
  - Durable architectural decisions and constitutional exceptions MUST be recorded as ADRs.
  - Technical documentation and developer-facing artifacts MUST remain in English.
  - Documentation MUST be updated when architecture, configuration, contracts, or workflows change.

### 3.11 Performance and Security Baseline

- **FR-038**: The initial foundation MUST follow a performance baseline.
  - Non-initial routes SHOULD be code-split where it meaningfully improves initial load.
  - The initial route MUST NOT load unnecessary business code or third-party runtime dependencies.
  - Font loading MUST use a strategy with a readable system fallback and MUST NOT block first render on a third-party font.
  - New dependencies MUST be reviewed for bundle and runtime impact.
  - A baseline bundle size and initial-load performance measurement MUST be recorded when the foundation is complete.
  - Performance work MUST be based on measured bottlenecks or reasonable architectural evidence, not premature optimization.

- **FR-039**: The foundation MUST establish a security baseline.
  - Secrets, credentials, and sensitive configuration MUST NOT be committed, logged, or shipped to the client.
  - Authentication tokens MUST NOT be stored in `localStorage`; authentication is out of scope for this feature.
  - `dangerouslySetInnerHTML` is prohibited unless content is sanitized through a justified, reviewed mechanism.
  - External links MUST use safe referrer and opener behavior where applicable.
  - Error messages, logs, and client-visible state MUST NOT expose internal identifiers, stack traces, or personal data.
  - Deployment-specific CSP and security headers MUST be addressed when hosting is configured; this feature MUST NOT introduce patterns that prevent them.

### 3.12 Validation Rules

- **VR-001 — Type safety**: `typecheck` passes with every constitutional strict flag; zero `any`, unjustified assertions, or unjustified suppressions.
- **VR-002 — Lint and formatting**: Zero lint and formatting errors; enforced import-boundary and hook rules pass.
- **VR-003 — Script contract**: `lint`, `typecheck`, `test`, and `build` succeed from a clean install; `build` fails if type checking fails.
- **VR-004 — Configuration**: Missing or invalid required configuration blocks startup with a safe message; with no required variables, startup succeeds; no raw environment access outside the configuration module.
- **VR-005 — Routing**: Every declared route resolves on direct load; unknown paths render not-found; back/forward works; no redirect loops; each route has a title and heading.
- **VR-006 — Localization**: Every foundation key exists in English and Spanish or has verified English fallback; no raw keys or blank text; document language matches the active locale; the language-change mechanism works without reload.
- **VR-007 — Responsive behavior**: 360, 768, 1024, and 1440 pixel widths show no horizontal scrolling, clipping, overlap, or lost navigation; 200% text resizing and 400% zoom preserve content and function.
- **VR-008 — Accessibility**: Zero critical or serious automated violations on shell, navigation, not-found, error, and loading states; keyboard-only and VoiceOver-with-Safari critical journeys pass; visible focus, skip link, landmarks, headings, and AA contrast are verified.
- **VR-009 — Design tokens**: Required semantic tokens exist in the single source of truth; shell components use tokens; no raw hex colors; arbitrary values are justified.
- **VR-010 — FSD boundaries**: No upward imports, cross-slice internal imports, directory-climbing relative imports, or circular dependencies; public APIs are used.
- **VR-011 — Async UX states**: Loading, empty, error, and success conventions exist where applicable; skeletons match layout; retries are meaningful; announcements and `aria-busy` are present.
- **VR-012 — Testing quality**: Coverage thresholds are met or exclusions are documented; tests assert behavior; loading, success, empty, error, and boundary states are covered.
- **VR-013 — Quality gates**: Hooks and CI use canonical scripts; hooks block violations; CI passes from a clean install and is required for merge.
- **VR-014 — Performance and security**: Baseline bundle and initial-load measurements are recorded; no render-blocking third-party startup assets; no secrets, unsafe HTML, or sensitive tokens in client storage or logs.

### 3.13 Key Entities

- **Design Token**: A named, reusable value for color, typography, spacing, radius, shadow, or density. It has a semantic role, a single source of truth, light-theme defaults, and a contrast obligation where used for text or interface elements.
- **Route Definition**: A navigable application entry with a path, page element, document title, navigation visibility, and associated loading and error handling. Paths are unique; a default route and a catch-all not-found route exist.
- **Application Shell Region**: A semantic layout region such as banner, navigation, or main. It owns structure and responsive behavior, not business data, and provides the skip-link target and consistent page container.
- **UI Primitive**: A reusable, accessible component required by the shell, such as button, link, container, or skeleton. It has explicitly typed props, predictable states, visible focus, adequate target size, and no business logic.
- **Translation Resource**: A locale-specific set of user-facing strings organized by shared or feature area. English is canonical; Spanish is required; missing keys fall back to English; keys cover labels, errors, empty states, titles, and accessibility text.
- **Environment Configuration Value**: A named, typed, validated value with a required/optional status, public/secret classification, safe default where applicable, and documentation in the example environment file.

## 4. Success Criteria

### 4.1 Measurable Outcomes

- **SC-001**: A new developer can complete setup and start the development server in under 10 minutes using only the README and `.env.example`, without maintainer assistance.
- **SC-002**: From a clean checkout, `lint`, `typecheck`, `test`, and `build` pass locally and in CI; CI is required for merge and is green before the foundation is considered complete.
- **SC-003**: A visitor can reach every foundation route through navigation, direct URL, and browser history without a full page reload; unknown routes render a localized not-found page with a working home link.
- **SC-004**: The shell is usable at 360, 768, 1024, and 1440 pixel widths with no horizontal scrolling, clipping, or lost navigation; 200% text resizing and 400% zoom preserve content and function.
- **SC-005**: Automated checks report zero critical or serious WCAG 2.2 AA violations for the shell, navigation, not-found, error, and loading states; keyboard-only and VoiceOver-with-Safari critical journeys are manually verified.
- **SC-006**: All user-facing strings are available in English and Spanish; applying a language change updates the interface, document language, and title without reload; no raw keys or blank text appear.
- **SC-007**: A forced rendering error shows a localized fallback without stack traces, moves focus and announces the failure, and offers recovery; slow loading shows a layout-matching skeleton with no avoidable layout shift; a failed route chunk offers retry.
- **SC-008**: Required semantic tokens exist in the single source of truth and meet AA contrast where used; shell components contain no raw hex colors or unjustified arbitrary values.
- **SC-009**: FSD checks or reviews find no upward imports, cross-slice internal imports, directory-climbing relative imports, or circular dependencies.
- **SC-010**: Coverage meets the configured thresholds or documented exclusions; tests cover the shell, routing, not-found, error and loading states, English and Spanish resources, configuration validation, and critical accessibility behavior.
- **SC-011**: Pre-commit blocks staged formatting and lint violations; pre-push blocks type, test, and build failures; both are reproducible from a fresh clone and documented.
- **SC-012**: Baseline bundle and initial-load performance are recorded; no new runtime dependency lacks written justification; no secrets or sensitive data appear in the client bundle or logs.
- **SC-013**: A new contributor can add a route, a shared primitive, and a translation key by following the documentation without violating FSD boundaries or bypassing quality gates.

## 5. Assumptions and Dependencies

- The approved technology stack in the constitution is mandatory: React 19, TypeScript 5, Vite, Tailwind CSS 4 with the `@theme` token source, React Router 7, TanStack Query, Zod, i18next, react-i18next, Vitest, React Testing Library, and jest-dom.
- The repository uses a pinned Node.js LTS version and a committed lockfile; the documented package manager is used consistently in local development and CI.
- The application is a client-rendered single-page application. Server-side rendering, GraphQL, and microservices are not part of this feature.
- Modern evergreen browsers with ES2023 and native module support are the target; legacy browsers are out of scope. VoiceOver with Safari on macOS and iOS is the manual screen-reader baseline; broader combinations are deferred.
- JavaScript is required for application functionality; the no-JavaScript fallback is informational only.
- English and Spanish are the only initial locales; both are left-to-right. The architecture MUST allow additional languages without structural changes. With no explicit stored language preference, the application starts in English; implicit browser-language detection at startup is deferred, while an explicit stored preference may override the default.
- The default theme is light; dark theme is deferred.
- No backend, API, authentication, database, cloud synchronization, or server data is available in this feature.
- No local guest business data is persisted in this feature; language preference persistence and guest storage belong to later specifications.
- No PWA, offline caching, analytics, monitoring, or deployment configuration is included.
- A system font fallback is acceptable; a third-party font is not required.
- Detailed visual values, mobile navigation patterns, route sets beyond the required minimum, code-splitting boundaries, tooling mechanics, and hosting configuration are deferred to planning.

## 6. Constitution Alignment

| Principle | Applicability | How this specification addresses it |
|---|---|---|
| **I. Clean Code, SOLID, and Simplicity** | Applies | Limits scope to shell primitives, requires justified abstractions, and prohibits speculative future infrastructure. |
| **II. Strict TypeScript and Type Safety** | Applies | FR-024 requires all strict flags, no `any`, justified escapes, and Zod validation at boundaries. |
| **III. Frontend Architecture: Feature-Sliced Design** | Applies | FR-023 defines layers, downward imports, public APIs, aliases, and boundary-aware tests. |
| **IV. Backend Architecture and Modular Design** | Not applicable | No backend is implemented; FR-029 records the future boundary and deferral. |
| **V. React Component Design and Reusability** | Applies | FR-012 requires small, typed, presentational primitives without business logic or data fetching. |
| **VI. Styling, Design Tokens, and Visual Consistency** | Applies | FR-010, FR-011, FR-015, and FR-016 define tokens, contrast, light theme, responsive layout, and mandatory async states. |
| **VII. Testing Strategy and Quality Assurance** | Applies | FR-030 and FR-031 define the approved test stack, behavior-focused tests, deterministic tests, state coverage, and coverage thresholds. |
| **VIII. Performance and Resource Efficiency** | Applies | FR-038 requires code-splitting where appropriate, minimal startup resources, font fallback, and a recorded baseline. |
| **IX. Scalability, Resilience, and Fault Isolation** | Applies | FR-013, FR-014, and FR-016 require scoped failures, recovery actions, localized states, and non-silent handling. |
| **X. API Contracts and Independent Deployment** | Partially applicable | No API exists; FR-029 preserves independent deployability and future Zod-first contracts and stable error codes. |
| **XI. Constants, Hardcoded Values, and Configuration Management** | Applies | FR-026 and FR-027 require named values, centralized typed configuration, Zod validation, and fail-fast behavior. |
| **XII. Security and Data Protection** | Applies | FR-028 and FR-039 prohibit secrets, client-side secret exposure, unsafe HTML, and sensitive data in logs or storage. |
| **XIII. Accessibility and Inclusive Design** | Applies | FR-017, FR-018, and FR-019 define WCAG 2.2 AA semantics, keyboard behavior, focus, contrast, targets, zoom, motion, and verification. |
| **XIV. Internationalization and Localization** | Applies | FR-020, FR-021, and FR-022 define English and Spanish resources, fallback, externalized text, the runtime language-change mechanism, and document language. |
| **XV. Documentation and Technical Communication** | Applies | FR-037 requires setup, configuration, architecture, testing, workflow documentation, and ADRs. |
| **XVI. Automated Quality Gates and Git Hooks** | Applies | FR-032, FR-033, FR-034, FR-035, and FR-036 define the script contract, hooks, CI, and review workflow. |
| **XVII. Frontend Server State and Async UX** | Applies | FR-025 configures a single TanStack Query client and prohibits business queries, manual fetching, and parallel server-state stores. |
| **XVIII. Data Integrity and Persistence with Prisma** | Not applicable | No database or persistence is implemented; future guest storage and backend persistence MUST comply when introduced. |
| **XIX. External Integrations and Weather Resilience** | Not applicable | Weather integration is explicitly out of scope; no provider calls or caching are introduced. |
| **XX. Technology Stack Governance and Dependency Discipline** | Applies | FR-026 and FR-038 require approved-stack compliance, dependency justification, pinned Node.js, committed lockfiles, and bundle review. |

**Conflicts and clarifications**: No requirement in this specification intentionally contradicts the product overview or the constitution. Decisions that require product or architectural analysis are listed in Section 1.4 and remain deferred.

## 7. Foundation Readiness Gate

The first business feature MUST NOT begin until all of the following conditions are satisfied:

1. Every functional requirement in this specification is implemented and every validation rule in Section 3.12 passes.
2. `lint`, `typecheck`, `test`, and `build` pass from a clean install locally and in CI; the default branch is protected and CI is required for merge.
3. Strict TypeScript settings are enabled in every project, with no `any`, unjustified assertions, or unjustified suppressions.
4. The shell, navigation, not-found, error, and loading states pass automated accessibility checks and the manual keyboard and VoiceOver-with-Safari critical journeys.
5. Responsive behavior is verified at 360, 768, 1024, and 1440 pixel widths, including 200% text resizing and 400% zoom.
6. English and Spanish resources are complete for all user-facing text, no user-facing text is hardcoded, the application starts in English when no explicit stored language preference exists, and applying a language change updates the interface, document language, and title without reload.
7. Required semantic design tokens exist in the single source of truth, meet AA contrast, and are used by shell components without raw hex values.
8. Error, loading, empty, and success conventions are documented and demonstrated through reusable primitives and tests.
9. FSD layers, public APIs, path aliases, and import boundaries are in place and verified; no circular dependencies exist.
10. Environment configuration is typed and validated; `.env.example` is complete; no secrets or sensitive values are exposed to the client.
11. Git hooks are installable and functional; pre-commit and pre-push execute the documented checks; bypassing them is documented as exceptional.
12. Documentation is complete for setup, scripts, configuration, hooks, architecture, testing, viewports, routes, and extension points; durable decisions are recorded as ADRs.
13. The foundation-related entries in the constitution's known-gaps register are closed: TanStack Query is configured with a single client and query-key factory, strict TypeScript flags are enabled, the loading primitive is a layout-matching skeleton, tokens have one source of truth, environment configuration is validated before render, and Git hooks are runnable.
14. No business feature, authentication flow, backend implementation, weather integration, or database schema has been introduced.
15. Remaining deferred decisions are recorded and do not block the first business feature.
