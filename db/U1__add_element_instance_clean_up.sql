CREATE TABLE element_instance_clean_up (
  ID                    INTEGER PRIMARY KEY AUTOINCREMENT,
  element_instance_uuid TEXT,
  iofog_uuid            TEXT,
  created_at            DATETIME NOT NULL,
  updated_at            DATETIME NOT NULL
);