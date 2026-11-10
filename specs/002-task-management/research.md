# Research: Task Management

- Decision: Use browser localStorage for guest persistence.
- Rationale: No backend/auth in scope; simple and sufficient.
- Alternatives: IndexedDB (overkill for MVP).

- Decision: Priority default "medium".
- Rationale: Sensible default per spec.

- Decision: Confirmation dialog for delete.
- Rationale: Destructive action requires explicit confirm.