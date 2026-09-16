# Database migrations

## Fresh install (empty database)

New installations apply **baseline 3.9.0** schema and seed files only. The runner in
`src/data/providers/database-provider.js` uses this path when `schema_version` is unset
and `untilVersion` is not provided. `schema_version` and `seeder_version` are then recorded
as `3.9.0`. Baseline files do not create hardware-inventory tables, architecture HAL/BLE
foreign keys, or HAL/RESTBlue catalog rows.

| Version | Migration | Seeder |
|---------|-----------|--------|
| 3.9.0 (fresh) | `db_migration_*_baseline_v3.9.0.sql` | `db_seeder_*_baseline_v3.9.0.sql` |

## Upgrade from 3.8.0

Existing 3.8.0 databases apply **incremental** 3.9.0 migrate-then-seed only. Do **not**
edit `db_*_v3.8.0.sql` files. The incremental 3.9 migration drops architecture HAL/BLE
foreign keys before deleting HAL/RESTBlue catalog rows.

`untilVersion: '3.8.0'` still builds a 3.8 fixture via the incremental chain (used by tests).
Never apply baseline 3.9 and the 3.8 chain on the same database.

| Version | Migration | Seeder |
|---------|-----------|--------|
| 3.8.0 | `db_migration_*_v3.8.0.sql` | `db_seeder_*_v3.8.0.sql` |
| 3.9.0 (upgrade) | `db_migration_*_v3.9.0.sql` | `db_seeder_*_v3.9.0.sql` |

Greenfield only vs pre-3.8: wipe the data directory or database before upgrading from pre-3.8 builds.
There is no v3.7→v3.8 incremental migrator.

## Pre-3.8 historical files

| File pattern | Purpose |
|--------------|---------|
| `db_migration_*_v1.1.0.sql` | Legacy incremental schema through Controller ≤3.7 |
| `db_seeder_*_v1.0.2.sql` | Legacy seed data (`FogTypes`, `registry.hub.docker.com`) |

These files remain in the tree for reference only. **Do not** point the migration runner at them
for new installs.
