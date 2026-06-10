START TRANSACTION;

INSERT INTO "Registries" (url, is_public, user_name, password, user_email)
VALUES
    ('docker.io', true, '', '', ''),
    ('from_cache', true, '', '', '');

INSERT INTO "CatalogItems" (name, description, category, publisher, disk_required, ram_required, picture, config_example, is_public, registry_id)
VALUES
    ('Router', 'The built-in router for Datasance PoT.', 'SYSTEM', 'Datasance', 0, 0, 'none.png', NULL, false, 1),
    ('RESTBlue', 'REST API for Bluetooth Low Energy layer.', 'SYSTEM', 'Datasance', 0, 0, 'none.png', NULL, true, 1),
    ('HAL', 'REST API for Hardware Abstraction layer.', 'SYSTEM', 'Datasance', 0, 0, 'none.png', NULL, true, 1),
    ('Debug', 'The built-in debugger for Datasance PoT Edgelet.', 'SYSTEM', 'Datasance', 0, 0, 'none.png', NULL, false, 1),
    ('NATs', 'NATs server microservice for Datasance PoT', 'SYSTEM', 'Datasance', 0, 0, 'none.png', NULL, true, 1);

INSERT INTO "Architectures" (id, name, image, description, network_catalog_item_id, hal_catalog_item_id, bluetooth_catalog_item_id)
VALUES
    (0, 'auto', 'iointegrator0.png', 'Architecture will be selected on provision', 1, 3, 2),
    (1, 'amd64', 'iointegrator1.png', 'Standard x86_64 Linux. Compatible with common Linux distributions such as Ubuntu, Red Hat, and CentOS.', 1, 3, 2),
    (2, 'arm64', 'iointegrator2.png', '64-bit ARM Linux (aarch64). Microservices for this architecture are built for ARM64 systems.', 1, 3, 2),
    (3, 'riscv64', 'iointegrator3.png', 'RISC-V 64-bit Linux. Microservices for this architecture are built for RISC-V systems.', 1, 3, 2),
    (4, 'arm', 'iointegrator4.png', '32-bit ARM Linux. Microservices for this architecture are built for 32-bit ARM systems.', 1, 3, 2);

UPDATE "Fogs"
SET arch_id = 0
WHERE arch_id IS NULL;

INSERT INTO "CatalogItemImages" (catalog_item_id, arch_id, container_image)
VALUES
    (1, 1, 'ghcr.io/datasance/router:latest'),
    (1, 2, 'ghcr.io/datasance/router:latest'),
    (1, 3, 'ghcr.io/datasance/router:latest'),
    (1, 4, 'ghcr.io/datasance/router:latest'),
    (2, 1, 'ghcr.io/datasance/restblue:latest'),
    (2, 2, 'ghcr.io/datasance/restblue:latest'),
    (2, 3, 'ghcr.io/datasance/restblue:latest'),
    (2, 4, 'ghcr.io/datasance/restblue:latest'),
    (3, 1, 'ghcr.io/datasance/hal:latest'),
    (3, 2, 'ghcr.io/datasance/hal:latest'),
    (3, 3, 'ghcr.io/datasance/hal:latest'),
    (3, 4, 'ghcr.io/datasance/hal:latest'),
    (4, 1, 'ghcr.io/datasance/node-debugger:latest'),
    (4, 2, 'ghcr.io/datasance/node-debugger:latest'),
    (4, 3, 'ghcr.io/datasance/node-debugger:latest'),
    (4, 4, 'ghcr.io/datasance/node-debugger:latest'),
    (5, 1, 'ghcr.io/datasance/nats:latest'),
    (5, 2, 'ghcr.io/datasance/nats:latest'),
    (5, 3, 'ghcr.io/datasance/nats:latest'),
    (5, 4, 'ghcr.io/datasance/nats:latest');

COMMIT;
