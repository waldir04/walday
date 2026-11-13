# Contracts: Daily Commitments

This feature exposes no HTTP API. Commitment data stays in the browser and must never be sent to a server, external calendar, or third party (spec FR-044). Consequently there are no endpoints, request/response DTOs, status codes, CORS, or authentication contracts to define.

## Internal contracts

| Contract | Consumer | Description |
|---|---|---|
| [commitment-storage.md](./commitment-storage.md) | `entities/commitment`, `features/commitments`, future Daily Agenda | Versioned `localStorage` envelope, record shape, read/write outcomes, migration, and multi-tab behavior |

The storage contract is the only interface this feature exposes. It is documented because the future Daily Agenda depends on the data shape and retrieval order (FR-043), and because storage is an untrusted boundary that must be validated with Zod.

## Non-goals

- Backend endpoints, Express routes/controllers/services/repositories.
- Prisma models, PostgreSQL schema, or migrations.
- Cross-service or external calendar contracts.
- Automatic rescheduling or scheduling-algorithm inputs and outputs.
