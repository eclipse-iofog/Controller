ALTER TABLE data_tracks RENAME TO old_data_tracks;

CREATE TABLE data_tracks (
  `ID`           INTEGER PRIMARY KEY AUTOINCREMENT,
  `name`         TEXT,
  `instance_id`  TEXT,
  `updated_by`   BIGINT,
  `description`  TEXT,
  `is_selected`  INTEGER,
  `is_activated` INTEGER,
  `created_at`   DATETIME NOT NULL,
  `updated_at`   DATETIME NOT NULL,
  `user_id`      INTEGER REFERENCES `users` (`ID`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT track_name_unique UNIQUE (name)
);

INSERT INTO data_tracks SELECT * FROM old_data_tracks;
