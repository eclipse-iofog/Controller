INSERT INTO `Registries` (url, is_public, user_name, password, user_email)
VALUES 
    ('registry.hub.docker.com', true, '', '', ''),
    ('from_cache', true, '', '', '');

INSERT INTO `CatalogItems` (name, description, category, publisher, disk_required, ram_required, picture, config_example, is_public, registry_id)
VALUES 
    ('Router', 'The built-in router for Datasance PoT.', 'SYSTEM', 'Datasance', 0, 0, 'none.png', NULL, false, 1),
    ('RESTBlue', 'REST API for Bluetooth Low Energy layer.', 'SYSTEM', 'Datasance', 0, 0, 'none.png', NULL, true, 1),
    ('HAL', 'REST API for Hardware Abstraction layer.', 'SYSTEM', 'Datasance', 0, 0, 'none.png', NULL, true, 1),
    ('Debug', 'The built-in debugger for Datasance PoT IoFog Agent.', 'SYSTEM', 'Datasance', 0, 0, 'none.png', NULL, false, 1),
    ('NATs', 'NATs server microservice for Datasance PoT', 'SYSTEM', 'Datasance', 0, 0, 'none.png', NULL, true, 1);

INSERT INTO `FogTypes` (id, name, image, description, network_catalog_item_id, hal_catalog_item_id, bluetooth_catalog_item_id)
VALUES 
    (0, 'Unspecified', 'iointegrator0.png', 'Unspecified device. Fog Type will be selected on provision', 1, 3, 2),
    (1, 'Standard Linux (x86)', 'iointegrator1.png', 'A standard Linux server of at least moderate processing power and capacity. Compatible with common Linux types such as Ubuntu, Red Hat, and CentOS.', 1, 3, 2),
    (2, 'ARM Linux', 'iointegrator2.png', 'A version of ioFog meant to run on Linux systems with ARM processors. Microservices for this ioFog type will be tailored to ARM systems.', 1, 3, 2);

UPDATE `Fogs`
SET fog_type_id = 0
WHERE fog_type_id IS NULL;

INSERT INTO `CatalogItemImages` (catalog_item_id, fog_type_id, container_image)
VALUES 
    (1, 1, 'ghcr.io/datasance/router:latest'),
    (1, 2, 'ghcr.io/datasance/router:latest'),
    (2, 1, 'ghcr.io/datasance/restblue:latest'),
    (2, 2, 'ghcr.io/datasance/restblue:latest'),
    (3, 1, 'ghcr.io/datasance/hal:latest'),
    (3, 2, 'ghcr.io/datasance/hal:latest'),
    (4, 1, 'ghcr.io/datasance/node-debugger:latest'),
    (4, 2, 'ghcr.io/datasance/node-debugger:latest'),
    (5, 1, 'ghcr.io/datasance/nats:latest'),
    (5, 2, 'ghcr.io/datasance/nats:latest');
