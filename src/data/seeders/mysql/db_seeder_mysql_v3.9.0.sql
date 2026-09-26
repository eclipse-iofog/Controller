INSERT INTO Registries (url, is_public, user_name, password, user_email, type, ca, insecure)
SELECT 'https://huggingface.co', true, '', '', '', 'hf', NULL, false
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM Registries WHERE url = 'https://huggingface.co' AND type = 'hf'
);

DELETE FROM Microservices WHERE catalog_item_id IN (SELECT id FROM (SELECT id FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue')) AS catalog_ids);
DELETE FROM CatalogItemImages WHERE catalog_item_id IN (SELECT id FROM (SELECT id FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue')) AS catalog_ids);
DELETE FROM CatalogItemInputTypes WHERE catalog_item_id IN (SELECT id FROM (SELECT id FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue')) AS catalog_ids);
DELETE FROM CatalogItemOutputTypes WHERE catalog_item_id IN (SELECT id FROM (SELECT id FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue')) AS catalog_ids);
DELETE FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue');

UPDATE CatalogItems
SET name = 'NATS',
    description = 'NATS server microservice for Edgelet'
WHERE name = 'NATs';
