DROP INDEX IF EXISTS idx_architecture_hal_catalog_item_id;
DROP INDEX IF EXISTS idx_architecture_bluetooth_catalog_item_id;
DROP INDEX IF EXISTS idx_architecture_network_catalog_item_id;

CREATE TABLE Architectures_new (
    id INT PRIMARY KEY,
    name TEXT,
    image TEXT,
    description TEXT,
    network_catalog_item_id INT,
    FOREIGN KEY (network_catalog_item_id) REFERENCES CatalogItems (id) ON DELETE CASCADE
);

INSERT INTO Architectures_new (id, name, image, description, network_catalog_item_id)
SELECT id, name, image, description, network_catalog_item_id FROM Architectures;

DROP TABLE Architectures;

ALTER TABLE Architectures_new RENAME TO Architectures;

CREATE INDEX idx_architecture_network_catalog_item_id ON Architectures (network_catalog_item_id);

DELETE FROM Microservices WHERE catalog_item_id IN (SELECT id FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue'));
DELETE FROM CatalogItemImages WHERE catalog_item_id IN (SELECT id FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue'));
DELETE FROM CatalogItemInputTypes WHERE catalog_item_id IN (SELECT id FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue'));
DELETE FROM CatalogItemOutputTypes WHERE catalog_item_id IN (SELECT id FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue'));
DELETE FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue');

ALTER TABLE Registries ADD COLUMN type VARCHAR(16) DEFAULT 'oci';
ALTER TABLE Registries ADD COLUMN ca TEXT;
ALTER TABLE Registries ADD COLUMN insecure BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_registries_url_type ON Registries (url, type);

CREATE TABLE IF NOT EXISTS Models (
    uuid VARCHAR(36) PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    repo TEXT,
    revision TEXT,
    registry_id INT,
    files TEXT,
    format VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (registry_id) REFERENCES Registries (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_models_registry_id ON Models (registry_id);
CREATE INDEX IF NOT EXISTS idx_models_name ON Models (name);

CREATE TABLE IF NOT EXISTS RuntimeClasses (
    name VARCHAR(255) PRIMARY KEY NOT NULL,
    handler VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS FogModels (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    fog_uuid VARCHAR(36),
    model_uuid VARCHAR(36),
    FOREIGN KEY (fog_uuid) REFERENCES Fogs (uuid) ON DELETE CASCADE,
    FOREIGN KEY (model_uuid) REFERENCES Models (uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fog_models_fog_uuid ON FogModels (fog_uuid);
CREATE INDEX IF NOT EXISTS idx_fog_models_model_uuid ON FogModels (model_uuid);

CREATE TABLE IF NOT EXISTS FogRuntimeClasses (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    fog_uuid VARCHAR(36),
    runtime_class_name VARCHAR(255),
    FOREIGN KEY (fog_uuid) REFERENCES Fogs (uuid) ON DELETE CASCADE,
    FOREIGN KEY (runtime_class_name) REFERENCES RuntimeClasses (name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fog_runtime_classes_fog_uuid ON FogRuntimeClasses (fog_uuid);
CREATE INDEX IF NOT EXISTS idx_fog_runtime_classes_runtime_class_name ON FogRuntimeClasses (runtime_class_name);

CREATE TABLE IF NOT EXISTS MicroserviceTemplates (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    microservice_json TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS MicroserviceTemplateVariables (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    microservice_template_id INT NOT NULL,
    `key` TEXT,
    description TEXT DEFAULT '',
    default_value TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (microservice_template_id) REFERENCES MicroserviceTemplates (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_microservicetemplatevariables_microservice_template_id ON MicroserviceTemplateVariables (microservice_template_id);

ALTER TABLE ChangeTrackings ADD COLUMN models BOOLEAN DEFAULT false;
ALTER TABLE ChangeTrackings ADD COLUMN runtime_classes BOOLEAN DEFAULT false;
ALTER TABLE ChangeTrackings ADD COLUMN microservice_models BOOLEAN DEFAULT false;

ALTER TABLE Fogs DROP COLUMN device_scan_frequency;
ALTER TABLE Fogs DROP COLUMN bluetooth;
ALTER TABLE Fogs DROP COLUMN hal;

ALTER TABLE Fogs ADD COLUMN model_status TEXT;
ALTER TABLE Fogs ADD COLUMN runtime_classes TEXT;
ALTER TABLE Fogs ADD COLUMN available_cdi_devices TEXT;
ALTER TABLE Fogs ADD COLUMN active_models BIGINT DEFAULT 0;
ALTER TABLE Fogs ADD COLUMN model_last_update BIGINT DEFAULT 0;

ALTER TABLE Microservices ADD COLUMN run_as_group TEXT;
ALTER TABLE Microservices ADD COLUMN read_only_root_filesystem BOOLEAN DEFAULT false;
ALTER TABLE Microservices ADD COLUMN working_dir TEXT;
ALTER TABLE Microservices ADD COLUMN cpus FLOAT;
ALTER TABLE Microservices ADD COLUMN memory_reservation FLOAT;
ALTER TABLE Microservices ADD COLUMN memory_swap FLOAT;
ALTER TABLE Microservices ADD COLUMN shm_size FLOAT;
ALTER TABLE Microservices ADD COLUMN sysctls TEXT;

CREATE TABLE IF NOT EXISTS MicroserviceEntrypoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    entrypoint TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES Microservices (uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_microservice_entrypoints_microserviceUuid ON MicroserviceEntrypoints (microservice_uuid);

CREATE TABLE IF NOT EXISTS MicroserviceDevices (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    host_path TEXT,
    container_path TEXT,
    permissions TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES Microservices (uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_microservice_devices_microserviceUuid ON MicroserviceDevices (microservice_uuid);

CREATE TABLE IF NOT EXISTS MicroserviceTmpfs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    container_path TEXT,
    size FLOAT,
    mode TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES Microservices (uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_microservice_tmpfs_microserviceUuid ON MicroserviceTmpfs (microservice_uuid);

CREATE TABLE IF NOT EXISTS MicroserviceUlimits (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    soft FLOAT,
    hard FLOAT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES Microservices (uuid) ON DELETE CASCADE,
    UNIQUE (microservice_uuid, name)
);

CREATE INDEX IF NOT EXISTS idx_microservice_ulimits_microserviceUuid ON MicroserviceUlimits (microservice_uuid);

CREATE TABLE IF NOT EXISTS MicroserviceModels (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    bind_path TEXT,
    permissions TEXT,
    microservice_uuid VARCHAR(36) NOT NULL UNIQUE,
    FOREIGN KEY (microservice_uuid) REFERENCES Microservices (uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MicroserviceModelItems (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name VARCHAR(255) NOT NULL,
    microservice_uuid VARCHAR(36) NOT NULL,
    FOREIGN KEY (microservice_uuid) REFERENCES Microservices (uuid) ON DELETE CASCADE,
    FOREIGN KEY (name) REFERENCES Models (name) ON DELETE RESTRICT,
    UNIQUE (microservice_uuid, name)
);

CREATE INDEX IF NOT EXISTS idx_microservice_model_items_microserviceUuid ON MicroserviceModelItems (microservice_uuid);
CREATE INDEX IF NOT EXISTS idx_microservice_model_items_name ON MicroserviceModelItems (name);

ALTER TABLE MicroserviceStatuses ADD COLUMN pod_id TEXT DEFAULT '';

DROP TABLE IF EXISTS HWInfos;
DROP TABLE IF EXISTS USBInfos;
