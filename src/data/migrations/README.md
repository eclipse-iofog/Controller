# Database migrations

## Fresh install (Controller v3.8+)

New installations use **`db_migration_*_v3.8.0.sql`** and **`db_seeder_*_v3.8.0.sql`**
(sqlite, mysql, postgres). The migration runner in `src/data/providers/database-provider.js`
records schema version **`3.8.0`** (includes embedded auth tables).

Greenfield only: wipe the data directory or database before upgrading from pre-3.8 builds.
There is no v3.7→v3.8 incremental migrator.

## Pre-3.8 historical files

| File pattern | Purpose |
|--------------|---------|
| `db_migration_*_v1.1.0.sql` | Legacy incremental schema through Controller ≤3.7 |
| `db_seeder_*_v1.0.2.sql` | Legacy seed data (`FogTypes`, `registry.hub.docker.com`) |

These files remain in the tree for reference only. **Do not** point the migration runner at them
for new installs.
