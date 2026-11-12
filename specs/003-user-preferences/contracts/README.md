# Contracts: User Preferences and Localization

This folder defines the interfaces that constrain this feature. Contracts are documentation, not implementation; no source file is changed by this planning step.

| Contract | Audience | Status |
| --- | --- | --- |
| [preference-store.md](./preference-store.md) | `entities/preferences` storage layer, feature store, tests | Implemented by this feature |
| [preference-consumer.md](./preference-consumer.md) | Every feature/entity that reads preferences (tasks, commitments, future agenda/dashboard/weather) | Implemented by this feature |
| [location-resolution.md](./location-resolution.md) | `features/user-preferences` location port and the future backend weather proxy | Frontend port implemented by this feature; backend endpoint is a dependency owned by the future weather feature |

No authenticated preference API, database contract, or cloud-sync contract exists. Future guest-to-account migration will define its own contract (FR-110–FR-112).
