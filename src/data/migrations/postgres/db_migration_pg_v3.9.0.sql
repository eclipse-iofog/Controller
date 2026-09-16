ALTER TABLE "Architectures" DROP COLUMN IF EXISTS hal_catalog_item_id CASCADE;
ALTER TABLE "Architectures" DROP COLUMN IF EXISTS bluetooth_catalog_item_id CASCADE;
DROP INDEX IF EXISTS idx_architecture_hal_catalog_item_id;
DROP INDEX IF EXISTS idx_architecture_bluetooth_catalog_item_id;

DELETE FROM "Microservices" WHERE catalog_item_id IN (SELECT id FROM "CatalogItems" WHERE name IN ('HAL', 'RESTBlue'));
DELETE FROM "CatalogItemImages" WHERE catalog_item_id IN (SELECT id FROM "CatalogItems" WHERE name IN ('HAL', 'RESTBlue'));
DELETE FROM "CatalogItemInputTypes" WHERE catalog_item_id IN (SELECT id FROM "CatalogItems" WHERE name IN ('HAL', 'RESTBlue'));
DELETE FROM "CatalogItemOutputTypes" WHERE catalog_item_id IN (SELECT id FROM "CatalogItems" WHERE name IN ('HAL', 'RESTBlue'));
DELETE FROM "CatalogItems" WHERE name IN ('HAL', 'RESTBlue');

ALTER TABLE "Registries" ADD COLUMN IF NOT EXISTS type VARCHAR(16) NOT NULL DEFAULT 'oci';
ALTER TABLE "Registries" ADD COLUMN IF NOT EXISTS ca TEXT;
ALTER TABLE "Registries" ADD COLUMN IF NOT EXISTS insecure BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_registries_url_type ON "Registries" (url, type);

CREATE TABLE IF NOT EXISTS "Models" (
    uuid VARCHAR(36) PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    repo TEXT,
    revision TEXT,
    registry_id INT,
    files TEXT,
    format VARCHAR(255),
    created_at TIMESTAMPTZ(0),
    updated_at TIMESTAMPTZ(0),
    FOREIGN KEY (registry_id) REFERENCES "Registries" (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_models_registry_id ON "Models" (registry_id);
CREATE INDEX IF NOT EXISTS idx_models_name ON "Models" (name);

CREATE TABLE IF NOT EXISTS "RuntimeClasses" (
    name VARCHAR(255) PRIMARY KEY NOT NULL,
    handler VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "FogModels" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    fog_uuid VARCHAR(36),
    model_uuid VARCHAR(36),
    FOREIGN KEY (fog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (model_uuid) REFERENCES "Models" (uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fog_models_fog_uuid ON "FogModels" (fog_uuid);
CREATE INDEX IF NOT EXISTS idx_fog_models_model_uuid ON "FogModels" (model_uuid);

CREATE TABLE IF NOT EXISTS "FogRuntimeClasses" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    fog_uuid VARCHAR(36),
    runtime_class_name VARCHAR(255),
    FOREIGN KEY (fog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (runtime_class_name) REFERENCES "RuntimeClasses" (name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fog_runtime_classes_fog_uuid ON "FogRuntimeClasses" (fog_uuid);
CREATE INDEX IF NOT EXISTS idx_fog_runtime_classes_runtime_class_name ON "FogRuntimeClasses" (runtime_class_name);

CREATE TABLE IF NOT EXISTS "MicroserviceTemplates" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    microservice_json TEXT,
    created_at TIMESTAMPTZ(0),
    updated_at TIMESTAMPTZ(0)
);

CREATE TABLE IF NOT EXISTS "MicroserviceTemplateVariables" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    microservice_template_id INT NOT NULL,
    key TEXT,
    description TEXT DEFAULT '',
    default_value TEXT,
    created_at TIMESTAMPTZ(0),
    updated_at TIMESTAMPTZ(0),
    FOREIGN KEY (microservice_template_id) REFERENCES "MicroserviceTemplates" (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_microservicetemplatevariables_microservice_template_id ON "MicroserviceTemplateVariables" (microservice_template_id);

ALTER TABLE "ChangeTrackings" ADD COLUMN IF NOT EXISTS models BOOLEAN DEFAULT false;
ALTER TABLE "ChangeTrackings" ADD COLUMN IF NOT EXISTS runtime_classes BOOLEAN DEFAULT false;
ALTER TABLE "ChangeTrackings" ADD COLUMN IF NOT EXISTS microservice_models BOOLEAN DEFAULT false;

ALTER TABLE "Fogs" DROP COLUMN IF EXISTS device_scan_frequency;
ALTER TABLE "Fogs" DROP COLUMN IF EXISTS bluetooth;
ALTER TABLE "Fogs" DROP COLUMN IF EXISTS hal;

ALTER TABLE "Fogs" ADD COLUMN IF NOT EXISTS model_status TEXT;
ALTER TABLE "Fogs" ADD COLUMN IF NOT EXISTS runtime_classes TEXT;
ALTER TABLE "Fogs" ADD COLUMN IF NOT EXISTS available_cdi_devices TEXT;
ALTER TABLE "Fogs" ADD COLUMN IF NOT EXISTS active_models BIGINT DEFAULT 0;
ALTER TABLE "Fogs" ADD COLUMN IF NOT EXISTS model_last_update BIGINT DEFAULT 0;

ALTER TABLE "Microservices" ADD COLUMN IF NOT EXISTS run_as_group TEXT;
ALTER TABLE "Microservices" ADD COLUMN IF NOT EXISTS read_only_root_filesystem BOOLEAN DEFAULT false;
ALTER TABLE "Microservices" ADD COLUMN IF NOT EXISTS working_dir TEXT;
ALTER TABLE "Microservices" ADD COLUMN IF NOT EXISTS cpus DOUBLE PRECISION;
ALTER TABLE "Microservices" ADD COLUMN IF NOT EXISTS memory_reservation DOUBLE PRECISION;
ALTER TABLE "Microservices" ADD COLUMN IF NOT EXISTS memory_swap DOUBLE PRECISION;
ALTER TABLE "Microservices" ADD COLUMN IF NOT EXISTS shm_size DOUBLE PRECISION;
ALTER TABLE "Microservices" ADD COLUMN IF NOT EXISTS sysctls TEXT;

CREATE TABLE IF NOT EXISTS "MicroserviceEntrypoints" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    entrypoint TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_microservice_entrypoints_microserviceUuid ON "MicroserviceEntrypoints" (microservice_uuid);

CREATE TABLE IF NOT EXISTS "MicroserviceDevices" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    host_path TEXT,
    container_path TEXT,
    permissions TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_microservice_devices_microserviceUuid ON "MicroserviceDevices" (microservice_uuid);

CREATE TABLE IF NOT EXISTS "MicroserviceTmpfs" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    container_path TEXT,
    size DOUBLE PRECISION,
    mode TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_microservice_tmpfs_microserviceUuid ON "MicroserviceTmpfs" (microservice_uuid);

CREATE TABLE IF NOT EXISTS "MicroserviceUlimits" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    soft DOUBLE PRECISION,
    hard DOUBLE PRECISION,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE,
    UNIQUE (microservice_uuid, name)
);

CREATE INDEX IF NOT EXISTS idx_microservice_ulimits_microserviceUuid ON "MicroserviceUlimits" (microservice_uuid);

CREATE TABLE IF NOT EXISTS "MicroserviceModels" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    bind_path TEXT,
    permissions TEXT,
    microservice_uuid VARCHAR(36) NOT NULL UNIQUE,
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MicroserviceModelItems" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL,
    microservice_uuid VARCHAR(36) NOT NULL,
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (name) REFERENCES "Models" (name) ON DELETE RESTRICT,
    UNIQUE (microservice_uuid, name)
);

CREATE INDEX IF NOT EXISTS idx_microservice_model_items_microserviceUuid ON "MicroserviceModelItems" (microservice_uuid);
CREATE INDEX IF NOT EXISTS idx_microservice_model_items_name ON "MicroserviceModelItems" (name);

ALTER TABLE "MicroserviceStatuses" ADD COLUMN IF NOT EXISTS pod_id TEXT DEFAULT '';

DROP TABLE IF EXISTS "HWInfos";
DROP TABLE IF EXISTS "USBInfos";
