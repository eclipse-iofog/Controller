PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;
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
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL
);
INSERT INTO satellite VALUES (2, 'ComSat4', 'comsat4.iotracks.com', '104.130.135.213', '2016-09-21 15:21:31.898 +00:00',
                              '2016-09-21 15:21:31.898 +00:00');
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
INSERT INTO iofog_users VALUES (193, 43, 'fVmnRpHgdNnDw7XJLJw7GV4NVRhjk4V3');
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
INSERT INTO element_images VALUES (1, 1, 1, 'iotracks/catalog:stream-viewer-1.0');
INSERT INTO element_images VALUES (2, 1, 2, 'iotracks/catalog:stream-viewer-1.0-arm');
INSERT INTO element_images VALUES (3, 2, 1, 'iotracks/catalog:debug');
INSERT INTO element_images VALUES (4, 2, 2, 'iotracks/catalog:debug-arm');
INSERT INTO element_images VALUES (5, 3, 1, 'iotracks/catalog:core-networking-1-12');
INSERT INTO element_images VALUES (6, 3, 2, 'iotracks/catalog:core-networking-1-12-arm');
INSERT INTO element_images VALUES (7, 4, 1, 'iotracks/catalog:hello-web-1');
INSERT INTO element_images VALUES (8, 4, 2, 'iotracks/catalog:hello-web-1-arm');
INSERT INTO element_images VALUES (9, 5, 1, 'iotracks/catalog:bluetooth-rest-api-v0.5');
INSERT INTO element_images VALUES (10, 5, 2, 'iotracks/catalog:bluetooth-rest-api-v0.5-arm');
INSERT INTO element_images VALUES (11, 6, 1, 'iotracks/catalog:hal-0.1');
INSERT INTO element_images VALUES (12, 6, 2, 'iotracks/catalog:hal-0.1-arm');
INSERT INTO element_images VALUES (13, 8, 1, 'iotracks/catalog:open-weather-map-v1.06');
INSERT INTO element_images VALUES (14, 8, 2, 'iotracks/catalog:open-weather-map-v1.06-arm');
INSERT INTO element_images VALUES (15, 9, 1, 'iotracks/catalog:mongodb');
INSERT INTO element_images VALUES (16, 9, 2, 'iotracks/catalog:mongodb-arm');
INSERT INTO element_images VALUES (17, 10, 1, 'iotracks/catalog:influxdb');
INSERT INTO element_images VALUES (18, 10, 2, 'iotracks/catalog:influxdb-arm');
INSERT INTO element_images VALUES (19, 11, 1, 'iotracks/catalog:grafana');
INSERT INTO element_images VALUES (20, 11, 2, 'iotracks/catalog:grafana-arm');
INSERT INTO element_images VALUES (21, 49, 1, 'iotracks/catalog:json-rest-api-v1.04');
INSERT INTO element_images VALUES (22, 49, 2, 'iotracks/catalog:json-rest-api-v1.04-arm');
INSERT INTO element_images VALUES (23, 58, 1, 'iotracks/catalog:temperature-conversion-v1.03');
INSERT INTO element_images VALUES (24, 58, 2, 'iotracks/catalog:temperature-conversion-v1.03-arm');
INSERT INTO element_images VALUES (25, 12, 1, 'iotracks/catalog:mongo-receiver-python');
INSERT INTO element_images VALUES (26, 12, 2, 'iotracks/catalog:mongo-receiver-python-arm');
INSERT INTO element_images VALUES (27, 13, 1, 'iotracks/catalog:influx-receiver-python');
INSERT INTO element_images VALUES (28, 13, 2, 'iotracks/catalog:influx-receiver-python-arm');
INSERT INTO element_images VALUES (29, 14, 1, 'iotracks/catalog:json-subselect-go');
INSERT INTO element_images VALUES (30, 14, 2, 'iotracks/catalog:json-subselect-go-arm');
INSERT INTO element_images VALUES (31, 15, 1, 'iotracks/catalog:diagnostic-1.3');
INSERT INTO element_images VALUES (32, 15, 2, 'iotracks/catalog:diagnostic-1.3-arm');
INSERT INTO element_images VALUES (33, 16, 1, 'iofog/mqtt-client:0.2');
INSERT INTO element_images VALUES (34, 16, 2, 'iofog/mqtt-client:0.2-arm');
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
INSERT INTO element VALUES
  (1, 'Stream Viewer', 'The built-in stream viewer for ioIntegrator Linux edition', 'Utilities',
      'SYSTEM', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (2, 'Debug Console', 'The built-in debug console for ioIntegrator Linux edition', 'Utilities',
      'SYSTEM', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (3, 'Networking Tool', 'The built-in networking tool for ioIntegrator Linux edition', 'Utilities',
      'SYSTEM', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (4, 'Hello Web Demo', 'A simple web server for you to test your ioFog', 'Demos',
      'iotracks', 0, 0, 'images/build/4.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (5, 'RESTBlue', 'Bluetooth RESTful API', 'Utilities', 'SYSTEM', 0, 0,
      'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (6, 'HAL', 'HAL container', 'Utilities', 'SYSTEM', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (8, 'Open Weather Map Data', 'A stream of data from the Open Weather Map API in JSON format', 'Sensors',
      'iotracks', 0, 0, 'images/build/8.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (49, 'JSON REST API', 'A configurable REST API that gives JSON output', 'Utilities',
       'iotracks', 0, 0, 'images/build/49.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (58, 'Temperature Converter', 'A simple temperature format converter', 'Utilities',
       'iotracks', 0, 0, 'images/build/58.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (9, 'Mongo', 'MongoDB database', 'Utilities',
      'SYSTEM', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (10, 'Influx', 'InfluxDB database', 'Utilities',
       'SYSTEM', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (11, 'Grafana', 'Grafana container', 'Utilities',
       'SYSTEM', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (12, 'Mongo Adapter', 'Mongo adapter container', 'Utilities',
       'SYSTEM', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (13, 'Influx Adapter', 'Influx adapter container', 'Utilities',
       'SYSTEM', 0, 0, 'none.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (14, 'JSON Sub-Select', 'Performs sub-selection and transform operations on any JSON messages', 'Utilities',
       'iotracks', 0, 0, 'images/build/59.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (15, 'Diagnostics', 'Performs diagnostics of basic functionality to work with ioFog.  ' +
                      'Use diagnostic container if something goes wrong on your machine with ioFog agent,' +
                      ' e.g. Comsats are not available, a container cannot connect to ioFog host, ' +
                      'ioFog client is not created, RestBlue or Log Container are not available and so on.',
       'Utilities', 'iotracks', 0, 0, 'images/build/580.png', NULL, 1, 0, 1);
INSERT INTO element VALUES
  (16, 'MQTT Client', 'Converts MQTT-messages to ioMesage format and vice versa.', 'Utilities',
       'iotracks', 0, 0, 'images/build/640.png', NULL, 1, 0, 1);

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
INSERT INTO iofog_provision_keys VALUES (79, 'jX3QfQvQ', 1517402261932, 'fVmnRpHgdNnDw7XJLJw7GV4NVRhjk4V3');
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
INSERT INTO users VALUES (43, 'Admin', 'Admin', 'admin@admin.admin', 'admin', NULL, 1000,
                          '6eb5117a227868387324017f64dc7e2b2ab299b10b5fc5927ba516fd4a6794b6');
INSERT INTO users VALUES (44, 'Ivan', 'Panasuk', 'ivan@ivan.ivan', 'admin', NULL, 1000,
                          '6eb5117a227868387324017f64dc7e2b2ab299b10b5fc5927ba516fd4a6794b7');
INSERT INTO users VALUES (45, 'Artur', 'Artur', 'artur@artur.artur', 'admin', NULL, 1000,
                          '6eb5117a227868387324017f64dc7e2b2ab299b10b5fc5927ba516fd4a6794b8');
INSERT INTO users VALUES (46, 'Eugene', 'Eugene', 'eugene@eugene.eugene', 'admin', NULL, 1000,
                          '6eb5117a227868387324017f64dc7e2b2ab299b10b5fc5927ba516fd4a6794b9');
INSERT INTO users VALUES (47, 'Irina', 'Irina', 'irina@irina.irina', 'admin', NULL, 1000,
                          '6eb5117a227868387324017f64dc7e2b2ab299b10b5fc5927ba516fd4a6794b1');
INSERT INTO users VALUES (48, 'Katya', 'Katya', 'katya@katya.katya', 'admin', NULL, 1000,
                          '6eb5117a227868387324017f64dc7e2b2ab299b10b5fc5927ba516fd4a6794b2');
INSERT INTO users VALUES (49, 'Sasha', 'Sasha', 'sasha@sasha.sasha', 'admin', NULL, 1000,
                          '6eb5117a227868387324017f64dc7e2b2ab299b10b5fc5927ba516fd4a6794b3');
INSERT INTO users VALUES (50, 'Dima', 'Dima', 'dima@dima.dima', 'admin', NULL, 1000,
                          '6eb5117a227868387324017f64dc7e2b2ab299b10b5fc5927ba516fd4a6794b4');
INSERT INTO users VALUES (51, 'Egor', 'Egor', 'egor@povelitel.gor', 'admin', NULL, 1000,
                          '6eb5117a227868387324017f64dc7e2b2ab299b10b5fc5927ba516fd4a6794b5');

CREATE TABLE email_activation_code (
  ID              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER REFERENCES users (ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  activation_code TEXT,
  expiration_time BIGINT
);
INSERT INTO email_activation_code VALUES (35, 43, 'XPMDjGP6fbQdB4py', 1517495034248);
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
VALUES (1, 'registry.hub.docker.com', 1, 1, '', 0, 'iointegrator', '0nTh3Edge2015', 'admin@iotracks.com', NULL, NULL);
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

INSERT INTO iofog_change_tracking VALUES(1, 1517401049283, 0, 1517401049283,1517472938429,1517472938429,1517401049283,1517401049283, 1517401049283, 'fVmnRpHgdNnDw7XJLJw7GV4NVRhjk4V3');
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES ('config', 52);
INSERT INTO sqlite_sequence VALUES ('satellite', 9);
INSERT INTO sqlite_sequence VALUES ('data_tracks', 90);
INSERT INTO sqlite_sequence VALUES ('routing', 196);
INSERT INTO sqlite_sequence VALUES ('element_instance_port', 650);
INSERT INTO sqlite_sequence VALUES ('iofog_console', 256);
INSERT INTO sqlite_sequence VALUES ('stream_viewer', 257);
INSERT INTO sqlite_sequence VALUES ('instance_track', 0);
INSERT INTO sqlite_sequence VALUES ('element_advertised_port', 0);
INSERT INTO sqlite_sequence VALUES ('iofog_users', 193);
INSERT INTO sqlite_sequence VALUES ('element_images', 181);
INSERT INTO sqlite_sequence VALUES ('network_pairing', 644);
INSERT INTO sqlite_sequence VALUES ('element_instance_connections', 68);
INSERT INTO sqlite_sequence VALUES ('element', 226);
INSERT INTO sqlite_sequence VALUES ('element_input_type', 100);
INSERT INTO sqlite_sequence VALUES ('element_output_type', 92);
INSERT INTO sqlite_sequence VALUES ('satellite_port', 639);
INSERT INTO sqlite_sequence VALUES ('iofog_provision_keys', 79);
INSERT INTO sqlite_sequence VALUES ('iofog_type', 2);
INSERT INTO sqlite_sequence VALUES ('element_instance', 1048);
INSERT INTO sqlite_sequence VALUES ('iofog_access_tokens', 21);
INSERT INTO sqlite_sequence VALUES ('users', 43);
INSERT INTO sqlite_sequence VALUES ('users', 44);
INSERT INTO sqlite_sequence VALUES ('users', 45);
INSERT INTO sqlite_sequence VALUES ('users', 46);
INSERT INTO sqlite_sequence VALUES ('users', 47);
INSERT INTO sqlite_sequence VALUES ('users', 48);
INSERT INTO sqlite_sequence VALUES ('users', 49);
INSERT INTO sqlite_sequence VALUES ('users', 50);
INSERT INTO sqlite_sequence VALUES ('users', 51);
INSERT INTO sqlite_sequence VALUES ('email_activation_code', 35);
INSERT INTO sqlite_sequence VALUES ('registry', 1);
INSERT INTO sqlite_sequence VALUES ('iofog_change_tracking', 1);

INSERT INTO config (key, value) VALUES ('port', '4443');
INSERT INTO config (key, value) VALUES ('ssl_key', 'privkey.pem');
INSERT INTO config (key, value) VALUES ('intermediate_cert', 'my-private-root-ca.cert.pem');
INSERT INTO config (key, value) VALUES ('ssl_cert', 'fullchain.pem');

COMMIT;
