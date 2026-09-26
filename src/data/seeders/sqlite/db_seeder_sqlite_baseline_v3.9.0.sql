INSERT INTO `Registries` (url, is_public, user_name, password, user_email, type, ca, insecure)
VALUES
    ('docker.io', true, '', '', '', 'oci', NULL, false),
    ('from_cache', true, '', '', '', 'oci', NULL, false),
    ('https://huggingface.co', true, '', '', '', 'hf', NULL, false);

INSERT INTO `CatalogItems` (name, description, category, publisher, disk_required, ram_required, picture, config_example, is_public, registry_id)
VALUES
    ('Router', 'The built-in router for Edgelet.', 'SYSTEM', 'Eclipse ioFog', 0, 0, 'none.png', NULL, false, 1),
    ('Debug', 'The built-in debugger for Edgelet.', 'SYSTEM', 'Eclipse ioFog', 0, 0, 'none.png', NULL, false, 1),
    ('NATS', 'NATS server microservice for Edgelet', 'SYSTEM', 'Eclipse ioFog', 0, 0, 'none.png', NULL, true, 1);

INSERT INTO `Architectures` (id, name, image, description, network_catalog_item_id)
VALUES
    (0, 'auto', 'iointegrator0.png', 'Architecture will be selected on provision', 1),
    (1, 'amd64', 'iointegrator1.png', 'Standard x86_64 Linux. Compatible with common Linux distributions such as Ubuntu, Red Hat, and CentOS.', 1),
    (2, 'arm64', 'iointegrator2.png', '64-bit ARM Linux (aarch64). Microservices for this architecture are built for ARM64 systems.', 1),
    (3, 'riscv64', 'iointegrator3.png', 'RISC-V 64-bit Linux. Microservices for this architecture are built for RISC-V systems.', 1),
    (4, 'arm', 'iointegrator4.png', '32-bit ARM Linux. Microservices for this architecture are built for 32-bit ARM systems.', 1);

UPDATE `Fogs`
SET arch_id = 0
WHERE arch_id IS NULL;

INSERT INTO `CatalogItemImages` (catalog_item_id, arch_id, container_image)
VALUES
    (1, 1, 'ghcr.io/eclipse-iofog/router:latest'),
    (1, 2, 'ghcr.io/eclipse-iofog/router:latest'),
    (1, 3, 'ghcr.io/eclipse-iofog/router:latest'),
    (1, 4, 'ghcr.io/eclipse-iofog/router:latest'),
    (2, 1, 'ghcr.io/eclipse-iofog/debugger:latest'),
    (2, 2, 'ghcr.io/eclipse-iofog/debugger:latest'),
    (2, 3, 'ghcr.io/eclipse-iofog/debugger:latest'),
    (2, 4, 'ghcr.io/eclipse-iofog/debugger:latest'),
    (3, 1, 'ghcr.io/eclipse-iofog/nats:latest'),
    (3, 2, 'ghcr.io/eclipse-iofog/nats:latest'),
    (3, 3, 'ghcr.io/eclipse-iofog/nats:latest'),
    (3, 4, 'ghcr.io/eclipse-iofog/nats:latest');

INSERT OR IGNORE INTO AuthPolicy (
    id,
    min_password_length,
    require_uppercase,
    require_lowercase,
    require_digit,
    password_max_age_days,
    password_history_count,
    max_failed_attempts,
    lockout_duration_minutes,
    access_token_ttl_seconds,
    refresh_token_ttl_seconds,
    refresh_rotation,
    max_concurrent_sessions
)
VALUES (1, 12, true, true, true, 0, 5, 5, 15, 900, 3600, true, NULL);

INSERT OR IGNORE INTO AuthGroups (name, is_system, mfa_required)
VALUES
    ('admin', true, false),
    ('sre', true, false),
    ('developer', true, false),
    ('viewer', true, false);

INSERT OR IGNORE INTO AuthBootstrapMeta (id, completed_at)
VALUES (1, NULL);
