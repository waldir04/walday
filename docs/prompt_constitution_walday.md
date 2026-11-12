# Task: Create the Walday Project Constitution

## 1. Objective

Create the initial project constitution for **Walday** using the GitHub Spec Kit methodology.

The constitution must establish the engineering principles, architectural standards, development practices, quality expectations, and governance rules that will guide the project throughout its lifecycle.

The resulting document must be:

- Clear, actionable, and specific enough to guide future implementation decisions.
- Strict about code quality, maintainability, security, accessibility, and testing.
- Pragmatic, avoiding unnecessary complexity and overengineering.
- Consistent with the product requirements and technical direction described below.
- Suitable for a professional portfolio project that demonstrates senior-level software engineering practices.

The constitution must serve as a set of enforceable project-wide principles, not as a detailed implementation specification.

## 2. Project Context

**Walday** is a daily planning web application designed to help users organize their day by combining:

- Tasks and personal activities.
- Fixed and flexible commitments.
- A chronological daily agenda.
- Weather information and hourly forecasts.
- Contextual planning suggestions.

The application should help users make better daily planning decisions without taking control away from them.

### Product principles

- Users must remain in control of their schedules.
- The application must never automatically reschedule fixed commitments.
- The application must never modify a user's agenda without explicit permission.
- Planning suggestions must be understandable and explainable.
- Weather service failures must not prevent users from managing their tasks or agenda.
- The application should be useful without requiring account registration.
- Guest users must be informed that locally stored information may be lost if browser storage is cleared or they change devices.
- Account registration should enable cloud synchronization and access across devices.
- The application should support a simple migration from guest data to an authenticated account.
- The experience must be responsive and suitable for desktop and mobile devices.

### MVP functionality

The initial product scope includes:

1. Daily dashboard.
2. Task creation, editing, deletion, and completion.
3. Task priorities, due dates, and estimated durations.
4. Fixed and flexible commitments.
5. Chronological daily agenda.
6. Basic conflict identification and available time slots.
7. Selected-location weather information and hourly forecasts.
8. Rule-based planning suggestions with the ability to accept, dismiss, or adjust them.
9. User preferences.
10. Guest access with local persistence.
11. Optional email/password and Google authentication.
12. Cloud synchronization for authenticated users.
13. Guest-to-account data migration.
14. Responsive web application with PWA capabilities.

Do not expand the MVP beyond these requirements without a clear product justification.

## 3. Initial Technical Direction

The following technologies represent the initial technical direction. They should guide architectural decisions but should not prevent the team from evaluating better alternatives when justified.

### Frontend

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- React Router.
- TanStack Query.
- Vitest.
- React Testing Library.

### Backend

- Node.js.
- TypeScript.
- Express.
- Zod for validation.

### Data and infrastructure

- PostgreSQL as the initial database candidate.
- Prisma as the initial ORM candidate.
- Open-Meteo as a weather API candidate, subject to reviewing its usage terms.
- Vercel as a frontend deployment candidate.
- Render as a backend deployment candidate.
- Supabase as a database hosting candidate.

### Architecture considerations

The frontend and backend will be independently developed and deployed applications.

The architecture must support clear separation of responsibilities, well-defined API contracts, and independent deployment without introducing unnecessary distributed systems complexity.

The final decisions regarding database implementation, authentication strategy, session management, API versioning, offline capabilities, hosting, and monitoring should be made during the appropriate Spec Kit planning stages.

Do not treat initial technology candidates as immutable architectural decisions.

---

# 4. Core Engineering Principles

## Principle 1 — Clean Code, SOLID, and Simplicity

The codebase MUST prioritize readability, maintainability, and clarity.

Requirements:

- Follow Clean Code principles and apply SOLID where appropriate.
- Write self-documenting code with meaningful names for variables, functions, components, classes, and modules.
- Prefer simple and explicit solutions over unnecessary abstractions.
- Keep functions and components focused on a single responsibility.
- Avoid duplicated logic and unnecessary coupling.
- Avoid premature optimization and overengineering.
- Use abstractions when they provide clear benefits, not merely to follow a pattern.
- Keep business logic separate from presentation and infrastructure concerns.
- Avoid excessively large files, components, functions, and modules.
- Comments should explain complex decisions or non-obvious behavior, not repeat what the code already expresses.

SOLID and design patterns should be applied pragmatically rather than mechanically.

## Principle 2 — Strict TypeScript and Type Safety

TypeScript MUST be used throughout both frontend and backend applications.

Requirements:

- Enable and maintain strict TypeScript compiler settings.
- The use of `any` is strictly prohibited.
- Use `unknown` when the type is genuinely unknown and narrow it safely before use.
- Use generics when they provide meaningful type reuse and stronger type safety.
- Prefer explicit domain types, interfaces, unions, and well-defined contracts.
- Avoid unnecessary type assertions and unsafe type casting.
- Avoid duplicating types when they can be shared through an appropriate contract or schema.
- Validate external data at runtime when it enters the application.
- Do not assume API responses, environment variables, or third-party data are valid simply because TypeScript types describe them.

Type safety must be preserved across application boundaries.

## Principle 3 — Frontend Architecture: Feature-Sliced Design

The frontend MUST follow **Feature-Sliced Design (FSD)** principles.

Requirements:

- Organize the application around clearly defined architectural layers and business features.
- Respect the responsibilities and dependency rules of each layer.
- Keep shared UI, entities, features, widgets, pages, and application-level configuration appropriately separated.
- Avoid circular dependencies and uncontrolled cross-feature imports.
- Keep business logic independent from UI rendering whenever practical.
- Expose public APIs for modules where appropriate.
- Avoid creating unnecessary layers or folders without a clear architectural purpose.
- Ensure that features remain cohesive and reasonably independent.

The architecture should remain understandable and scalable as the application grows.

## Principle 4 — Backend Architecture and Modular Design

The backend MUST follow a modular, feature-oriented architecture inspired by established Node.js project structure practices.

Reference:
https://softwareontheroad.com/ideal-nodejs-project-structure/

Requirements:

- Organize code around business modules or features.
- Separate HTTP concerns, controllers, application services, domain logic, data access, and infrastructure responsibilities.
- Controllers MUST remain thin and should not contain complex business logic.
- Business rules MUST NOT be tightly coupled to Express or database implementations.
- Keep database access behind appropriate repositories or data-access abstractions when useful.
- Centralize request validation, error handling, and response conventions.
- Avoid circular dependencies and unnecessary coupling between modules.
- Keep modules cohesive and expose only the interfaces necessary for other modules.

Do not force the backend to reproduce frontend FSD layers. Use an architecture appropriate for a Node.js application while maintaining consistent separation of concerns.

## Principle 5 — React Component Design and Reusability

React components MUST remain small, focused, and maintainable.

Requirements:

- Prefer small components with clear responsibilities.
- Avoid components that combine extensive business logic, data fetching, state management, and complex presentation.
- Extract reusable or complex component logic into custom hooks when appropriate.
- Use Compound Components when they provide a meaningful API and improve component composition.
- Avoid excessively large JSX structures and deeply nested conditional rendering.
- Keep state as close as possible to where it is needed.
- Avoid unnecessary global state.
- Prefer composition over unnecessarily complex component configurations.
- Use memoization only when there is a demonstrated or reasonably justified performance benefit.
- Avoid premature use of `React.memo`, `useMemo`, and `useCallback`.

Reusable components should have clear APIs, predictable behavior, and appropriate tests.

## Principle 6 — Styling, Design Tokens, and Visual Consistency

The frontend MUST maintain a consistent and reusable styling system.

Requirements:

- Use Tailwind CSS as the primary styling approach.
- Prefer design tokens for colors, typography, spacing, borders, shadows, and other recurring visual properties.
- Avoid duplicated styling values across unrelated components.
- Maintain consistent visual behavior throughout the application.
- Avoid inline styles unless strictly necessary.
- Avoid using `!important` unless there is a clear and justified technical reason.
- Do not introduce multiple styling approaches without architectural justification.
- Keep responsive behavior consistent across supported screen sizes.
- Ensure that shared components follow the same visual and interaction conventions.

The visual implementation should remain aligned with Walday's calm, friendly, minimalist design direction.

## Principle 7 — Testing Strategy and Quality Assurance

Testing MUST be an integral part of development, not a final project phase.

Requirements:

- Use Vitest and React Testing Library for frontend unit and component testing.
- Apply the Arrange-Act-Assert (AAA) pattern to keep tests structured and readable.
- Test observable behavior rather than implementation details.
- Prioritize meaningful tests for business rules, critical user journeys, and edge cases.
- Test loading, success, empty, error, and relevant boundary states.
- Mock external services and network dependencies appropriately.
- Avoid tests that are excessively coupled to internal component structure.
- Backend business logic, services, validation, and API behavior must also be tested.
- Use integration and end-to-end tests where they provide meaningful coverage of critical workflows.

### Coverage expectations

- Establish a minimum global test coverage target of 80%.
- Aim for approximately 90% coverage for critical business logic and high-risk functionality.
- Do not sacrifice test quality simply to increase coverage percentages.
- Any exclusion from coverage requirements must be justified and documented.

Coverage is an indicator of testing completeness, not proof of software quality.

## Principle 8 — Performance and Resource Efficiency

Performance MUST be considered throughout architecture, development, and validation.

Requirements:

- Avoid unnecessary rendering and expensive computations.
- Apply code splitting and lazy loading where appropriate.
- Separate third-party dependencies into appropriate bundles when doing so provides measurable or reasonable benefits.
- Avoid loading unnecessary resources during initial application startup.
- Use memoization only when justified.
- Use virtualization for large collections when rendering all elements would negatively affect performance.
- Optimize network requests and avoid unnecessary repeated requests.
- Use appropriate caching strategies.
- Enable HTTP compression for production responses where supported.
- Optimize assets and avoid unnecessarily large dependencies.
- Consider Core Web Vitals and use Lighthouse to identify relevant performance issues.
- Establish performance budgets when sufficient baseline information is available.

Performance improvements should be based on actual bottlenecks or reasonable architectural evidence rather than speculative optimization.

## Principle 9 — Scalability, Resilience, and Fault Isolation

The architecture MUST support future growth without unnecessary complexity.

Requirements:

- Keep modules cohesive and loosely coupled.
- Avoid making unrelated features depend on a single external service.
- Handle failures from third-party APIs gracefully.
- Provide meaningful loading, empty, and error states.
- Ensure that failure of the weather service does not prevent task or agenda functionality.
- Avoid uncontrolled propagation of errors between application modules.
- Use appropriate timeouts and error-handling strategies for external requests.
- Design interfaces and contracts that can evolve without unnecessary breaking changes.
- Keep the application functional when non-critical services are temporarily unavailable.

Scalability should be achieved through sound modular design and clear boundaries, not by prematurely introducing microservices or distributed infrastructure.

## Principle 10 — API Contracts and Independent Deployment

The frontend and backend MUST communicate through explicit, validated, and maintainable API contracts.

Requirements:

- Define clear request and response structures.
- Validate incoming backend data using runtime validation tools such as Zod.
- Maintain consistent error response conventions.
- Avoid exposing internal implementation details through API responses.
- Keep frontend and backend responsibilities clearly separated.
- Support independent frontend and backend deployment.
- Configure CORS explicitly for the required application origins.
- Do not use unrestricted wildcard CORS policies in production when credentials are involved.
- Keep environment-specific origins and endpoints configurable.
- Apply appropriate HTTP caching headers.
- Avoid caching user-specific or sensitive responses in shared caches.
- Document API behavior and important contract decisions.

Backend errors should provide stable, machine-readable error codes so the frontend can display localized messages.

## Principle 11 — Constants, Hardcoded Values, and Configuration Management

The codebase MUST avoid magic values, duplicated configuration, and unexplained hardcoded business rules.

Requirements:

- Do not scatter magic numbers, unexplained string literals, or business constants throughout the codebase.
- Define named constants for meaningful business rules, thresholds, limits, default values, and shared application values.
- Centralize configuration that is shared or environment-dependent.
- Do not duplicate the same business or configuration value across unrelated modules.
- Do not hardcode API URLs, credentials, secrets, environment-specific endpoints, timeouts, or other deployment-specific settings.
- Retrieve sensitive values and environment-specific configuration through environment variables or an appropriate configuration provider.
- Validate required configuration during application startup.
- Use enums, literal unions, or typed structures when they improve consistency and type safety.
- Keep configuration responsibilities separate from business logic.

### Practical exception

Not every literal needs to become a constant.

Simple, self-explanatory values that are intrinsic to an operation may remain inline when extracting them would reduce readability or add unnecessary indirection.

The objective is to eliminate magic values and duplicated rules, not to create a constant for every string or number.

## Principle 12 — Security and Data Protection

Security MUST be considered from the beginning of development.

Requirements:

- Never commit secrets, credentials, private keys, or sensitive environment configuration.
- Validate and sanitize external input at appropriate boundaries.
- Apply appropriate authentication and authorization checks on protected backend resources.
- Never rely exclusively on frontend validation for security.
- Protect against common web vulnerabilities, including injection, cross-site scripting (XSS), and cross-site request forgery (CSRF), where applicable.
- Use secure transport through HTTPS in production.
- Apply appropriate security headers.
- Avoid exposing sensitive information in logs, API responses, or error messages.
- Store and handle passwords and authentication credentials using established secure practices.
- Follow least-privilege principles.
- Protect user-specific data and ensure that one user cannot access another user's information.
- Treat third-party API responses as untrusted external data.
- Review authentication, session, and token-management decisions during the appropriate planning stage.

Security controls must be appropriate to the selected authentication and deployment architecture.

## Principle 13 — Accessibility and Inclusive Design (a11y)

Walday MUST be designed and implemented with accessibility as a core quality requirement.

The target is **WCAG 2.2 Level AA**.

Accessibility MUST be considered during specification, design, implementation, and testing rather than added as a final improvement.

### Semantic structure

- Use semantic HTML elements appropriately.
- Maintain a logical heading hierarchy.
- Use native form controls and interactive elements whenever possible.
- Ensure that buttons, links, inputs, and other controls have meaningful accessible names.
- Do not use semantic elements incorrectly to achieve visual effects.
- Use ARIA only when native HTML semantics are insufficient.

### Keyboard accessibility

- All essential functionality MUST be available through keyboard interaction.
- Maintain a visible and consistent focus indicator.
- Ensure a logical focus order.
- Prevent keyboard traps.
- Manage focus appropriately in dialogs, menus, forms, and other interactive components.
- Do not require precise pointer movement to complete essential tasks.

### Screen reader support

- Provide appropriate labels and descriptions.
- Associate form fields with their instructions and validation messages.
- Communicate dynamic changes, loading states, and important status updates.
- Ensure that meaningful information is not communicated exclusively through icons, colors, or visual positioning.
- Use ARIA live regions appropriately when dynamic content needs to be announced.
- Do not use ARIA as a replacement for correct semantic HTML.

### Visual accessibility

- Meet WCAG 2.2 AA contrast requirements.
- Do not use color as the only way to communicate status, priority, or errors.
- Support browser zoom and text resizing.
- Maintain readable typography and sufficient spacing.
- Respect the user's `prefers-reduced-motion` preference.
- Ensure focus indicators are clearly visible.
- Avoid unnecessary animations and visual effects that interfere with usability.

### Responsive and touch accessibility

- Ensure accessible interaction on desktop and mobile devices.
- Provide sufficiently large and well-spaced touch targets according to WCAG 2.2 requirements.
- Avoid interactions that depend exclusively on hover.
- Preserve usability at different viewport sizes and zoom levels.

### Forms and validation

- Provide visible labels and clear instructions.
- Display validation errors in a meaningful and accessible way.
- Associate errors with the corresponding fields.
- Communicate submission success and failure.
- Preserve user input when practical after validation failures.

### Accessibility testing

- Include accessibility checks in component and integration testing.
- Use tools such as axe-core and Lighthouse where appropriate.
- Test keyboard navigation and focus management.
- Perform manual screen reader checks for critical user journeys.
- Automated tools MUST NOT be considered sufficient proof of accessibility compliance.

Accessibility violations affecting critical user journeys MUST be treated as defects.

### Walday-specific accessibility considerations

- Weather information must not rely exclusively on icons or colors.
- Agenda entries and their chronological relationships must be understandable to assistive technologies.
- Planning suggestions must communicate their reasoning through text, not just visual indicators.
- Task completion and priority changes must be communicated accessibly.
- Dialogs and interactive menus must support appropriate focus management and keyboard operation.
- Language selection and document language must be exposed correctly to assistive technologies.

## Principle 14 — Internationalization and Localization (i18n/l10n)

Walday MUST support multiple languages from the beginning of the project.

The initial supported languages are:

- English (`en`).
- Spanish (`es`).

The architecture must allow additional languages to be introduced without requiring structural changes.

### Translation architecture

- English will be the canonical source language for translation keys and developer-facing technical artifacts.
- All user-facing interface text MUST be externalized from React components into structured translation resources.
- Avoid hardcoded user-facing text inside components.
- Use descriptive, consistent translation keys.
- Organize translations logically by feature or shared interface area.
- Keep translation resources separate from business logic.
- Support fallback behavior when a translation is missing.
- Persist the user's language preference when appropriate.
- Allow users to switch languages without requiring a full application reload.
- Load translation resources efficiently, using lazy loading where appropriate.

### Localized content

The following elements MUST support localization:

- Navigation and interface labels.
- Buttons and actions.
- Form labels and validation messages.
- Notifications and feedback.
- Empty, loading, and error states.
- Planning suggestions.
- Weather-related descriptions and information where supported.
- Accessibility labels and screen reader descriptions.

### Locale-aware formatting

- Format dates, times, numbers, and currencies according to the selected locale.
- Respect relevant calendar and regional conventions.
- Keep timezone preferences independent from the selected interface language.
- Keep weather unit preferences independent from the selected interface language.
- Avoid assuming that all users share the same date, time, or measurement conventions.
- Handle dynamic translation interpolation safely.

### Backend localization

- Backend APIs MUST return stable, machine-readable error codes rather than relying exclusively on hardcoded user-facing messages.
- The frontend should translate those codes into the selected language.
- Technical logs and developer-facing messages should remain consistent, preferably in English.
- If the backend generates user-facing messages, it must support an appropriate localization strategy.

### Implementation guidance

Evaluate established solutions such as `i18next` and `react-i18next`.

Do not introduce unnecessary localization complexity for the MVP, but ensure the initial architecture does not make multilingual support difficult.

The application runtime language should respect the user's saved preference or browser locale when appropriate, with English as the fallback language.

## Principle 15 — Documentation and Technical Communication

Documentation MUST support maintainability and collaboration.

Requirements:

- Document important architectural decisions and their rationale.
- Keep project documentation aligned with the actual implementation.
- Document setup instructions, environment variables, and development workflows.
- Maintain clear API documentation where appropriate.
- Document non-obvious business rules and important edge cases.
- Prefer concise, useful documentation over excessive or duplicated descriptions.
- Keep technical documentation, code comments, naming conventions, and development artifacts in English.
- Ensure that documentation changes accompany significant architectural or behavioral changes.

Architecture Decision Records (ADRs) should be used when a decision has meaningful long-term architectural consequences.

## Principle 16 — Automated Quality Gates and Git Hooks

The project MUST use automated quality checks to prevent avoidable code quality issues from entering the codebase.

Requirements:

- Configure automated Git hooks to execute relevant quality checks before commits and pushes.
- Pre-commit hooks SHOULD execute fast checks, such as formatting, linting, and other lightweight validations.
- Pre-push hooks SHOULD execute more comprehensive checks when appropriate, such as type checking, unit tests, and production build validation.
- Hook execution MUST remain reasonably fast to avoid unnecessarily disrupting the development workflow.
- Do not duplicate expensive validations across multiple stages without a clear reason.
- Critical quality checks MUST also run in CI/CD pipelines, regardless of local Git hook execution.
- Local Git hooks MUST NOT be considered a replacement for CI/CD validation.
- Ensure that all developers and contributors can install and use the same hook configuration consistently.
- Document how to install, execute, and troubleshoot the project's Git hooks.
- Any mechanism to bypass hooks MUST be treated as an exceptional action, not a normal development workflow.

### Implementation guidance

Evaluate tools such as Husky and lint-staged for Git hook management.

The final selection of tools, exact hook commands, and validation scope SHOULD be defined during project setup and implementation planning.

---

# 5. Development and Implementation Standards

The following standards complement the core principles and should guide implementation.

## Frontend standards

- Use functional React components and hooks.
- Keep presentation, application state, and business logic appropriately separated.
- Prefer TanStack Query for server-state management when applicable.
- Avoid introducing global state management libraries unless there is a clear requirement.
- Use accessible, reusable UI components.
- Keep forms validated with appropriate schemas.
- Ensure that asynchronous operations handle loading, success, and failure states.
- Avoid unnecessary dependencies.
- Review bundle size and dependency impact when adding libraries.
- Keep routing and navigation consistent with the application's feature structure.

## Backend standards

- Use TypeScript consistently across the backend.
- Keep controllers focused on HTTP request and response handling.
- Place business rules in appropriate application or domain services.
- Validate requests at system boundaries.
- Use centralized error handling.
- Avoid leaking database or infrastructure implementation details into business logic.
- Keep database operations predictable and efficient.
- Use transactions when business consistency requires them.
- Ensure that API responses follow consistent conventions.
- Avoid introducing unnecessary abstractions or infrastructure.

## Code review and implementation discipline

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

---

# 6. Architectural Decisions Intentionally Deferred

The constitution MUST NOT prematurely lock down decisions that require further product or technical analysis.

The following decisions should remain open until the relevant specifications and planning work:

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

These decisions should be made through the appropriate Spec Kit workflow and documented when they have meaningful architectural impact.

Do not introduce infrastructure or design patterns solely because they are common in larger systems.

---

# 7. Constitution Governance

The constitution is the authoritative source of project-wide engineering principles.

Requirements:

- All specifications, plans, tasks, and implementation work MUST be consistent with the constitution.
- New features MUST respect the established architectural and quality standards.
- If an implementation decision conflicts with a constitutional principle, the conflict must be explicitly identified and resolved.
- Any exception MUST have a clear justification.
- Significant exceptions should be documented.
- Changes to the constitution MUST be intentional and reviewed.
- Do not weaken an existing principle merely to accommodate a shortcut or temporary implementation convenience.

The constitution should evolve as the project matures, but changes must preserve its role as a consistent engineering standard.

## Versioning

Initialize the constitution at version `1.0.0`.

Follow semantic versioning for future changes:

- MAJOR: incompatible changes to existing principles or governance.
- MINOR: new principles or substantial additions.
- PATCH: clarifications, corrections, or wording improvements that do not change the intended requirements.

Do not invent a creation date. Use the current date available in the execution environment if the document template requires one.

---

# 8. Spec Kit Execution Instructions

Before creating the constitution:

1. Inspect the current repository structure and existing project files.
2. Identify whether GitHub Spec Kit is already initialized.
3. Inspect the installed Spec Kit version and the available constitution command or template.
4. Review the current official Spec Kit guidance and follow the workflow supported by the installed version.
5. Identify the expected constitution file location and format.

If the Spec Kit command `/speckit.constitution` is available, use it to generate or update the constitution.

If the command is unavailable, follow the current official Spec Kit constitution template and conventions manually.

Do not assume an outdated command, directory structure, or template.

## Scope restrictions

For this task:

- Create or update only the project constitution file.
- The expected location is `.specify/memory/constitution.md`, unless the installed Spec Kit version explicitly uses a different canonical location.
- Do not implement application code.
- Do not create frontend or backend scaffolding.
- Do not generate feature specifications, implementation plans, or task lists.
- Do not install dependencies unless strictly required to execute the existing Spec Kit workflow.
- Do not modify unrelated repository files.
- Do not introduce architectural decisions that are explicitly deferred in this prompt.

---

# 9. Final Validation

Before finishing, verify that the resulting constitution:

- Is consistent with the Walday product context.
- Includes all 15 engineering principles.
- Clearly distinguishes mandatory requirements from recommendations.
- Includes frontend and backend architectural standards.
- Explicitly prohibits the use of TypeScript `any`.
- Establishes pragmatic SOLID and Clean Code expectations.
- Defines the Feature-Sliced Design requirement for the frontend.
- Defines modular, feature-oriented architecture for the backend.
- Includes React component design and reuse guidelines.
- Includes testing expectations and coverage targets.
- Includes performance, resilience, and scalability standards.
- Includes explicit rules for constants, magic values, and configuration.
- Includes security and data protection requirements.
- Establishes WCAG 2.2 AA as the accessibility target.
- Includes English and Spanish internationalization requirements.
- Defines documentation and governance expectations.
- Keeps undecided technical choices open for future planning.
- Uses clear, enforceable, and unambiguous language.
- Follows the current Spec Kit constitution conventions.

Resolve contradictions, duplicated requirements, and inconsistent terminology before considering the task complete.

## 10. Final Response

After completing the task, provide a concise summary in Spanish containing:

1. The constitution file created or updated.
2. The Spec Kit workflow or template used.
3. The main principles and standards included.
4. Any relevant decisions that remain intentionally deferred.
5. Any assumptions, conflicts, or limitations discovered during execution.

Do not claim that the constitution was created or validated unless the corresponding operation was actually completed successfully.

**Important:** The goal is to establish a strong, professional, maintainable engineering foundation for Walday without overengineering the MVP. Apply these principles consistently, but use sound engineering judgment when deciding how to implement them.