# Walday Constitution

## Core Principles

### I. Clean Code, SOLID, and Simplicity (NON-NEGOTIABLE)

The codebase MUST prioritize readability, maintainability, and clarity.

- Follow Clean Code principles and apply SOLID where appropriate.
- Write self-documenting code with meaningful names for variables, functions, components, classes, and modules.
- Prefer simple and explicit solutions over unnecessary abstractions.
- Keep functions and components focused on a single responsibility.
- Avoid duplicated logic and unnecessary coupling.
- Avoid premature optimization and overengineering.
- Use abstractions when they provide clear benefits, not merely to follow a pattern.
- Keep business logic separate from presentation and infrastructure concerns.
- Avoid excessively large files, components, functions, and modules.
- Comments explain complex decisions or non-obvious behavior, not what code already expresses.

SOLID and design patterns applied pragmatically rather than mechanically.

### II. Strict TypeScript and Type Safety (NON-NEGOTIABLE)

TypeScript MUST be used throughout frontend and backend.

- Enable and maintain strict TypeScript compiler settings.
- The use of `any` is strictly prohibited.
- Use `unknown` when genuinely unknown and narrow safely before use.
- Use generics when they provide meaningful type reuse and stronger type safety.
- Prefer explicit domain types, interfaces, unions, and well-defined contracts.
- Avoid unnecessary type assertions and unsafe type casting.
- Avoid duplicating types when shareable through an appropriate contract or schema.
- Validate external data at runtime when it enters the application.
- Do not assume API responses, environment variables, or third-party data are valid simply because TypeScript types describe them.

Type safety preserved across application boundaries.

### III. Frontend Architecture: Feature-Sliced Design (NON-NEGOTIABLE)

The frontend MUST follow Feature-Sliced Design (FSD) principles.

- Organize the application around clearly defined architectural layers and business features.
- Respect responsibilities and dependency rules of each layer.
- Keep shared UI, entities, features, widgets, pages, and application-level configuration appropriately separated.
- Avoid circular dependencies and uncontrolled cross-feature imports.
- Keep business logic independent from UI rendering whenever practical.
- Expose public APIs for modules where appropriate.
- Avoid unnecessary layers or folders without clear architectural purpose.
- Ensure features remain cohesive and reasonably independent.

### IV. Backend Architecture and Modular Design (NON-NEGOTIABLE)

The backend MUST follow a modular, feature-oriented architecture inspired by ideal Node.js project structure practices (https://softwareontheroad.com/ideal-nodejs-project-structure/).

- Organize code around business modules or features.
- Separate HTTP concerns, controllers, application services, domain logic, data access, and infrastructure responsibilities.
- Controllers MUST remain thin and not contain complex business logic.
- Business rules MUST NOT be tightly coupled to Express or database implementations.
- Keep database access behind appropriate repositories or data-access abstractions when useful.
- Centralize request validation, error handling, and response conventions.
- Avoid circular dependencies and unnecessary coupling between modules.
- Keep modules cohesive and expose only necessary interfaces.

Do not reproduce frontend FSD layers in the backend.

### V. React Component Design and Reusability

React components MUST remain small, focused, and maintainable.

- Prefer small components with clear responsibilities.
- Avoid components combining extensive business logic, data fetching, state management, and complex presentation.
- Extract reusable or complex component logic into custom hooks when appropriate.
- Use Compound Components when they provide a meaningful API and improve composition.
- Avoid excessively large JSX structures and deeply nested conditional rendering.
- Keep state as close as possible to where it is needed.
- Avoid unnecessary global state.
- Prefer composition over unnecessarily complex component configurations.
- Use memoization only when there is a demonstrated or reasonably justified performance benefit.
- Avoid premature use of `React.memo`, `useMemo`, and `useCallback`.

Reusable components have clear APIs, predictable behavior, and appropriate tests.

### VI. Styling, Design Tokens, and Visual Consistency

- Use Tailwind CSS as the primary styling approach.
- Prefer design tokens for colors, typography, spacing, borders, shadows, and other recurring visual properties.
- Avoid duplicated styling values across unrelated components.
- Maintain consistent visual behavior throughout the application.
- Avoid inline styles unless strictly necessary.
- Avoid using `!important` unless there is a clear and justified technical reason.
- Do not introduce multiple styling approaches without architectural justification.
- Keep responsive behavior consistent across supported screen sizes.
- Ensure shared components follow the same visual and interaction conventions.

Visual implementation aligned with Walday's calm, friendly, minimalist design direction.

### VII. Testing Strategy and Quality Assurance (NON-NEGOTIABLE)

- Use Vitest and React Testing Library for frontend unit and component testing.
- Apply the Arrange-Act-Assert (AAA) pattern.
- Test observable behavior rather than implementation details.
- Prioritize meaningful tests for business rules, critical user journeys, and edge cases.
- Test loading, success, empty, error, and relevant boundary states.
- Mock external services and network dependencies appropriately.
- Avoid tests excessively coupled to internal component structure.
- Backend business logic, services, validation, and API behavior must also be tested.
- Use integration and end-to-end tests where they provide meaningful coverage of critical workflows.

Coverage: minimum 80% global; approximately 90% for critical business logic and high-risk functionality. Do not sacrifice test quality to increase coverage. Coverage is an indicator of completeness, not proof of quality.

### VIII. Performance and Resource Efficiency

- Avoid unnecessary rendering and expensive computations.
- Apply code splitting and lazy loading where appropriate.
- Separate third-party dependencies into appropriate bundles when beneficial.
- Avoid loading unnecessary resources during initial application startup.
- Use memoization only when justified.
- Use virtualization for large collections when rendering all elements would negatively affect performance.
- Optimize network requests and avoid unnecessary repeated requests.
- Use appropriate caching strategies.
- Enable HTTP compression for production responses where supported.
- Optimize assets and avoid unnecessarily large dependencies.
- Consider Core Web Vitals and use Lighthouse to identify relevant performance issues.
- Establish performance budgets when sufficient baseline information is available.

Performance improvements based on actual bottlenecks or reasonable architectural evidence.

### IX. Scalability, Resilience, and Fault Isolation

- Keep modules cohesive and loosely coupled.
- Avoid making unrelated features depend on a single external service.
- Handle failures from third-party APIs gracefully.
- Provide meaningful loading, empty, and error states.
- Ensure weather service failure does not prevent task or agenda functionality.
- Avoid uncontrolled propagation of errors between application modules.
- Use appropriate timeouts and error-handling strategies for external requests.
- Design interfaces and contracts that can evolve without unnecessary breaking changes.
- Keep the application functional when non-critical services are temporarily unavailable.

Scalability via sound modular design and clear boundaries, not premature microservices or distributed infrastructure.

### X. API Contracts and Independent Deployment (NON-NEGOTIABLE)

- Define clear request and response structures.
- Validate incoming backend data using runtime validation tools such as Zod.
- Maintain consistent error response conventions.
- Avoid exposing internal implementation details through API responses.
- Keep frontend and backend responsibilities clearly separated.
- Support independent frontend and backend deployment.
- Configure CORS explicitly for required application origins.
- Do not use unrestricted wildcard CORS policies in production when credentials are involved.
- Keep environment-specific origins and endpoints configurable.
- Apply appropriate HTTP caching headers.
- Avoid caching user-specific or sensitive responses in shared caches.
- Document API behavior and important contract decisions.

Backend errors provide stable, machine-readable error codes so the frontend can display localized messages.

### XI. Constants, Hardcoded Values, and Configuration Management

- Do not scatter magic numbers, unexplained string literals, or business constants throughout the codebase.
- Define named constants for meaningful business rules, thresholds, limits, default values, and shared application values.
- Centralize configuration that is shared or environment-dependent.
- Do not duplicate the same business or configuration value across unrelated modules.
- Do not hardcode API URLs, credentials, secrets, environment-specific endpoints, timeouts, or other deployment-specific settings.
- Retrieve sensitive values and environment-specific configuration through environment variables or an appropriate configuration provider.
- Validate required configuration during application startup.
- Use enums, literal unions, or typed structures when they improve consistency and type safety.
- Keep configuration responsibilities separate from business logic.

Practical exception: simple, self-explanatory values intrinsic to an operation may remain inline when extracting them would reduce readability or add unnecessary indirection. The objective is to eliminate magic values and duplicated rules, not to create a constant for every string or number.

### XII. Security and Data Protection (NON-NEGOTIABLE)

- Never commit secrets, credentials, private keys, or sensitive environment configuration.
- Validate and sanitize external input at appropriate boundaries.
- Apply appropriate authentication and authorization checks on protected backend resources.
- Never rely exclusively on frontend validation for security.
- Protect against common web vulnerabilities, including injection, XSS, and CSRF, where applicable.
- Use secure transport through HTTPS in production.
- Apply appropriate security headers.
- Avoid exposing sensitive information in logs, API responses, or error messages.
- Store and handle passwords and authentication credentials using established secure practices.
- Follow least-privilege principles.
- Protect user-specific data and ensure one user cannot access another user's information.
- Treat third-party API responses as untrusted external data.
- Review authentication, session, and token-management decisions during the appropriate planning stage.

### XIII. Accessibility and Inclusive Design (a11y) (NON-NEGOTIABLE)

Target: WCAG 2.2 Level AA. Accessibility considered during specification, design, implementation, and testing.

Semantic structure:

- Use semantic HTML elements appropriately; maintain logical heading hierarchy.
- Use native form controls and interactive elements whenever possible.
- Ensure buttons, links, inputs, and other controls have meaningful accessible names.
- Do not use semantic elements incorrectly to achieve visual effects.
- Use ARIA only when native HTML semantics are insufficient.

Keyboard accessibility:

- All essential functionality MUST be available through keyboard interaction.
- Maintain a visible and consistent focus indicator; logical focus order; prevent keyboard traps.
- Manage focus appropriately in dialogs, menus, forms, and other interactive components.
- Do not require precise pointer movement to complete essential tasks.

Screen reader support:

- Provide appropriate labels and descriptions.
- Associate form fields with their instructions and validation messages.
- Communicate dynamic changes, loading states, and important status updates.
- Ensure meaningful information is not communicated exclusively through icons, colors, or visual positioning.
- Use ARIA live regions appropriately; do not use ARIA as a replacement for correct semantic HTML.

Visual accessibility:

- Meet WCAG 2.2 AA contrast requirements.
- Do not use color as the only way to communicate status, priority, or errors.
- Support browser zoom and text resizing; maintain readable typography and sufficient spacing.
- Respect `prefers-reduced-motion`; ensure focus indicators clearly visible; avoid unnecessary animations.

Responsive and touch accessibility:

- Ensure accessible interaction on desktop and mobile devices.
- Provide sufficiently large and well-spaced touch targets per WCAG 2.2.
- Avoid interactions depending exclusively on hover.
- Preserve usability at different viewport sizes and zoom levels.

Forms and validation:

- Provide visible labels and clear instructions.
- Display validation errors meaningfully and accessibly; associate errors with fields.
- Communicate submission success and failure; preserve user input when practical after validation failures.

Accessibility testing:

- Include accessibility checks in component and integration testing.
- Use tools such as axe-core and Lighthouse where appropriate.
- Test keyboard navigation and focus management.
- Perform manual screen reader checks for critical user journeys.
- Automated tools MUST NOT be considered sufficient proof of accessibility compliance.

Accessibility violations affecting critical user journeys MUST be treated as defects.

Walday-specific:

- Weather information must not rely exclusively on icons or colors.
- Agenda entries and chronological relationships must be understandable to assistive technologies.
- Planning suggestions must communicate reasoning through text, not just visual indicators.
- Task completion and priority changes must be communicated accessibly.
- Dialogs and interactive menus must support appropriate focus management and keyboard operation.
- Language selection and document language must be exposed correctly to assistive technologies.

### XIV. Internationalization and Localization (i18n/l10n) (NON-NEGOTIABLE)

Initial supported languages: English (`en`), Spanish (`es`). Architecture must allow additional languages without structural changes.

Translation architecture:

- English is the canonical source language for translation keys and developer-facing technical artifacts.
- All user-facing interface text MUST be externalized from React components into structured translation resources.
- Avoid hardcoded user-facing text inside components.
- Use descriptive, consistent translation keys; organize logically by feature or shared interface area.
- Keep translation resources separate from business logic.
- Support fallback behavior when a translation is missing.
- Persist the user's language preference when appropriate.
- Allow users to switch languages without requiring a full application reload.
- Load translation resources efficiently, using lazy loading where appropriate.

Localized content must include navigation/interface labels, buttons/actions, form labels/validation messages, notifications/feedback, empty/loading/error states, planning suggestions, weather descriptions, and accessibility labels/screen reader descriptions.

Locale-aware formatting:

- Format dates, times, numbers, and currencies according to the selected locale.
- Respect relevant calendar and regional conventions.
- Keep timezone preferences independent from the selected interface language.
- Keep weather unit preferences independent from the selected interface language.
- Avoid assuming all users share the same date, time, or measurement conventions.
- Handle dynamic translation interpolation safely.

Backend localization:

- Backend APIs MUST return stable, machine-readable error codes rather than relying exclusively on hardcoded user-facing messages.
- The frontend should translate those codes into the selected language.
- Technical logs and developer-facing messages should remain consistent, preferably in English.
- If the backend generates user-facing messages, it must support an appropriate localization strategy.

Implementation guidance: evaluate `i18next` and `react-i18next`. Do not introduce unnecessary localization complexity for the MVP, but ensure the initial architecture does not make multilingual support difficult. Runtime language respects saved preference or browser locale, with English as fallback.

### XV. Documentation and Technical Communication

- Document important architectural decisions and their rationale.
- Keep project documentation aligned with the actual implementation.
- Document setup instructions, environment variables, and development workflows.
- Maintain clear API documentation where appropriate.
- Document non-obvious business rules and important edge cases.
- Prefer concise, useful documentation over excessive or duplicated descriptions.
- Keep technical documentation, code comments, naming conventions, and development artifacts in English.
- Ensure documentation changes accompany significant architectural or behavioral changes.

Use Architecture Decision Records (ADRs) when a decision has meaningful long-term architectural consequences.

### XVI. Automated Quality Gates and Git Hooks

- Configure automated Git hooks to execute relevant quality checks before commits and pushes.
- Pre-commit hooks SHOULD execute fast checks, such as formatting, linting, and other lightweight validations.
- Pre-push hooks SHOULD execute more comprehensive checks when appropriate, such as type checking, unit tests, and production build validation.
- Hook execution MUST remain reasonably fast to avoid unnecessarily disrupting the development workflow.
- Do not duplicate expensive validations across multiple stages without a clear reason.
- Critical quality checks MUST also run in CI/CD pipelines, regardless of local Git hook execution.
- Local Git hooks MUST NOT be considered a replacement for CI/CD validation.
- Ensure all developers and contributors can install and use the same hook configuration consistently.
- Document how to install, execute, and troubleshoot the project's Git hooks.
- Any mechanism to bypass hooks MUST be treated as an exceptional action, not a normal development workflow.

Implementation guidance: evaluate Husky and lint-staged. Final tool selection, exact hook commands, and validation scope defined during project setup and implementation planning.

## Development and Implementation Standards

### Frontend standards

- Use functional React components and hooks.
- Keep presentation, application state, and business logic appropriately separated.
- Prefer TanStack Query for server-state management when applicable.
- Avoid introducing global state management libraries unless there is a clear requirement.
- Use accessible, reusable UI components.
- Keep forms validated with appropriate schemas.
- Ensure asynchronous operations handle loading, success, and failure states.
- Avoid unnecessary dependencies.
- Review bundle size and dependency impact when adding libraries.
- Keep routing and navigation consistent with the application's feature structure.

### Backend standards

- Use TypeScript consistently across the backend.
- Keep controllers focused on HTTP request and response handling.
- Place business rules in appropriate application or domain services.
- Validate requests at system boundaries.
- Use centralized error handling.
- Avoid leaking database or infrastructure implementation details into business logic.
- Keep database operations predictable and efficient.
- Use transactions when business consistency requires them.
- Ensure API responses follow consistent conventions.
- Avoid introducing unnecessary abstractions or infrastructure.

### Code review and implementation discipline

Before considering a feature complete:

- Verify that it follows the project constitution.
- Check for duplicated logic and unnecessary complexity.
- Review type safety and runtime validation.
- Confirm that relevant tests exist and pass.
- Check accessibility and responsive behavior.
- Consider performance implications.
- Verify error and empty states.
- Review security implications.
- Update relevant documentation when necessary.

AI-generated code MUST follow the same quality, security, testing, and review standards as manually written code.

## Architectural Decisions Intentionally Deferred

The constitution MUST NOT prematurely lock down decisions that require further product or technical analysis. The following remain open until relevant specifications and planning work:

- Final database selection and schema.
- Final ORM selection and data-access strategy.
- Authentication provider and implementation.
- Session management and token strategy.
- Guest-to-account migration implementation.
- Frontend and backend state-management details.
- API versioning strategy.
- Weather provider and integration details.
- PWA offline capabilities and synchronization behavior.
- Hosting and deployment configuration.
- Monitoring, logging, and observability tools.
- Final folder structure details beyond the architectural principles.
- Specific caching policies and performance budgets.

These decisions should be made through the appropriate Spec Kit workflow and documented when they have meaningful architectural impact. Do not introduce infrastructure or design patterns solely because they are common in larger systems.

## Governance

The constitution is the authoritative source of project-wide engineering principles.

- All specifications, plans, tasks, and implementation work MUST be consistent with the constitution.
- New features MUST respect the established architectural and quality standards.
- If an implementation decision conflicts with a constitutional principle, the conflict must be explicitly identified and resolved.
- Any exception MUST have a clear justification.
- Significant exceptions should be documented.
- Changes to the constitution MUST be intentional and reviewed.
- Do not weaken an existing principle merely to accommodate a shortcut or temporary implementation convenience.

The constitution should evolve as the project matures, but changes must preserve its role as a consistent engineering standard.

### Versioning

Initialize the constitution at version `1.0.0`. Follow semantic versioning for future changes:

- MAJOR: incompatible changes to existing principles or governance.
- MINOR: new principles or substantial additions.
- PATCH: clarifications, corrections, or wording improvements that do not change the intended requirements.

**Version**: 1.0.0 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-10-30