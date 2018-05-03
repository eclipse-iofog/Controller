PRAGMA foreign_keys = OFF;
--BEGIN TRANSACTION;
CREATE TABLE routing (
  `ID`                      INTEGER PRIMARY KEY AUTOINCREMENT,
  `publishing_instance_id`  TEXT,
  `publishing_element_id`   TEXT,
  `destination_instance_id` TEXT,
  `destination_element_id`  TEXT,
  `is_network_connection`   TINYINT(1)
);
CREATE TABLE config (
  `ID`    INTEGER PRIMARY KEY AUTOINCREMENT,
  `key`   TEXT,
  `value` TEXT
);
CREATE TABLE satellite (
  `ID`         INTEGER PRIMARY KEY AUTOINCREMENT,
  `name`       TEXT,
  `domain`     TEXT,
  `public_ip`  TEXT,
  `cert`       TEXT,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL
);

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
    ON UPDATE CASCADE
);
CREATE TABLE element_instance_port (
  `ID`            INTEGER PRIMARY KEY AUTOINCREMENT,
  `port_internal` BIGINT,
  `port_external` BIGINT,
  `updated_by`    BIGINT,
  `created_at`    DATETIME NOT NULL,
  `updated_at`    DATETIME NOT NULL,
  `elementId`     TEXT
);
CREATE TABLE iofog_console (
  ID           INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id       BIGINT,
  version      BIGINT,
  api_base_url TEXT,
  element_id   TEXT,
  access_token TEXT,
  iofog_uuid   TEXT REFERENCES iofogs (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE stream_viewer (
  ID           INTEGER PRIMARY KEY AUTOINCREMENT,
  orgId        BIGINT,
  version      BIGINT,
  api_base_url TEXT,
  element_id   TEXT,
  access_token TEXT,
  iofog_uuid   TEXT REFERENCES iofogs (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE instance_track (
  ID                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT,
  description         TEXT,
  last_updated        DATETIME,
  is_selected         TINYINT(1),
  is_activated        TINYINT(1),
  updated_by          BIGINT,
  created_at          DATETIME NOT NULL,
  updated_at          DATETIME NOT NULL,
  element_instance_id INTEGER REFERENCES element_instance (ID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE element_advertised_port (
  ID          INTEGER PRIMARY KEY AUTOINCREMENT,
  port_number BIGINT,
  name        TEXT,
  description TEXT,
  element_id  INTEGER REFERENCES element (ID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE iofog_users (
  ID      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users (ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  fog_id  TEXT REFERENCES iofogs (UUID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE (user_id, fog_id)
);

CREATE TABLE element_images (
  ID            INTEGER PRIMARY KEY AUTOINCREMENT,
  element_id    INTEGER REFERENCES element (ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  iofog_type_id INTEGER REFERENCES iofog_type (ID)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  container_image TEXT
);

INSERT INTO element_images VALUES (1, 1, 1, 'iofog/core-networking');
INSERT INTO element_images VALUES (2, 1, 2, 'iofog/core-networking-arm');
INSERT INTO element_images VALUES (3, 2, 1, 'iofog/restblue');
INSERT INTO element_images VALUES (4, 2, 2, 'iofog/restblue-arm');
INSERT INTO element_images VALUES (5, 3, 1, 'iofog/hal');
INSERT INTO element_images VALUES (6, 3, 2, 'iofog/hal-arm');
INSERT INTO element_images VALUES (7, 4, 1, 'iofog/diagnostics');
INSERT INTO element_images VALUES (8, 4, 2, 'iofog/diagnostics-arm');
INSERT INTO element_images VALUES (9, 5, 1, 'iofog/hello-web');
INSERT INTO element_images VALUES (10, 5, 2, 'iofog/hello-web-arm');
INSERT INTO element_images VALUES (11, 6, 1, 'iofog/open-weather-map');
INSERT INTO element_images VALUES (12, 6, 2, 'iofog/open-weather-map-arm');
INSERT INTO element_images VALUES (13, 7, 1, 'iofog/json-rest-api');
INSERT INTO element_images VALUES (14, 7, 2, 'iofog/json-rest-api-arm');
INSERT INTO element_images VALUES (15, 8, 1, 'iofog/temperature-conversion');
INSERT INTO element_images VALUES (16, 8, 2, 'iofog/temperature-conversion-arm');
INSERT INTO element_images VALUES (17, 9, 1, 'iofog/json-subselect');
INSERT INTO element_images VALUES (18, 9, 2, 'iofog/json-subselect-arm');
INSERT INTO element_images VALUES (19, 10, 1, 'iofog/humidity-sensor-simulator');
INSERT INTO element_images VALUES (20, 10, 2, 'iofog/humidity-sensor-simulator-arm');
INSERT INTO element_images VALUES (21, 11, 1, 'iofog/seismic-sensor-simulator');
INSERT INTO element_images VALUES (22, 11, 2, 'iofog/seismic-sensor-simulator-arm');
INSERT INTO element_images VALUES (23, 12, 1, 'iofog/temperature-sensor-simulator');
INSERT INTO element_images VALUES (24, 12, 2, 'iofog/temperature-sensor-simulator-arm');

CREATE TABLE network_pairing (
  ID                INTEGER PRIMARY KEY AUTOINCREMENT,
  IsPublicPort      TINYINT(1),
  instanceId1       TEXT REFERENCES iofogs (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  instanceId2       TEXT REFERENCES iofogs (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  elementId1        TEXT REFERENCES element_instance (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  elementId2        TEXT REFERENCES element_instance (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  networkElementId1 TEXT REFERENCES element_instance (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  networkElementId2 TEXT REFERENCES element_instance (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  elemen1PortId     INTEGER REFERENCES element_instance_port (ID)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  satellitePortId   INTEGER REFERENCES satellite_port (ID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE element_instance_connections (
  ID                           INTEGER PRIMARY KEY AUTOINCREMENT,
  source_element_instance      TEXT,
  destination_element_instance TEXT
);
CREATE TABLE element (
  ID              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT,
  description     TEXT,
  category        TEXT,
  publisher       TEXT,
  diskRequired    BIGINT,
  ram_required    BIGINT,
  picture         BIGINT,
  config          TEXT,
  is_public       TINYINT(1),
  org_id          BIGINT,
  registry_id     INTEGER REFERENCES registry (ID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

INSERT INTO element VALUES (1, 'Networking Tool', 'The built-in networking tool for Eclipse ioFog.',
      'SYSTEM', 'Eclipse ioFog', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (2, 'RESTBlue', 'REST API for Bluetooth Low Energy layer.',
      'SYSTEM', 'Eclipse ioFog',  0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (3, 'HAL', 'REST API for Hardware Abstraction layer.',
      'SYSTEM', 'Eclipse ioFog', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (4, 'Diagnostics', 'Performs diagnostics of basic functionality to work with ioFog.  ' +
                      'Use diagnostic container if something goes wrong on your machine with ioFog agent,' +
                      ' e.g. Comsats are not available, a container cannot connect to ioFog host, ' +
                      'ioFog client is not created, RestBlue or Log Container are not available and so on.',
       'UTILITIES', 'Eclipse ioFog', 0, 0, 'images/build/580.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (5, 'Hello Web Demo', 'A simple web server to test Eclipse ioFog.',
      'UTILITIES', 'Eclipse ioFog', 0, 0, 'images/build/4.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (6, 'Open Weather Map Data', 'A stream of data from the Open Weather Map API in JSON format',
      'SENSORS', 'Eclipse ioFog', 0, 0, 'images/build/8.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (7, 'JSON REST API', 'A configurable REST API that gives JSON output',
      'UTILITIES', 'Eclipse ioFog', 0, 0, 'images/build/49.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (8, 'Temperature Converter', 'A simple temperature format converter',
      'UTILITIES', 'Eclipse ioFog', 0, 0, 'images/build/58.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (9, 'JSON Sub-Select', 'Performs sub-selection and transform operations on any JSON messages',
      'UTILITIES', 'Eclipse ioFog', 0, 0, 'images/build/59.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (10, 'Humidity Sensor Simulator', 'Humidity Sensor Simulator for Eclipse ioFog',
      'SIMULATOR', 'Eclipse ioFog', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (11, 'Seismic Sensor Simulator', 'Seismic Sensor Simulator for Eclipse ioFog',
      'SIMULATOR', 'Eclipse ioFog', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES (12, 'Temperature Sensor Simulator', 'Temperature Sensor Simulator for Eclipse ioFog',
      'SIMULATOR', 'Eclipse ioFog', 0, 0, 'none.png', NULL, 1, 0, 1);

CREATE TABLE element_input_type (
  ID          INTEGER PRIMARY KEY AUTOINCREMENT,
  element_key BIGINT REFERENCES element (ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  info_type   TEXT,
  info_format TEXT
);
CREATE TABLE element_output_type (
  ID          INTEGER PRIMARY KEY AUTOINCREMENT,
  element_key BIGINT REFERENCES element (ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  info_type   TEXT,
  info_format TEXT
);
CREATE TABLE satellite_port (
  ID                                INTEGER PRIMARY KEY AUTOINCREMENT,
  port1                             BIGINT,
  port2                             BIGINT,
  max_connections_port1             BIGINT,
  max_connection_port2              BIGINT,
  passcode_port1                    TEXT,
  passcode_port2                    TEXT,
  heartbeat_absence_threshold_port1 BIGINT,
  heartbeat_absence_threshold_port2 BIGINT,
  updated_by                        BIGINT,
  created_at                        DATETIME NOT NULL,
  updated_at                        DATETIME NOT NULL,
  satellite_id                      INTEGER REFERENCES satellite (ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  mapping_id                        TEXT
);
CREATE TABLE iofog_provision_keys (
  ID                  INTEGER PRIMARY KEY AUTOINCREMENT,
  provisioning_string VARCHAR(100),
  expiration_time     BIGINT,
  iofog_uuid          TEXT REFERENCES iofogs (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE iofogs (
  UUID                    TEXT PRIMARY KEY,
  Name                    TEXT    DEFAULT ('Unnamed ioFog 1'),
  Location                TEXT,
  GpsMode                 TEXT,
  Latitude                TEXT,
  Longitude               TEXT,
  OrgID                   BIGINT,
  Description             TEXT,
  created_at              DATETIME,
  updated_at              DATETIME,
  LastActive              BIGINT,
  Token                   TEXT,
  DaemonStatus            TEXT    DEFAULT 'UNKNOWN',
  DaemonOperatingDuration BIGINT  DEFAULT 0,
  DaemonLastStart         BIGINT,
  MemoryUsage             FLOAT   DEFAULT 0,
  DiskUsage               FLOAT   DEFAULT 0,
  CPUUsage                FLOAT   DEFAULT 0,
  MemoryViolation         TEXT,
  DiskViolation           TEXT,
  CPUViolation            TEXT,
  ElementStatus           TEXT,
  RepositoryCount         BIGINT,
  RepositoryStatus        TEXT,
  SystemTime              BIGINT,
  LastStatusTime          BIGINT,
  IPAddress               TEXT    DEFAULT '0.0.0.0',
  ProcessedMessages       BIGINT  DEFAULT 0,
  ElementMessageCounts    TEXT,
  MessageSpeed            BIGINT,
  LastCommandTime         BIGINT,
  NetworkInterface        TEXT    DEFAULT 'eth0',
  DockerURL               TEXT    DEFAULT 'unix:///var/run/docker.sock',
  DiskLimit               FLOAT   DEFAULT 50,
  DiskDirectory           TEXT    DEFAULT ('/var/lib/iofog/'),
  MemoryLimit             FLOAT   DEFAULT 4096,
  CPULimit                FLOAT   DEFAULT 80,
  LogLimit                FLOAT   DEFAULT 10,
  LogDirectory            TEXT    DEFAULT ('/var/log/iofog/'),
  Debug                   INTEGER,
  Viewer                  INTEGER,
  Bluetooth               INTEGER,
  hal                     INTEGER DEFAULT (0),
  mongo                   INTEGER DEFAULT (0),
  influx                  INTEGER DEFAULT (0),
  grafana                 INTEGER DEFAULT (0),
  IsolatedDockerContainer INTEGER DEFAULT (1),
  LogFileCount            BIGINT  DEFAULT 10,
  Version                 TEXT,
  isReadyToUpgrade        INTEGER DEFAULT(1),
  isReadyToRollback       INTEGER DEFAULT(0),
  StatusFrequency         INTEGER DEFAULT (10),
  ChangeFrequency         INTEGER DEFAULT (20),
  ScanFrequency           INTEGER DEFAULT (60),
  Proxy                   TEXT    DEFAULT (''),
  typeKey                 INTEGER REFERENCES iofog_type (ID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE iofog_type (
  ID                     INTEGER PRIMARY KEY AUTOINCREMENT,
  Name                   TEXT,
  Image                  TEXT,
  Description            TEXT,
  StreamViewerElementKey BIGINT,
  consoleElementKey      BIGINT,
  NetworkElementKey      BIGINT,
  HalElementKey          BIGINT,
  MongoElementKey        BIGINT,
  InfluxElementKey       BIGINT,
  GrafanaElementKey      BIGINT,
  BluetoothElementKey    BIGINT
);
INSERT INTO iofog_type VALUES (1, 'Standard Linux (x86)', 'iointegrator1.png',
                               'A standard Linux server of at least moderate processing power and capacity. Compatible with common Linux types such as Ubuntu, Red Hat, and CentOS.',
                               1, 2, 3, 6, 9, 10, 11, 5);
INSERT INTO iofog_type VALUES (2, 'ARM Linux', 'iointegrator2.png',
                               'A version of ioFog meant to run on Linux systems with ARM processors. Microservices for this ioFog type will be tailored to ARM systems.',
                               1, 2, 3, 6, 9, 10, 11, 5);
CREATE TABLE element_instance (
  ID                  INTEGER PRIMARY KEY AUTOINCREMENT,
  UUID                TEXT UNIQUE,
  track_id            BIGINT,
  element_key         BIGINT,
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
  element_id          INTEGER REFERENCES element (ID)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  iofog_uuid          TEXT REFERENCES iofogs (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE element_instance_status (
  ID                    INTEGER PRIMARY KEY AUTOINCREMENT,
  status                TEXT,
  cpu_usage             FLOAT,
  memory_usage          BIGINT,
  container_id          BIGINT,
  created_at            DATETIME NOT NULL,
  updated_at            DATETIME NOT NULL,
  element_instance_uuid INTEGER REFERENCES element_instance (UUID)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE strace_diagnostics (
  ID                    INTEGER PRIMARY KEY AUTOINCREMENT,
  element_instance_uuid INTEGER REFERENCES element_instance (UUID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  straceRun             BOOLEAN,
  buffer                TEXT DEFAULT ''
);

CREATE TABLE iofog_access_tokens (
  ID              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER,
  expiration_time BIGINT,
  token           TEXT,
  iofog_uuid      TEXT REFERENCES iofogs (UUID)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE users (
  ID                INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name        VARCHAR(100),
  last_name         VARCHAR(100),
  email             VARCHAR(100),
  password          VARCHAR(100),
  temp_password     TEXT,
  email_activated   INTEGER,
  user_access_token TEXT
);


CREATE TABLE email_activation_code (
  ID              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER REFERENCES users (ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  activation_code TEXT,
  expiration_time BIGINT
);

CREATE TABLE registry (
  ID            INTEGER PRIMARY KEY AUTOINCREMENT,
  url           TEXT,
  is_public     INTEGER,
  secure        INTEGER,
  certificate   TEXT,
  requires_cert INTEGER,
  user_name     TEXT,
  password      TEXT,
  user_email    BIGINT,
  iofog_uuid    TEXT REFERENCES iofogs (UUID),
  user_id       INTEGER REFERENCES users (ID)
);
INSERT INTO registry
VALUES (1, 'registry.hub.docker.com', 1, 1, '', 0, '', '', '', NULL, NULL);
CREATE TABLE iofog_change_tracking (
	`ID`	INTEGER PRIMARY KEY AUTOINCREMENT,
	`container_config`	BIGINT,
	`reboot`	BOOLEAN,
	`version` BIGINT,
	`container_list`	BIGINT,
	`config`	BIGINT,
	`routing`	BIGINT,
	`registries`	BIGINT,
	`proxy` BIGINT,
  `diagnostics` BIGINT,
	`iofog_uuid`	TEXT,
	FOREIGN KEY(`iofog_uuid`) REFERENCES iofogs ( UUID ) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE proxy (
  `ID`          INTEGER PRIMARY KEY AUTOINCREMENT,
  `username`    TEXT,
  `password`    TEXT,
  `host`        TEXT,
  `remote_port` INTEGER,
  `local_port`  INTEGER             DEFAULT 22,
  `rsa_key`     TEXT,
  `close`       BOOLEAN             DEFAULT FALSE,
  `iofog_uuid`  TEXT,
  FOREIGN KEY (`iofog_uuid`) REFERENCES iofogs (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE hw_info (
  `ID`         INTEGER PRIMARY KEY AUTOINCREMENT,
  `info`       TEXT,
  `iofog_uuid` TEXT,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  FOREIGN KEY (`iofog_uuid`) REFERENCES iofogs (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE usb_info (
  `ID`         INTEGER PRIMARY KEY AUTOINCREMENT,
  `info`       TEXT,
  `iofog_uuid` TEXT,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  FOREIGN KEY (`iofog_uuid`) REFERENCES iofogs (UUID)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE iofog_version_commands (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  version_command VARCHAR (100),
  `iofog_uuid`	TEXT,
  FOREIGN KEY(`iofog_uuid`) REFERENCES iofogs (UUID) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE element_instance_to_clean_up (
  ID                    INTEGER PRIMARY KEY AUTOINCREMENT,
  element_instance_uuid TEXT,
  iofog_uuid            TEXT,
  created_at            DATETIME NOT NULL,
  updated_at            DATETIME NOT NULL
);

--COMMIT;
