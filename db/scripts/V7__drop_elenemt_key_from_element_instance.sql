CREATE TABLE new_element_instance (
  ID                  INTEGER PRIMARY KEY AUTOINCREMENT,
  UUID                TEXT UNIQUE,
  track_id            BIGINT,
  config              BIGINT,
  name                TEXT,
  updated_by          BIGINT,
  config_last_updated BIGINT,
  is_stream_viewer    TINYINT(1),
  is_debug_console    TINYINT(1),
  is_manager          TINYINT(1),
  is_network          TINYINT(1),
  registry_id         BIGINT,
  rebuild             TINYINT(1),
  root_host_access    TINYINT(1),
  log_size            TINYINT(1),
  created_at          DATETIME NOT NULL,
  updated_at          DATETIME NOT NULL,
  volume_mappings     TEXT,

  need_update TYNYINT(1) DEFAULT 0 NULL,
  image_snapshot	TEXT,

  element_id          INTEGER REFERENCES element (ID)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  iofog_uuid          TEXT REFERENCES iofogs (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

INSERT INTO new_element_instance (ID, UUID, track_id, config, name, updated_by, config_last_updated, is_stream_viewer,
                                  is_debug_console, is_manager, is_network, registry_id, rebuild, root_host_access,
                                  log_size, created_at, updated_at, volume_mappings,
                                  element_id, -- element_key to element_id
                                  iofog_uuid, need_update, image_snapshot)
  SELECT ID, UUID, track_id, config, name, updated_by, config_last_updated, is_stream_viewer,
    is_debug_console, is_manager, is_network, registry_id, rebuild, root_host_access,
    log_size, created_at, updated_at, volume_mappings,
    element_key as elenent_id, -- element_key to element_id
    iofog_uuid, need_update, image_snapshot

  FROM element_instance;

DROP TABLE element_instance;

ALTER TABLE new_element_instance RENAME TO element_instance;