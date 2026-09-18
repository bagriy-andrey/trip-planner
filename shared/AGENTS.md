# shared/ — API contracts (`@tripplanner/shared`)

Zod schemas + inferred types used by `server/` AND `mobile/`. Real workspace package (not vendored).

## Rules
- Runtime-neutral: must run in Hermes (React Native) and Node. No `react-native`, Fastify, Node-only APIs.
- Only contracts and pure helpers. No I/O, no framework code.
- Dates over the wire: ISO-8601 UTC strings + IANA timezone id where local time matters.
- A contract change updates server AND mobile in the same plan.

## Status
Not scaffolded yet.
