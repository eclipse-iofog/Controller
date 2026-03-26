CREATE TABLE IF NOT EXISTS "Flows" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    description VARCHAR(255) DEFAULT '',
    is_activated BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE TABLE IF NOT EXISTS "Registries" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    url VARCHAR(255),
    is_public BOOLEAN,
    user_name TEXT,
    password TEXT,
    user_email TEXT
);


CREATE TABLE IF NOT EXISTS "CatalogItems" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    description VARCHAR(255),
    category TEXT,
    config_example VARCHAR(255) DEFAULT '{}',
    publisher TEXT,
    disk_required BIGINT DEFAULT 0,
    ram_required BIGINT DEFAULT 0,
    picture VARCHAR(255) DEFAULT 'images/shared/default.png',
    is_public BOOLEAN DEFAULT false,
    registry_id INT,
    FOREIGN KEY (registry_id) REFERENCES "Registries" (id) ON DELETE SET NULL
);

CREATE INDEX idx_catalog_item_registry_id ON "CatalogItems" (registry_id);


CREATE TABLE IF NOT EXISTS "FogTypes" (
    id INT PRIMARY KEY,
    name TEXT,
    image TEXT,
    description TEXT,
    network_catalog_item_id INT,
    hal_catalog_item_id INT,
    bluetooth_catalog_item_id INT,
    FOREIGN KEY (network_catalog_item_id) REFERENCES "CatalogItems" (id) ON DELETE CASCADE,
    FOREIGN KEY (hal_catalog_item_id) REFERENCES "CatalogItems" (id) ON DELETE CASCADE,
    FOREIGN KEY (bluetooth_catalog_item_id) REFERENCES "CatalogItems" (id) ON DELETE CASCADE
);

CREATE INDEX idx_fog_type_network_catalog_item_id ON "FogTypes" (network_catalog_item_id);
CREATE INDEX idx_fog_type_hal_catalog_item_id ON "FogTypes" (hal_catalog_item_id);
CREATE INDEX idx_fog_type_bluetooth_catalog_item_id ON "FogTypes" (bluetooth_catalog_item_id);


CREATE TABLE IF NOT EXISTS "Fogs" (
    uuid VARCHAR(36) PRIMARY KEY NOT NULL,
    name VARCHAR(255) DEFAULT 'Unnamed ioFog 1',
    location TEXT,
    gps_mode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    description TEXT,
    last_active BIGINT,
    daemon_status VARCHAR(36) DEFAULT 'NOT_PROVISIONED',
    daemon_operating_duration BIGINT DEFAULT 0,
    daemon_last_start BIGINT,
    memory_usage DOUBLE PRECISION DEFAULT 0.000,
    disk_usage DOUBLE PRECISION DEFAULT 0.000,
    cpu_usage DOUBLE PRECISION DEFAULT 0.00,
    memory_violation TEXT,
    disk_violation TEXT,
    cpu_violation TEXT,
    system_available_disk BIGINT,
    system_available_memory BIGINT,
    system_total_cpu DOUBLE PRECISION,
    security_status VARCHAR(36) DEFAULT 'OK',
    security_violation_info VARCHAR(36) DEFAULT 'No violation',
    catalog_item_status TEXT,
    repository_count BIGINT DEFAULT 0,
    repository_status TEXT,
    system_time BIGINT,
    last_status_time BIGINT,
    ip_address VARCHAR(36) DEFAULT '0.0.0.0',
    ip_address_external VARCHAR(36) DEFAULT '0.0.0.0',
    host VARCHAR(36),
    processed_messages BIGINT DEFAULT 0,
    catalog_item_message_counts TEXT,
    message_speed DOUBLE PRECISION DEFAULT 0.000,
    last_command_time BIGINT,
    network_interface VARCHAR(36) DEFAULT 'dynamic',
    docker_url VARCHAR(255) DEFAULT 'unix:///var/run/docker.sock',
    disk_limit DOUBLE PRECISION DEFAULT 50,
    disk_directory VARCHAR(255) DEFAULT '/var/lib/iofog-agent/',
    memory_limit DOUBLE PRECISION DEFAULT 4096,
    cpu_limit DOUBLE PRECISION DEFAULT 80,
    log_limit DOUBLE PRECISION DEFAULT 10,
    log_directory VARCHAR(255) DEFAULT '/var/log/iofog/',
    bluetooth BOOLEAN DEFAULT FALSE,
    hal BOOLEAN DEFAULT FALSE,
    log_file_count BIGINT DEFAULT 10,
    version TEXT,
    is_ready_to_upgrade BOOLEAN DEFAULT TRUE,
    is_ready_to_rollback BOOLEAN DEFAULT FALSE,
    status_frequency INT DEFAULT 10,
    change_frequency INT DEFAULT 20,
    device_scan_frequency INT DEFAULT 20,
    tunnel VARCHAR(255) DEFAULT '',
    isolated_docker_container BOOLEAN DEFAULT FALSE,
    docker_pruning_freq INT DEFAULT 0,
    available_disk_threshold DOUBLE PRECISION DEFAULT 20,
    log_level VARCHAR(10) DEFAULT 'INFO',
    is_system BOOLEAN DEFAULT FALSE,
    router_id INT DEFAULT 0,
    time_zone VARCHAR(36) DEFAULT 'Etc/UTC',
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    fog_type_id INT DEFAULT 0,
    FOREIGN KEY (fog_type_id) REFERENCES "FogTypes" (id)
);

CREATE INDEX idx_fog_fog_type_id ON "Fogs" (fog_type_id);

CREATE TABLE IF NOT EXISTS "ChangeTrackings" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    microservice_config BOOLEAN DEFAULT false,
    reboot BOOLEAN DEFAULT false,
    deletenode BOOLEAN DEFAULT false,
    version BOOLEAN DEFAULT false,
    microservice_list BOOLEAN DEFAULT false,
    config BOOLEAN DEFAULT false,
    registries BOOLEAN DEFAULT false,
    tunnel BOOLEAN DEFAULT false,
    diagnostics BOOLEAN DEFAULT false,
    router_changed BOOLEAN DEFAULT false,
    image_snapshot BOOLEAN DEFAULT false,
    prune BOOLEAN DEFAULT false,
    linked_edge_resources BOOLEAN DEFAULT false,
    last_updated VARCHAR(255) DEFAULT false,
    iofog_uuid VARCHAR(36),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_change_tracking_iofog_uuid ON "ChangeTrackings" (iofog_uuid);

CREATE TABLE IF NOT EXISTS "FogAccessTokens" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    expiration_time BIGINT,
    token TEXT,
    iofog_uuid VARCHAR(36),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_fog_access_tokens_iofogUuid ON "FogAccessTokens" (iofog_uuid);

CREATE TABLE IF NOT EXISTS "FogProvisionKeys" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    provisioning_string VARCHAR(100),
    expiration_time BIGINT,
    iofog_uuid VARCHAR(36),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_fog_provision_keys_iofogUuid ON "FogProvisionKeys" (iofog_uuid);

CREATE TABLE IF NOT EXISTS "FogVersionCommands" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    version_command VARCHAR(100),
    iofog_uuid VARCHAR(36),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_fog_version_commands_iofogUuid ON "FogVersionCommands" (iofog_uuid);

CREATE TABLE IF NOT EXISTS "HWInfos" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    info TEXT,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    iofog_uuid VARCHAR(36),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_hw_infos_iofogUuid ON "HWInfos" (iofog_uuid);

CREATE TABLE IF NOT EXISTS "USBInfos" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    info TEXT,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    iofog_uuid VARCHAR(36),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_usb_infos_iofogUuid ON "USBInfos" (iofog_uuid);

CREATE TABLE IF NOT EXISTS "Tunnels" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    username TEXT,
    password TEXT,
    host TEXT,
    remote_port INT,
    local_port INT DEFAULT 22,
    rsa_key TEXT,
    closed BOOLEAN DEFAULT false,
    iofog_uuid VARCHAR(36),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_tunnels_iofogUuid ON "Tunnels" (iofog_uuid);

CREATE TABLE IF NOT EXISTS "Microservices" (
    uuid VARCHAR(36) PRIMARY KEY NOT NULL,
    config TEXT,
    name VARCHAR(255) DEFAULT 'New Microservice',
    config_last_updated BIGINT,
    rebuild BOOLEAN DEFAULT false,
    root_host_access BOOLEAN DEFAULT false,
    log_size BIGINT DEFAULT 0,
    image_snapshot VARCHAR(255) DEFAULT '',
    delete BOOLEAN DEFAULT false,
    delete_with_cleanup BOOLEAN DEFAULT false,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    catalog_item_id INT,
    registry_id INT DEFAULT 1,
    iofog_uuid VARCHAR(36),
    application_id INT,
    FOREIGN KEY (catalog_item_id) REFERENCES "CatalogItems" (id) ON DELETE CASCADE,
    FOREIGN KEY (registry_id) REFERENCES "Registries" (id) ON DELETE SET NULL,
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES "Flows" (id) ON DELETE CASCADE
);

CREATE INDEX idx_microservices_catalogItemId ON "Microservices" (catalog_item_id);
CREATE INDEX idx_microservices_registryId ON "Microservices" (registry_id);
CREATE INDEX idx_microservices_iofogUuid ON "Microservices" (iofog_uuid);
CREATE INDEX idx_microservices_applicationId ON "Microservices" (application_id);

CREATE TABLE IF NOT EXISTS "MicroserviceArgs" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    cmd TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_args_microserviceUuid ON "MicroserviceArgs" (microservice_uuid);

CREATE TABLE IF NOT EXISTS "MicroserviceEnvs" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    key TEXT,
    value TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_envs_microserviceUuid ON "MicroserviceEnvs" (microservice_uuid);

CREATE TABLE IF NOT EXISTS "MicroserviceExtraHost" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    template_type TEXT,
    name TEXT,
    public_port INT,
    template TEXT,
    value TEXT,
    microservice_uuid VARCHAR(36),
    target_microservice_uuid VARCHAR(36),
    target_fog_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (target_microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (target_fog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_extra_host_microserviceUuid ON "MicroserviceExtraHost" (microservice_uuid);
CREATE INDEX idx_microservice_extra_host_targetMicroserviceUuid ON "MicroserviceExtraHost" (target_microservice_uuid);
CREATE INDEX idx_microservice_extra_host_targetFogUuid ON "MicroserviceExtraHost" (target_fog_uuid);

CREATE TABLE IF NOT EXISTS "MicroservicePorts" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    port_internal INT,
    port_external INT,
    is_udp BOOLEAN,
    is_public BOOLEAN,
    is_proxy BOOLEAN,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_port_microserviceUuid ON "MicroservicePorts" (microservice_uuid);

CREATE TABLE IF NOT EXISTS "MicroservicePublicPorts" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    port_id INT UNIQUE,
    host_id VARCHAR(255) UNIQUE,
    local_proxy_id TEXT,
    remote_proxy_id TEXT,
    public_port INT,
    queue_name TEXT,
    schemes VARCHAR(255) DEFAULT '["https"]',
    is_tcp BOOLEAN DEFAULT false,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    protocol VARCHAR(255) GENERATED ALWAYS AS (CASE WHEN is_tcp THEN 'tcp' ELSE 'http' END) STORED,
    FOREIGN KEY (port_id) REFERENCES "MicroservicePorts" (id) ON DELETE CASCADE,
    FOREIGN KEY (host_id) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_public_port_portId ON "MicroservicePublicPorts" (port_id);
CREATE INDEX idx_microservice_public_port_hostId ON "MicroservicePublicPorts" (host_id);


CREATE TABLE IF NOT EXISTS "MicroserviceStatuses" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    status VARCHAR(255) DEFAULT 'QUEUED',
    operating_duration BIGINT DEFAULT 0,
    start_time BIGINT DEFAULT 0,
    cpu_usage DOUBLE PRECISION DEFAULT 0.000,
    memory_usage BIGINT DEFAULT 0,
    container_id VARCHAR(255) DEFAULT '',
    percentage DOUBLE PRECISION DEFAULT 0.00,
    error_message TEXT,
    microservice_uuid VARCHAR(36),
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_status_microserviceUuid ON "MicroserviceStatuses" (microservice_uuid);

CREATE TABLE IF NOT EXISTS "StraceDiagnostics" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    strace_run BOOLEAN,
    buffer VARCHAR(255) DEFAULT '',
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_strace_diagnostics_microserviceUuid ON "StraceDiagnostics" (microservice_uuid);

CREATE TABLE IF NOT EXISTS "VolumeMappings" (
    uuid INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    host_destination TEXT,
    container_destination TEXT,
    access_mode TEXT,
    type TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_volume_mappings_microserviceUuid ON "VolumeMappings" (microservice_uuid);


CREATE TABLE IF NOT EXISTS "CatalogItemImages" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    container_image TEXT,
    catalog_item_id INT,
    microservice_uuid VARCHAR(36),
    fog_type_id INT,
    FOREIGN KEY (catalog_item_id) REFERENCES "CatalogItems" (id) ON DELETE CASCADE,
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (fog_type_id) REFERENCES "FogTypes" (id) ON DELETE CASCADE
);

CREATE INDEX idx_catalog_item_image_catalog_item_id ON "CatalogItemImages" (catalog_item_id);
CREATE INDEX idx_catalog_item_image_microservice_uuid ON "CatalogItemImages" (microservice_uuid);
CREATE INDEX idx_catalog_item_image_fog_type_id ON "CatalogItemImages" (fog_type_id);

CREATE TABLE IF NOT EXISTS "CatalogItemInputTypes" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    info_type TEXT,
    info_format TEXT,
    catalog_item_id INT,
    FOREIGN KEY (catalog_item_id) REFERENCES "CatalogItems" (id) ON DELETE CASCADE
);

CREATE INDEX idx_catalog_item_input_type_catalog_item_id ON "CatalogItemInputTypes" (catalog_item_id);

CREATE TABLE IF NOT EXISTS "CatalogItemOutputTypes" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    info_type TEXT,
    info_format TEXT,
    catalog_item_id INT,
    FOREIGN KEY (catalog_item_id) REFERENCES "CatalogItems" (id) ON DELETE CASCADE
);

CREATE INDEX idx_catalog_item_output_type_catalog_item_id ON "CatalogItemOutputTypes" (catalog_item_id);


CREATE TABLE IF NOT EXISTS "Routers" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    is_edge BOOLEAN DEFAULT true,
    messaging_port INT DEFAULT 5671,
    edge_router_port INT,
    inter_router_port INT,
    host TEXT,
    is_default BOOLEAN DEFAULT false,
    iofog_uuid VARCHAR(36),
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
    
);

CREATE INDEX idx_router_iofogUuid ON "Routers" (iofog_uuid);


CREATE TABLE "RouterConnections" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_router INT,
    dest_router INT,
    created_at TIMESTAMP(0) NOT NULL,
    updated_at TIMESTAMP(0) NOT NULL,
    FOREIGN KEY (source_router) REFERENCES "Routers"(id) ON DELETE CASCADE,
    FOREIGN KEY (dest_router) REFERENCES "Routers"(id) ON DELETE CASCADE
);

CREATE INDEX idx_routerconnections_sourceRouter ON "RouterConnections" (source_router);
CREATE INDEX idx_routerconnections_destRouter ON "RouterConnections" (dest_router);



CREATE TABLE IF NOT EXISTS "Config" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    key VARCHAR(255) NOT NULL UNIQUE,
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE INDEX idx_config_key ON "Config" (key);


CREATE TABLE IF NOT EXISTS "Tags" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    value VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS "IofogTags" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    fog_uuid VARCHAR(36),
    tag_id INT,
    FOREIGN KEY (fog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES "Tags" (id) ON DELETE CASCADE
);

CREATE INDEX idx_iofogtags_fog_uuid ON "IofogTags" (fog_uuid);
CREATE INDEX idx_iofogtags_tag_id ON "IofogTags" (tag_id);

CREATE TABLE IF NOT EXISTS "EdgeResources" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL,
    version TEXT,
    description TEXT,
    display_name TEXT,
    display_color TEXT,
    display_icon TEXT,
    interface_protocol TEXT,
    interface_id INT,
    custom TEXT
);


CREATE TABLE IF NOT EXISTS "AgentEdgeResources" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    fog_uuid VARCHAR(36),
    edge_resource_id INT,
    FOREIGN KEY (fog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (edge_resource_id) REFERENCES "EdgeResources" (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "EdgeResourceOrchestrationTags" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    edge_resource_id INT,
    tag_id INT,
    FOREIGN KEY (edge_resource_id) REFERENCES "EdgeResources" (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES "Tags" (id) ON DELETE CASCADE
);

CREATE INDEX idx_agentedgeresources_fog_id ON "AgentEdgeResources" (fog_uuid);
CREATE INDEX idx_agentedgeresources_edge_resource_id ON "AgentEdgeResources" (edge_resource_id);
CREATE INDEX idx_edgeresourceorchestrationtags_edge_resource_id ON "EdgeResourceOrchestrationTags" (edge_resource_id);
CREATE INDEX idx_edgeresourceorchestrationtags_tag_id ON "EdgeResourceOrchestrationTags" (tag_id);

CREATE TABLE IF NOT EXISTS "HTTPBasedResourceInterfaces" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    edge_resource_id INT,
    FOREIGN KEY (edge_resource_id) REFERENCES "EdgeResources" (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "HTTPBasedResourceInterfaceEndpoints" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    interface_id INT,
    name TEXT,
    description TEXT,
    method TEXT,
    url TEXT,
    requestType TEXT,
    responseType TEXT,
    requestPayloadExample TEXT,
    responsePayloadExample TEXT,
    FOREIGN KEY (interface_id) REFERENCES "HTTPBasedResourceInterfaces" (id) ON DELETE CASCADE
);

CREATE INDEX idx_httpbasedresourceinterfaces_edge_resource_id ON "HTTPBasedResourceInterfaces" (edge_resource_id);
CREATE INDEX idx_httpbasedresourceinterfaceendpoints_interface_id ON "HTTPBasedResourceInterfaceEndpoints" (interface_id);


CREATE TABLE IF NOT EXISTS "ApplicationTemplates" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL DEFAULT 'new-application',
    description VARCHAR(255) DEFAULT '',
    schema_version VARCHAR(255) DEFAULT '',
    application_json TEXT,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)

);


CREATE TABLE IF NOT EXISTS "ApplicationTemplateVariables" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    application_template_id INT NOT NULL,
    key TEXT,
    description VARCHAR(255) DEFAULT '',
    default_value VARCHAR(255),
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (application_template_id) REFERENCES "ApplicationTemplates" (id) ON DELETE CASCADE
);

CREATE INDEX idx_applicationtemplatevariables_application_template_id ON "ApplicationTemplateVariables" (application_template_id);

CREATE TABLE IF NOT EXISTS "MicroserviceCdiDevices" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    cdi_devices TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_cdiDevices_microserviceUuid ON "MicroserviceCdiDevices" (microservice_uuid);

ALTER TABLE "Microservices"
ADD COLUMN run_as_user TEXT DEFAULT NULL,
ADD COLUMN platform TEXT DEFAULT NULL,
ADD COLUMN runtime TEXT DEFAULT NULL;


CREATE TABLE IF NOT EXISTS "MicroservicePubTags" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    microservice_uuid VARCHAR(36),
    tag_id INT,
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES "Tags" (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MicroserviceSubTags" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    microservice_uuid VARCHAR(36),
    tag_id INT,
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES "Tags" (id) ON DELETE CASCADE
);

CREATE INDEX idx_microservicepubtags_microservice_uuid ON "MicroservicePubTags" (microservice_uuid);
CREATE INDEX idx_microservicesubtags_microservice_uuid ON "MicroserviceSubTags" (microservice_uuid);
CREATE INDEX idx_microservicepubtags_tag_id ON "MicroservicePubTags" (tag_id);
CREATE INDEX idx_microservicesubtags_tag_id ON "MicroserviceSubTags" (tag_id);

CREATE TABLE IF NOT EXISTS "MicroserviceCapAdd" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    cap_add TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_capAdd_microserviceUuid ON "MicroserviceCapAdd" (microservice_uuid);

CREATE TABLE IF NOT EXISTS "MicroserviceCapDrop" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    cap_drop TEXT,
    microservice_uuid VARCHAR(36),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_capDrop_microserviceUuid ON "MicroserviceCapDrop" (microservice_uuid);

ALTER TABLE "Microservices" 
ADD COLUMN annotations TEXT;

CREATE TABLE IF NOT EXISTS "FogPublicKeys" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    public_key TEXT,
    iofog_uuid VARCHAR(36),
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_fog_public_keys_iofogUuid ON "FogPublicKeys" (iofog_uuid);

CREATE TABLE IF NOT EXISTS "FogUsedTokens" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    jti VARCHAR(255) NOT NULL,
    iofog_uuid VARCHAR(36),
    expiry_time BIGINT NOT NULL,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_fog_used_tokens_iofogUuid ON "FogUsedTokens" (iofog_uuid);

ALTER TABLE "MicroserviceStatuses"
ADD COLUMN ip_address TEXT;

DROP TABLE IF EXISTS "FogAccessTokens";

CREATE TABLE IF NOT EXISTS "Secrets" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Opaque', 'tls')),
    data TEXT NOT NULL,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE INDEX idx_secrets_name ON "Secrets" (name);

CREATE TABLE IF NOT EXISTS "Certificates" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    is_ca BOOLEAN DEFAULT false,
    signed_by_id INT,
    hosts TEXT,
    valid_from TIMESTAMP(0) NOT NULL,
    valid_to TIMESTAMP(0) NOT NULL,
    serial_number TEXT NOT NULL,
    secret_id INT,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (signed_by_id) REFERENCES "Certificates" (id) ON DELETE SET NULL,
    FOREIGN KEY (secret_id) REFERENCES "Secrets" (id) ON DELETE CASCADE
);

CREATE INDEX idx_certificates_name ON "Certificates" (name);
CREATE INDEX idx_certificates_valid_to ON "Certificates" (valid_to);
CREATE INDEX idx_certificates_is_ca ON "Certificates" (is_ca);
CREATE INDEX idx_certificates_signed_by_id ON "Certificates" (signed_by_id);
CREATE INDEX idx_certificates_secret_id ON "Certificates" (secret_id);

CREATE TABLE IF NOT EXISTS "Services" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    resource TEXT NOT NULL,
    target_port INTEGER NOT NULL,
    service_port INTEGER,
    k8s_type TEXT,
    bridge_port INTEGER,
    default_bridge TEXT,
    service_endpoint TEXT,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE INDEX idx_services_name ON "Services" (name);
CREATE INDEX idx_services_id ON "Services" (id);

CREATE TABLE IF NOT EXISTS "ServiceTags" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    service_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (service_id) REFERENCES "Services" (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES "Tags" (id) ON DELETE CASCADE
);

CREATE INDEX idx_service_tags_service_id ON "ServiceTags" (service_id);
CREATE INDEX idx_service_tags_tag_id ON "ServiceTags" (tag_id);


ALTER TABLE "Fogs" ADD COLUMN container_engine VARCHAR(36);
ALTER TABLE "Fogs" ADD COLUMN deployment_type VARCHAR(36);

ALTER TABLE "MicroserviceExtraHost" DROP COLUMN IF EXISTS public_port;
ALTER TABLE "MicroservicePorts" DROP COLUMN IF EXISTS is_public;
ALTER TABLE "MicroservicePorts" DROP COLUMN IF EXISTS is_proxy;

DROP TABLE IF EXISTS "MicroservicePublicPorts";

ALTER TABLE "MicroserviceEnvs" ADD COLUMN value_from_secret TEXT;
ALTER TABLE "MicroserviceEnvs" ADD COLUMN value_from_config_map TEXT;

CREATE TABLE IF NOT EXISTS "ConfigMaps" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    immutable BOOLEAN DEFAULT false,
    data TEXT NOT NULL,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE INDEX idx_config_maps_name ON "ConfigMaps" (name);

CREATE TABLE IF NOT EXISTS "VolumeMounts" (
    uuid VARCHAR(36) PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL,
    config_map_name VARCHAR(255),
    secret_name VARCHAR(255),
    version INT DEFAULT 1,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (config_map_name) REFERENCES "ConfigMaps" (name) ON DELETE CASCADE,
    FOREIGN KEY (secret_name) REFERENCES "Secrets" (name) ON DELETE CASCADE    
);

CREATE INDEX idx_volume_mounts_uuid ON "VolumeMounts" (uuid);
CREATE INDEX idx_volume_mounts_config_map_name ON "VolumeMounts" (config_map_name);
CREATE INDEX idx_volume_mounts_secret_name ON "VolumeMounts" (secret_name);

CREATE TABLE IF NOT EXISTS "FogVolumeMounts" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    fog_uuid VARCHAR(36),
    volume_mount_uuid VARCHAR(36),
    FOREIGN KEY (fog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE,
    FOREIGN KEY (volume_mount_uuid) REFERENCES "VolumeMounts" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_fog_volume_mounts_fog_uuid ON "FogVolumeMounts" (fog_uuid);
CREATE INDEX idx_fog_volume_mounts_volume_mount_uuid ON "FogVolumeMounts" (volume_mount_uuid);

ALTER TABLE "Fogs" ADD COLUMN active_volume_mounts BIGINT DEFAULT 0;
ALTER TABLE "Fogs" ADD COLUMN volume_mount_last_update BIGINT DEFAULT 0;

ALTER TABLE "ChangeTrackings" ADD COLUMN volume_mounts BOOLEAN DEFAULT false;
ALTER TABLE "ChangeTrackings" ADD COLUMN exec_sessions BOOLEAN DEFAULT false;

ALTER TABLE "Services" ADD COLUMN provisioning_status VARCHAR(36) DEFAULT 'pending';
ALTER TABLE "Services" ADD COLUMN provisioning_error TEXT;

ALTER TABLE "Fogs" ADD COLUMN warning_message TEXT DEFAULT 'HEALTHY';
ALTER TABLE "Fogs" ADD COLUMN gps_device VARCHAR(36);
ALTER TABLE "Fogs" ADD COLUMN gps_scan_frequency INT DEFAULT 60;
ALTER TABLE "Fogs" ADD COLUMN edge_guard_frequency INT DEFAULT 0;

ALTER TABLE "Microservices" ADD COLUMN pid_mode VARCHAR(36);
ALTER TABLE "Microservices" ADD COLUMN ipc_mode VARCHAR(36);
ALTER TABLE "Microservices" ADD COLUMN exec_enabled BOOLEAN DEFAULT false;

ALTER TABLE "MicroserviceStatuses" ADD COLUMN exec_session_ids TEXT;

ALTER TABLE "Microservices" ADD COLUMN schedule INT DEFAULT 50;

CREATE TABLE IF NOT EXISTS "MicroserviceExecStatuses" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    status VARCHAR(255) DEFAULT 'INACTIVE',
    exec_session_id VARCHAR(255),
    microservice_uuid VARCHAR(36),
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_exec_status_microservice_uuid ON "MicroserviceExecStatuses" (microservice_uuid);

ALTER TABLE "Fogs" ADD COLUMN gps_status VARCHAR(32);

ALTER TABLE "Microservices" ADD COLUMN cpu_set_cpus TEXT;
ALTER TABLE "Microservices" ADD COLUMN memory_limit DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "MicroserviceHealthChecks" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    test TEXT,
    interval DOUBLE PRECISION,
    timeout DOUBLE PRECISION,
    start_period DOUBLE PRECISION,
    start_interval DOUBLE PRECISION,
    retries INT,
    microservice_uuid VARCHAR(36),
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_health_check_microservice_uuid ON "MicroserviceHealthChecks" (microservice_uuid);

ALTER TABLE "MicroserviceStatuses" ADD COLUMN health_status TEXT;

ALTER TABLE "Microservices" ADD COLUMN is_activated BOOLEAN DEFAULT true;

ALTER TABLE "Microservices" ADD COLUMN host_network_mode BOOLEAN DEFAULT false;
ALTER TABLE "Microservices" ADD COLUMN is_privileged BOOLEAN DEFAULT false;
ALTER TABLE "Microservices" DROP COLUMN root_host_access;

CREATE TABLE IF NOT EXISTS "Events" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    timestamp BIGINT NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    endpoint_type VARCHAR(10) NOT NULL,
    actor_id VARCHAR(255),
    method VARCHAR(10),
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    endpoint_path TEXT NOT NULL,
    ip_address VARCHAR(45),
    status VARCHAR(20) NOT NULL,
    status_code INT,
    status_message TEXT,
    request_id VARCHAR(255),
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);


CREATE INDEX idx_events_timestamp ON "Events" (timestamp);
CREATE INDEX idx_events_endpoint_type ON "Events" (endpoint_type);
CREATE INDEX idx_events_actor_id ON "Events" (actor_id);
CREATE INDEX idx_events_resource_type ON "Events" (resource_type);
CREATE INDEX idx_events_status ON "Events" (status);
CREATE INDEX idx_events_method ON "Events" (method);
CREATE INDEX idx_events_event_type ON "Events" (event_type);
CREATE INDEX idx_events_created_at ON "Events" (created_at);

ALTER TABLE "ConfigMaps" ADD COLUMN use_vault BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS "MicroserviceLogStatuses" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    microservice_uuid VARCHAR(36),
    log_session_id TEXT,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    status TEXT,
    tail_config TEXT,
    agent_connected BOOLEAN DEFAULT false,
    user_connected BOOLEAN DEFAULT false,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_microservice_log_status_microservice_uuid ON "MicroserviceLogStatuses" (microservice_uuid);
CREATE INDEX idx_microservice_log_status_session_id ON "MicroserviceLogStatuses" (session_id);

CREATE TABLE IF NOT EXISTS "FogLogStatuses" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    iofog_uuid VARCHAR(36),
    log_session_id TEXT,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    status TEXT,
    tail_config TEXT,
    agent_connected BOOLEAN DEFAULT false,
    user_connected BOOLEAN DEFAULT false,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE INDEX idx_fog_log_status_iofog_uuid ON "FogLogStatuses" (iofog_uuid);
CREATE INDEX idx_fog_log_status_session_id ON "FogLogStatuses" (session_id);

ALTER TABLE "ChangeTrackings" ADD COLUMN microservice_logs BOOLEAN DEFAULT false;
ALTER TABLE "ChangeTrackings" ADD COLUMN fog_logs BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS "RbacRoles" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    kind TEXT DEFAULT 'Role',
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE TABLE IF NOT EXISTS "RbacRoleRules" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id INT NOT NULL,
    api_groups TEXT NOT NULL,
    resources TEXT NOT NULL,
    verbs TEXT NOT NULL,
    resource_names TEXT,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (role_id) REFERENCES "RbacRoles" (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "RbacRoleBindings" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    kind TEXT DEFAULT 'RoleBinding',
    role_ref TEXT NOT NULL,
    subjects TEXT NOT NULL,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE TABLE IF NOT EXISTS "RbacServiceAccounts" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    role_ref TEXT,
    role_id INT REFERENCES "RbacRoles" (id),
    microservice_uuid VARCHAR(36) REFERENCES "Microservices" (uuid) ON DELETE CASCADE,
    application_id INT REFERENCES "Flows" (id) ON DELETE SET NULL,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE INDEX idx_rbac_role_rules_role_id ON "RbacRoleRules" (role_id);
CREATE INDEX idx_rbac_roles_name ON "RbacRoles" (name);
CREATE INDEX idx_rbac_role_bindings_name ON "RbacRoleBindings" (name);
CREATE INDEX idx_rbac_service_accounts_name ON "RbacServiceAccounts" (name);

CREATE TABLE IF NOT EXISTS "RbacCacheVersion" (
    id INT PRIMARY KEY DEFAULT 1,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    CONSTRAINT single_row CHECK (id = 1)
);


ALTER TABLE "RbacRoleBindings" ADD COLUMN role_id INT;
CREATE INDEX idx_rbac_role_bindings_role_id ON "RbacRoleBindings" (role_id);
ALTER TABLE "RbacRoleBindings" ADD CONSTRAINT fk_rbac_role_bindings_role_id FOREIGN KEY (role_id) REFERENCES "RbacRoles" (id);

CREATE INDEX idx_rbac_service_accounts_role_id ON "RbacServiceAccounts" (role_id);
CREATE UNIQUE INDEX idx_rbac_service_accounts_microservice_uuid_unique ON "RbacServiceAccounts" (microservice_uuid) WHERE microservice_uuid IS NOT NULL;
CREATE UNIQUE INDEX idx_rbac_service_accounts_application_id_name_unique ON "RbacServiceAccounts" (application_id, name);


CREATE TABLE IF NOT EXISTS "ClusterControllers" (
    uuid VARCHAR(36) PRIMARY KEY NOT NULL,
    host VARCHAR(255),
    process_id INT,
    last_heartbeat TIMESTAMP(0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE INDEX idx_cluster_controllers_uuid ON "ClusterControllers" (uuid);
CREATE INDEX idx_cluster_controllers_host ON "ClusterControllers" (host);
CREATE INDEX idx_cluster_controllers_active ON "ClusterControllers" (is_active, last_heartbeat);

ALTER TABLE "Fogs" ADD COLUMN nats_id INT;

CREATE TABLE IF NOT EXISTS "NatsOperators" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    jwt TEXT NOT NULL,
    seed_secret_name TEXT NOT NULL,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE TABLE IF NOT EXISTS "NatsAccounts" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    public_key TEXT NOT NULL,
    jwt TEXT NOT NULL,
    seed_secret_name TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false,
    is_leaf_system BOOLEAN DEFAULT false,
    operator_id INT NOT NULL,
    application_id INT,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (operator_id) REFERENCES "NatsOperators" (id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES "Flows" (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "NatsUsers" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    public_key TEXT NOT NULL,
    jwt TEXT NOT NULL,
    creds_secret_name TEXT NOT NULL,
    is_bearer BOOLEAN DEFAULT false,
    account_id INT NOT NULL,
    microservice_uuid VARCHAR(36),
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (account_id) REFERENCES "NatsAccounts" (id) ON DELETE CASCADE,
    FOREIGN KEY (microservice_uuid) REFERENCES "Microservices" (uuid) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "NatsInstances" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    iofog_uuid VARCHAR(36),
    is_leaf BOOLEAN DEFAULT true,
    is_hub BOOLEAN DEFAULT false,
    host TEXT,
    server_port INT,
    leaf_port INT,
    cluster_port INT,
    mqtt_port INT,
    http_port INT,
    configmap_name TEXT,
    jwt_dir_mount_name TEXT,
    cert_secret_name TEXT,
    js_storage_size TEXT,
    js_memory_store_size TEXT,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (iofog_uuid) REFERENCES "Fogs" (uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "NatsConnections" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    source_nats INT NOT NULL,
    dest_nats INT NOT NULL,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0),
    FOREIGN KEY (source_nats) REFERENCES "NatsInstances" (id) ON DELETE CASCADE,
    FOREIGN KEY (dest_nats) REFERENCES "NatsInstances" (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "NatsReconcileTasks" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    reason VARCHAR(64) NOT NULL,
    application_id INT,
    account_rule_id INT,
    user_rule_id INT,
    fog_uuids TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    leader_uuid VARCHAR(36),
    claimed_at TIMESTAMP(0),
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE TABLE IF NOT EXISTS "NatsAccountRules" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    info_url TEXT,
    max_connections INT,
    max_leaf_node_connections INT,
    max_data BIGINT,
    max_exports INT,
    max_imports INT,
    max_msg_payload INT,
    max_subscriptions INT,
    exports_allow_wildcards BOOLEAN DEFAULT true,
    disallow_bearer BOOLEAN,
    response_permissions TEXT,
    resp_max INT,
    resp_ttl BIGINT,
    imports TEXT,
    exports TEXT,
    mem_storage BIGINT,
    disk_storage BIGINT,
    streams INT,
    consumer INT,
    max_ack_pending INT,
    mem_max_stream_bytes BIGINT,
    disk_max_stream_bytes BIGINT,
    max_bytes_required BOOLEAN,
    tiered_limits TEXT,
    pub_allow TEXT,
    pub_deny TEXT,
    sub_allow TEXT,
    sub_deny TEXT,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE TABLE IF NOT EXISTS "NatsUserRules" (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    max_subscriptions INT,
    max_payload INT,
    max_data BIGINT,
    bearer_token BOOLEAN DEFAULT false,
    proxy_required BOOLEAN,
    allowed_connection_types TEXT,
    src TEXT,
    times TEXT,
    times_location TEXT,
    resp_max INT,
    resp_ttl BIGINT,
    pub_allow TEXT,
    pub_deny TEXT,
    sub_allow TEXT,
    sub_deny TEXT,
    tags TEXT,
    created_at TIMESTAMP(0),
    updated_at TIMESTAMP(0)
);

CREATE UNIQUE INDEX idx_nats_accounts_application_id_unique ON "NatsAccounts" (application_id) WHERE application_id IS NOT NULL;
CREATE INDEX idx_nats_accounts_application_id ON "NatsAccounts" (application_id);
CREATE UNIQUE INDEX idx_nats_users_account_id_name ON "NatsUsers" (account_id, name);
CREATE INDEX idx_nats_users_account_id ON "NatsUsers" (account_id);
CREATE INDEX idx_nats_users_microservice_uuid ON "NatsUsers" (microservice_uuid);
ALTER TABLE "NatsUsers" ADD COLUMN nats_user_rule_id INT NULL;
CREATE INDEX idx_nats_users_nats_user_rule_id ON "NatsUsers" (nats_user_rule_id);
ALTER TABLE "NatsUsers" ADD CONSTRAINT fk_nats_users_nats_user_rule_id FOREIGN KEY (nats_user_rule_id) REFERENCES "NatsUserRules" (id) ON DELETE SET NULL;
CREATE UNIQUE INDEX idx_nats_instances_iofog_uuid_unique ON "NatsInstances" (iofog_uuid);
CREATE INDEX idx_nats_instances_iofog_uuid ON "NatsInstances" (iofog_uuid);
CREATE UNIQUE INDEX idx_nats_connections_source_dest_unique ON "NatsConnections" (source_nats, dest_nats);
CREATE INDEX idx_nats_connections_source_nats ON "NatsConnections" (source_nats);
CREATE INDEX idx_nats_connections_dest_nats ON "NatsConnections" (dest_nats);
CREATE INDEX idx_nats_account_rules_name ON "NatsAccountRules" (name);
CREATE INDEX idx_nats_user_rules_name ON "NatsUserRules" (name);
CREATE INDEX idx_nats_reconcile_tasks_status_claimed ON "NatsReconcileTasks" (status, claimed_at);

ALTER TABLE "Flows" ADD COLUMN nats_access BOOLEAN DEFAULT false;
ALTER TABLE "Flows" ADD COLUMN nats_rule_id INT;
ALTER TABLE "Microservices" ADD COLUMN nats_rule_id INT;
ALTER TABLE "Microservices" ADD COLUMN nats_access BOOLEAN DEFAULT false;
ALTER TABLE "Microservices" ADD COLUMN nats_account_id INT;
ALTER TABLE "Microservices" ADD COLUMN nats_user_id INT;
ALTER TABLE "Microservices" ADD COLUMN nats_creds_secret_name TEXT;
CREATE INDEX idx_flows_nats_rule_id ON "Flows" (nats_rule_id);
CREATE INDEX idx_microservices_nats_rule_id ON "Microservices" (nats_rule_id);
CREATE INDEX idx_microservices_nats_account_id ON "Microservices" (nats_account_id);
CREATE INDEX idx_microservices_nats_user_id ON "Microservices" (nats_user_id);
ALTER TABLE "Flows" ADD CONSTRAINT fk_flows_nats_rule_id FOREIGN KEY (nats_rule_id) REFERENCES "NatsAccountRules" (id);
ALTER TABLE "Microservices" ADD CONSTRAINT fk_microservices_nats_rule_id FOREIGN KEY (nats_rule_id) REFERENCES "NatsUserRules" (id);
ALTER TABLE "Microservices" ADD CONSTRAINT fk_microservices_nats_account_id FOREIGN KEY (nats_account_id) REFERENCES "NatsAccounts" (id);
ALTER TABLE "Microservices" ADD CONSTRAINT fk_microservices_nats_user_id FOREIGN KEY (nats_user_id) REFERENCES "NatsUsers" (id);
