# Controller configuration

`src/config/config.yaml` is the configuration file. `src/config/env-mapping.js` is the list of environment variables that override it. A variable that is not in that list is ignored by the loader. A YAML key that is not in that list can only be changed by editing the file.

The file that is loaded is `CONFIG_PATH`, or `src/config/config.yaml` when that variable is unset. `CONFIG_PATH` is not itself a config key.

## How a value is chosen

1. The YAML file is the base. Keys under a `#` comment are not loaded.
2. Each mapped environment variable is written on top of that base. The variable creates the key if the YAML block is commented out. `VAULT_ENABLED=true` creates `vault.enabled` even when the `vault:` block is commented.
3. `true`, `false`, `1`, and `0` become booleans. Any other numeric string becomes a number. Everything else stays a string. Because `1` and `0` are booleans, do not use them for a count or a port.
4. OpenTelemetry is the exception. `OTEL_*` and `ENABLE_TELEMETRY` are not applied as overrides. If the variable is already set, it stays. If it is unset and the YAML value exists, Controller copies the YAML value into the process environment for the SDK.

`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_USE_SSL`, and `DB_SSL_CA` are not fixed paths. They write `database.<provider>.<field>`, where `<provider>` is `database.provider` (`sqlite`, `mysql`, or `postgres`). Set `DB_PROVIDER` to the same provider. On the default file that provider is `sqlite`, so `DB_NAME` updates `database.sqlite.databaseName`.

## Application

| YAML | Default | Environment variable |
|---|---|---|
| `app.name` | `iofog` | `CONTROLLER_NAME` |
| `app.uuid` | empty | `CONTROLLER_UUID` |
| `app.controlPlane` | `Remote` | `CONTROL_PLANE` |
| `app.namespace` | `iofog` | `CONTROLLER_NAMESPACE` |

`app.controlPlane` is `Remote`, `Kubernetes`, or `Local`. `Kubernetes` is the control plane that uses the operator-managed default router and NATS hub. `Remote` is the control plane where the first agent is the system node. See [networking-topology-controlplane.md](networking-topology-controlplane.md).

| YAML | Default | Environment variable |
|---|---|---|
| `flavor.distribution` | `datasance` | `CONTROLLER_DISTRIBUTION` |
| `flavor.rbacApiVersion` | `datasance.com/v3` | `RBAC_API_VERSION` |
| `flavor.serviceAnnotationTag` | `service.iofog.org/tag` | `SERVICE_ANNOTATION_TAG` |
| `flavor.componentLabelDomain` | derived | `COMPONENT_LABEL_DOMAIN` |

`flavor.componentLabelDomain` is not set in the default file. When both the YAML key and `COMPONENT_LABEL_DOMAIN` are empty, the label is derived from the distribution: `datasance.com/component` for `datasance`, `iofog.org/component` for `iofog`. Any other distribution uses `iofog.org/component`.

`APP_LABEL` is read directly and is not in the mapping file. It overrides `flavor.defaultAppLabelKey`. The default is `iofog`.

## Server

| YAML | Default | Environment variable |
|---|---|---|
| `server.port` | `51121` | `SERVER_PORT` |
| `server.devMode` | `true` | `SERVER_DEV_MODE` |
| `server.publicUrl` | `https://localhost:51121` | `CONTROLLER_PUBLIC_URL` |
| `server.trustProxy` | `false` | `TRUST_PROXY` |

`server.publicUrl` is the external URL of this Controller. In production it must be `https` unless `auth.insecureAllowHttp` is true. `server.trustProxy` honors `X-Forwarded-*` when a reverse proxy sits in front.

TLS is commented out in the default file. Setting the variable creates the key.

| YAML | Environment variable |
|---|---|
| `server.tls.path.key` | `TLS_PATH_KEY` |
| `server.tls.path.cert` | `TLS_PATH_CERT` |
| `server.tls.path.intermediateCert` | `TLS_PATH_INTERMEDIATE_CERT` |
| `server.tls.base64.key` | `TLS_BASE64_KEY` |
| `server.tls.base64.cert` | `TLS_BASE64_CERT` |
| `server.tls.base64.intermediateCert` | `TLS_BASE64_INTERMEDIATE_CERT` |

Use either the `path` files or the `base64` values.

### WebSocket

| YAML | Default | Environment variable |
|---|---|---|
| `server.webSocket.pingInterval` | `30000` | `WS_PING_INTERVAL` |
| `server.webSocket.pongTimeout` | `10000` | `WS_PONG_TIMEOUT` |
| `server.webSocket.maxPayload` | `1048576` | `WS_MAX_PAYLOAD` |
| `server.webSocket.session.timeout` | `3600000` | `WS_SESSION_TIMEOUT` |
| `server.webSocket.session.maxConnections` | `100` | `WS_SESSION_MAX_CONNECTIONS` |
| `server.webSocket.session.cleanupInterval` | `30000` | `WS_CLEANUP_INTERVAL` |
| `server.webSocket.session.execPendingTimeoutMs` | `60000` | `WS_EXEC_PENDING_TIMEOUT_MS` |
| `server.webSocket.session.execMaxDurationMs` | `28800000` | `WS_EXEC_MAX_DURATION_MS` |
| `server.webSocket.session.execMaxConcurrentPerResource` | `5` | `WS_EXEC_MAX_CONCURRENT_PER_RESOURCE` |
| `server.webSocket.session.logPendingTimeoutMs` | `120000` | `WS_LOG_PENDING_TIMEOUT_MS` |
| `server.webSocket.session.logIdleTimeoutMs` | `7200000` | `WS_LOG_IDLE_TIMEOUT_MS` |
| `server.webSocket.session.logMaxConcurrentPerResource` | `5` | `WS_LOG_MAX_CONCURRENT_PER_RESOURCE` |
| `server.webSocket.session.logTailMaxLines` | `5000` | `WS_LOG_TAIL_MAX_LINES` |
| `server.webSocket.session.replicaMaxConcurrentWs` | `500` | `WS_REPLICA_MAX_CONCURRENT_WS` |
| `server.webSocket.session.drainTimeoutMs` | `30000` | `WS_DRAIN_TIMEOUT_MS` |
| `server.webSocket.ha.crossReplicaRequiresAmqp` | `true` | `WS_HA_CROSS_REPLICA_REQUIRES_AMQP` |
| `server.webSocket.ha.failFastOnRouterUnavailable` | `true` | `WS_HA_FAIL_FAST_ON_ROUTER_UNAVAILABLE` |
| `server.webSocket.security.maxConnectionsPerIp` | `10` | `WS_SECURITY_MAX_CONNECTIONS_PER_IP` |
| `server.webSocket.security.maxRequestsPerMinute` | `60` | `WS_SECURITY_MAX_REQUESTS_PER_MINUTE` |
| `server.webSocket.security.maxPayload` | `1048576` | `WS_SECURITY_MAX_PAYLOAD` |

Durations on this table are milliseconds. `execMaxDurationMs` is 8 hours. `logIdleTimeoutMs` is 2 hours. `session.timeout` is the legacy idle fallback. Exec sessions use `execMaxDurationMs`.

These YAML keys have no environment variable:

| YAML | Default | Meaning |
|---|---|---|
| `server.webSocket.perMessageDeflate` | `false` | Per-message compression |
| `server.webSocket.allowExtensions` | `false` | WebSocket extensions |
| `server.webSocket.handshakeTimeout` | `10000` | Handshake timeout, milliseconds |
| `server.webSocket.maxFrameSize` | `65536` | Maximum frame size, bytes |
| `server.webSocket.relay.amqp.poolSize` | `8` | AMQP relay pool |
| `server.webSocket.relay.amqp.sendTimeoutMs` | `5000` | AMQP send timeout |
| `server.webSocket.relay.amqp.unsettledWarnThreshold` | `1800` | Unsettled AMQP message warning |
| `server.webSocket.relay.nats.maxPendingBytes` | `33554432` | NATS relay pending bytes (32 MiB) |
| `server.webSocket.relay.nats.maxPendingMessages` | `8192` | NATS relay pending messages |
| `server.webSocket.relay.nats.publishTimeoutMs` | `5000` | NATS relay publish timeout |

`server.webSocket.ha.crossReplicaRequiresAmqp` requires the router link before an exec or log session is handed to another replica. `failFastOnRouterUnavailable` fails that handoff when the router is down.

## Console

| YAML | Default | Environment variable |
|---|---|---|
| `console.port` | `8008` | `CONSOLE_PORT` |
| `console.url` | `http://localhost:8008` | `CONSOLE_URL` |

An empty `console.url` falls back to `server.publicUrl`.

## Logging

| YAML | Default | Environment variable |
|---|---|---|
| `log.level` | `info` | `LOG_LEVEL` |
| `log.directory` | `/var/log/iofog-controller` | `LOG_DIRECTORY` |
| `log.fileSize` | `1073741824` | `LOG_FILE_SIZE` |
| `log.fileCount` | `10` | `LOG_FILE_COUNT` |

`log.fileSize` is bytes. The default is 1 GiB. `log.fileCount` is how many files are kept.

## Settings

Intervals below are seconds unless the name ends in `Ms`.

| YAML | Default | Environment variable |
|---|---|---|
| `settings.fogStatusUpdateInterval` | `30` | `FOG_STATUS_UPDATE_INTERVAL` |
| `settings.fogStatusUpdateTolerance` | `3` | `FOG_STATUS_UPDATE_TOLERANCE` |
| `settings.fogStatusLivenessChunkSize` | `50` | `FOG_STATUS_LIVENESS_CHUNK_SIZE` |
| `settings.fogExpiredTokenCleanupInterval` | `300` | `FOG_EXPIRED_TOKEN_CLEANUP_INTERVAL` |
| `settings.eventRetentionDays` | `7` | `EVENT_RETENTION_DAYS` |
| `settings.eventCleanupInterval` | `86400` | `EVENT_CLEANUP_INTERVAL` |
| `settings.eventAuditEnabled` | `true` | `EVENT_AUDIT_ENABLED` |
| `settings.eventCaptureIpAddress` | `true` | `EVENT_CAPTURE_IP_ADDRESS` |
| `settings.controllerHeartbeatInterval` | `30` | `CONTROLLER_HEARTBEAT_INTERVAL` |
| `settings.controllerInactiveThreshold` | `300` | `CONTROLLER_INACTIVE_THRESHOLD` |
| `settings.controllerCleanupInterval` | `600` | `CONTROLLER_CLEANUP_INTERVAL` |
| `settings.fogPlatformReconcileWorkerIntervalSeconds` | `3` | `FOG_PLATFORM_RECONCILE_WORKER_INTERVAL_SECONDS` |
| `settings.fogPlatformReconcileTaskStalenessSeconds` | `300` | `FOG_PLATFORM_RECONCILE_TASK_STALENESS_SECONDS` |
| `settings.fogPlatformDeleteReconcileTaskStalenessSeconds` | `60` | `FOG_PLATFORM_DELETE_RECONCILE_TASK_STALENESS_SECONDS` |
| `settings.fogPlatformReconcileMaxAttempts` | `10` | `FOG_PLATFORM_RECONCILE_MAX_ATTEMPTS` |
| `settings.fogPlatformReconcileBackoffBaseSeconds` | `5` | `FOG_PLATFORM_RECONCILE_BACKOFF_BASE_SECONDS` |
| `settings.fogPlatformSweepIntervalSeconds` | `900` | `FOG_PLATFORM_SWEEP_INTERVAL_SECONDS` |
| `settings.servicePlatformReconcileMaxAttempts` | `10` | `SERVICE_PLATFORM_RECONCILE_MAX_ATTEMPTS` |
| `settings.hubRouterConfigLockTimeoutSeconds` | `120` | `HUB_ROUTER_CONFIG_LOCK_TIMEOUT_SECONDS` |
| `settings.serviceLoadBalancerWatchTimeoutSeconds` | `300` | `SERVICE_LOAD_BALANCER_WATCH_TIMEOUT_SECONDS` |
| `settings.jobStartupDelaySeconds` | `3` | `JOB_STARTUP_DELAY_SECONDS` |
| `settings.reconcileOutboxDrainerIntervalSeconds` | `1` | `RECONCILE_OUTBOX_DRAINER_INTERVAL_SECONDS` |
| `settings.reconcileOutboxDrainerBatchSize` | `32` | `RECONCILE_OUTBOX_DRAINER_BATCH_SIZE` |
| `settings.agentPropagationFogNotifyBatchSize` | `100` | `AGENT_PROPAGATION_FOG_NOTIFY_BATCH_SIZE` |
| `settings.wsSessionReconcileIntervalSeconds` | `60` | `WS_SESSION_RECONCILE_INTERVAL_SECONDS` |
| `settings.sqliteEnterpriseFogWarningThreshold` | `50` | `SQLITE_ENTERPRISE_FOG_WARNING_THRESHOLD` |
| `settings.dbWriteQueueMaxDepth` | `256` | `DB_WRITE_QUEUE_MAX_DEPTH` |
| `settings.dbWriteQueueBackpressureDepth` | `32` | `DB_WRITE_QUEUE_BACKPRESSURE_DEPTH` |
| `settings.dbTransactionTimeoutReadinessMs` | `5000` | `DB_TRANSACTION_TIMEOUT_READINESS_MS` |
| `settings.dbTransactionTimeoutInteractiveMs` | `15000` | `DB_TRANSACTION_TIMEOUT_INTERACTIVE_MS` |
| `settings.dbTransactionTimeoutBackgroundMs` | `120000` | `DB_TRANSACTION_TIMEOUT_BACKGROUND_MS` |
| `settings.dbBusyRetryMaxAttempts` | `8` | `DB_BUSY_RETRY_MAX_ATTEMPTS` |
| `settings.dbBusyRetryBaseMs` | `25` | `DB_BUSY_RETRY_BASE_MS` |

`eventCaptureIpAddress` set to `false` stops storing client addresses on audit events. `controllerInactiveThreshold` is how long a Controller replica can miss heartbeats before it is inactive (5 minutes). `hubRouterConfigLockTimeoutSeconds` is how long a replica waits for the Kubernetes router ConfigMap lock. `sqliteEnterpriseFogWarningThreshold` logs when a sqlite deployment has more agents than this. The `dbWriteQueue*` and `dbTransaction*` and `dbBusyRetry*` keys apply to sqlite.

These YAML keys have no environment variable:

| YAML | Default | Meaning |
|---|---|---|
| `settings.natsReconcileChunkSize` | `1` | Agents handled in one NATS reconcile task |
| `settings.natsReconcileTaskStalenessSeconds` | `900` | When a stuck NATS reconcile task can be reclaimed |
| `settings.natsReconcileWorkerIntervalSeconds` | `3` | How often the NATS reconcile worker polls |

`settings.defaultJobInterval` is commented out and has no environment variable. It is not loaded.

## Database

| YAML | Default | Environment variable |
|---|---|---|
| `database.provider` | `sqlite` | `DB_PROVIDER` |

`DB_PROVIDER` is `sqlite`, `mysql`, or `postgres`. The six variables below land on that provider's section.

| Environment variable | Field under `database.<provider>` | MySQL / Postgres comment in the file |
|---|---|---|
| `DB_HOST` | `host` | empty |
| `DB_PORT` | `port` | `3306` / `5432` |
| `DB_USERNAME` | `username` | empty |
| `DB_PASSWORD` | `password` | empty |
| `DB_NAME` | `databaseName` | empty; sqlite default is `controller_db.sqlite` |
| `DB_USE_SSL` | `useSSL` | `false` |
| `DB_SSL_CA` | `sslCA` | empty. Base64 CA |

MySQL and Postgres `host`, `port`, `username`, `password`, `databaseName`, `useSSL`, and `sslCA` are commented out, so they exist only after you uncomment them or set `DB_*`. Pool sizes are active and have no environment variable.

| YAML | Default |
|---|---|
| `database.mysql.pool.max` | `10` |
| `database.mysql.pool.min` | `0` |
| `database.mysql.pool.idle` | `20000` |
| `database.postgres.pool.max` | `10` |
| `database.postgres.pool.min` | `0` |
| `database.postgres.pool.idle` | `20000` |
| `database.sqlite.logging` | `false` |
| `database.sqlite.transactionType` | `IMMEDIATE` |
| `database.sqlite.pragmas.journalMode` | `WAL` |
| `database.sqlite.pragmas.busyTimeoutMs` | `10000` |
| `database.sqlite.pragmas.synchronous` | `NORMAL` |
| `database.sqlite.pool.maxActive` | `1` |
| `database.sqlite.pool.max` | `1` |
| `database.sqlite.pool.min` | `0` |
| `database.sqlite.pool.idle` | `20000` |

`pool.idle` is milliseconds. Sqlite keeps one active connection. The write queue and busy-retry settings in the previous section sit in front of that connection.

## Auth

The auth block in the default file only activates `mode`, `insecureAllowHttp`, and `insecureAllowBootstrapLog`. Every other auth key below is commented out and is created when you uncomment it or set the variable.

| YAML | Default when set | Environment variable |
|---|---|---|
| `auth.mode` | `embedded` | `AUTH_MODE` |
| `auth.insecureAllowHttp` | `false` | `AUTH_INSECURE_ALLOW_HTTP` |
| `auth.insecureAllowBootstrapLog` | `false` | `AUTH_INSECURE_ALLOW_BOOTSTRAP_LOG` |
| `auth.bootstrap.username` | empty | `OIDC_BOOTSTRAP_ADMIN_USERNAME` |
| `auth.bootstrap.password` | empty | `OIDC_BOOTSTRAP_ADMIN_PASSWORD` |
| `auth.issuerUrl` | empty | `OIDC_ISSUER_URL` |
| `auth.issuer.tls.path.ca` | empty | `OIDC_ISSUER_TLS_PATH_CA` |
| `auth.issuer.tls.base64.ca` | empty | `OIDC_ISSUER_TLS_BASE64_CA` |
| `auth.client.id` | empty | `OIDC_CLIENT_ID` |
| `auth.client.secret` | empty | `OIDC_CLIENT_SECRET` |
| `auth.consoleClient` | empty | `OIDC_CONSOLE_CLIENT_ID` |
| `auth.consoleClient.enabled` |  | `AUTH_CONSOLE_CLIENT_ENABLED` |
| `auth.rateLimit.enabled` | `true` | `AUTH_RATE_LIMIT_ENABLED` |
| `auth.rateLimit.maxRequestsPerWindow` | `60` | `AUTH_RATE_LIMIT_MAX_REQUESTS` |
| `auth.rateLimit.windowMs` | `60000` | `AUTH_RATE_LIMIT_WINDOW_MS` |
| `auth.sessionStore.type` | `memory` | `AUTH_SESSION_STORE_TYPE` |
| `auth.sessionStore.ttlMs` | `600000` | `AUTH_SESSION_STORE_TTL_MS` |
| `auth.sessionStore.secret` | empty | `AUTH_SESSION_SECRET` |
| `auth.tokenTtl.accessTokenTtlSeconds` | `900` | `AUTH_ACCESS_TOKEN_TTL_SECONDS` |
| `auth.tokenTtl.refreshTokenTtlSeconds` | `3600` | `AUTH_REFRESH_TOKEN_TTL_SECONDS` |
| `auth.oidcTtl.interactionTtlSeconds` | session TTL in seconds | `AUTH_OIDC_INTERACTION_TTL_SECONDS` |
| `auth.oidcTtl.grantTtlSeconds` | interaction TTL | `AUTH_OIDC_GRANT_TTL_SECONDS` |
| `auth.oidcTtl.sessionTtlSeconds` | refresh-token TTL | `AUTH_OIDC_SESSION_TTL_SECONDS` |
| `auth.oidcTtl.idTokenTtlSeconds` | access-token TTL | `AUTH_OIDC_ID_TOKEN_TTL_SECONDS` |

`auth.mode` is `embedded` or `external`. External mode uses `auth.issuerUrl`, `auth.client.id`, and `auth.client.secret`. Embedded mode runs the issuer inside Controller. The bootstrap username and password create the first admin. `auth.insecureAllowHttp` allows an `http` public URL in production. `auth.insecureAllowBootstrapLog` allows the bootstrap password path to be logged in production.

External mode can trust an HTTPS issuer signed by a private CA. Set `OIDC_ISSUER_TLS_PATH_CA` or `OIDC_ISSUER_TLS_BASE64_CA`. Path wins when both are set. The value is a PEM CA or a concatenated PEM bundle. Base64 is those PEM bytes. Controller adds that CA to the Mozilla roots for discovery, the token call, and JWKS. Certificate checks stay on. Embedded mode ignores these keys. `NODE_EXTRA_CA_CERTS` remains a process-wide alternative.

`OIDC_CONSOLE_CLIENT_ID` sets `auth.consoleClient` to the console client id string. The console client id is also read from `auth.consoleClient.id` when that key is an object. `AUTH_CONSOLE_CLIENT_ENABLED` sets `auth.consoleClient.enabled` and defaults to false when unset. Set the enabled flag when the console client should be registered. The id falls back to `ecn-viewer` when nothing is configured.

`auth.sessionStore.type` is `memory` or `database`. When it is unset, mysql and postgres use `database` and sqlite uses `memory`. An empty `auth.sessionStore.secret` is generated and stored. `auth.rateLimit.windowMs` is the per-IP window for auth endpoints.

Token TTL values must be positive seconds. When an `auth.oidcTtl.*` value is omitted, it uses the fallback in the table: interaction TTL is the session-store TTL converted to seconds, grant TTL copies interaction TTL, session TTL copies the refresh-token TTL, and id-token TTL copies the access-token TTL. The policy defaults under those overrides are 900 seconds for access tokens and 3600 seconds for refresh tokens.

`OIDC_COOKIE_KEYS` is read directly and is not in the mapping file. It overrides `auth.cookieKeys`. A string is split on commas. The default is a single built-in key.

## Bridge ports and system images

| YAML | Default | Environment variable |
|---|---|---|
| `bridgePorts.range` | `10024-65535` | `BRIDGE_PORTS_RANGE` |

This is the inclusive range Controller assigns to a Service `bridgePort`. Keep it a string (`10024-65535`). A bare number is stored as a number and is not a range.

System images are selected by architecture id:

| Id | Architecture |
|---|---|
| `1` | amd64 / x86 |
| `2` | arm64 |
| `3` | riscv64 |
| `4` | arm |

The default image for every id is `ghcr.io/eclipse-iofog/router:latest`, `ghcr.io/eclipse-iofog/debugger:latest`, or `ghcr.io/eclipse-iofog/nats:latest`.

| YAML | Environment variable |
|---|---|
| `systemImages.router.1` | `ROUTER_IMAGE_1` |
| `systemImages.router.2` | `ROUTER_IMAGE_2` |
| `systemImages.router.3` | `ROUTER_IMAGE_3` |
| `systemImages.router.4` | `ROUTER_IMAGE_4` |
| `systemImages.debug.1` | `DEBUG_IMAGE_1` |
| `systemImages.debug.2` | `DEBUG_IMAGE_2` |
| `systemImages.debug.3` | `DEBUG_IMAGE_3` |
| `systemImages.debug.4` | `DEBUG_IMAGE_4` |
| `systemImages.nats.1` | `NATS_IMAGE_1` |
| `systemImages.nats.2` | `NATS_IMAGE_2` |
| `systemImages.nats.3` | `NATS_IMAGE_3` |
| `systemImages.nats.4` | `NATS_IMAGE_4` |

## NATS

| YAML | Default | Environment variable |
|---|---|---|
| `nats.enabled` | `true` | `NATS_ENABLED` |

This switch is the Controller NATS relay. It does not turn off the per-agent NATS system microservice. Agent brokers are created from `natsMode` on the agent. See [networking-topology-messaging-fabric.md](networking-topology-messaging-fabric.md).

## Vault

The whole `vault:` block is commented out. These variables create it.

| YAML | Default in the comment | Environment variable |
|---|---|---|
| `vault.enabled` | `false` | `VAULT_ENABLED` |
| `vault.provider` | `hashicorp` | `VAULT_PROVIDER` |
| `vault.basePath` | `pot/$namespace/secrets` | `VAULT_BASE_PATH` |
| `vault.hashicorp.address` | `http://localhost:8200` | `VAULT_HASHICORP_ADDRESS` |
| `vault.hashicorp.token` | empty | `VAULT_HASHICORP_TOKEN` |
| `vault.hashicorp.mount` | `kv` | `VAULT_HASHICORP_MOUNT` |
| `vault.aws.region` | `us-east-1` | `VAULT_AWS_REGION` |
| `vault.aws.accessKeyId` | empty | `VAULT_AWS_ACCESS_KEY_ID` |
| `vault.aws.accessKey` | empty | `VAULT_AWS_ACCESS_KEY` |
| `vault.azure.url` | `https://your-vault.vault.azure.net` | `VAULT_AZURE_URL` |
| `vault.azure.tenantId` | empty | `VAULT_AZURE_TENANT_ID` |
| `vault.azure.clientId` | empty | `VAULT_AZURE_CLIENT_ID` |
| `vault.azure.clientSecret` | empty | `VAULT_AZURE_CLIENT_SECRET` |
| `vault.google.projectId` | empty | `VAULT_GOOGLE_PROJECT_ID` |
| `vault.google.credentials` | empty | `VAULT_GOOGLE_CREDENTIALS` |

`vault.provider` is `hashicorp`, `openbao`, `vault`, `aws`, `aws-secrets-manager`, `azure`, `azure-key-vault`, `google`, or `google-secret-manager`. `$namespace` in `vault.basePath` is replaced with `app.namespace`. When vault is enabled, secrets and private keys go to the provider instead of the encrypted database columns.

The vault client also accepts these variables directly. They are not in the mapping file, so they do not change the YAML tree. They are fallbacks when the mapped variable and the YAML key are both empty:

| Fallback | Used when this mapped variable is empty |
|---|---|
| `AWS_REGION` | `VAULT_AWS_REGION` |
| `AWS_ACCESS_KEY_ID` | `VAULT_AWS_ACCESS_KEY_ID` |
| `AWS_SECRET_ACCESS_KEY` | `VAULT_AWS_ACCESS_KEY` |
| `AZURE_TENANT_ID` | `VAULT_AZURE_TENANT_ID` |
| `AZURE_CLIENT_ID` | `VAULT_AZURE_CLIENT_ID` |
| `AZURE_CLIENT_SECRET` | `VAULT_AZURE_CLIENT_SECRET` |
| `GOOGLE_APPLICATION_CREDENTIALS` | `VAULT_GOOGLE_CREDENTIALS` |

AWS region must look like `us-east-1`. If an access key id is set, the secret key is required, and the reverse. Azure service-principal auth requires tenant id, client id, and client secret together. `vault.google.projectId` is required for Google Secret Manager. `vault.google.credentials` is a path to the service-account key file.

## OpenTelemetry

The whole `otel:` block is commented out. Unlike every other section, a set `OTEL_*` or `ENABLE_TELEMETRY` variable is kept and is not overwritten from YAML. An unset variable is filled from YAML when that key is present.

| YAML | Default in the comment | Environment variable |
|---|---|---|
| `otel.enabled` | `false` | `ENABLE_TELEMETRY` |
| `otel.serviceName` | `pot-controller` | `OTEL_SERVICE_NAME` |
| `otel.endpoint` | `http://localhost:4318/v1/traces` | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| `otel.protocol` | `http/protobuf` | `OTEL_EXPORTER_OTLP_PROTOCOL` |
| `otel.headers` | empty | `OTEL_EXPORTER_OTLP_HEADERS` |
| `otel.resourceAttributes` | `service.version=3.5.0,deployment.environment=production,team=devops` | `OTEL_RESOURCE_ATTRIBUTES` |
| `otel.metrics.exporter` | `otlp` | `OTEL_METRICS_EXPORTER` |
| `otel.metrics.interval` | `1000` | `OTEL_METRICS_INTERVAL` |
| `otel.logs.level` | `info` | `OTEL_LOG_LEVEL` |
| `otel.propagators` | `tracecontext,baggage` | `OTEL_PROPAGATORS` |
| `otel.traces.sampler` | `parentbased_traceidratio` | `OTEL_TRACES_SAMPLER` |
| `otel.traces.samplerArg` | `0.1` | `OTEL_TRACES_SAMPLER_ARG` |
| `otel.batch.size` | `512` | `OTEL_BATCH_SIZE` |
| `otel.batch.delay` | `1000` | `OTEL_BATCH_DELAY` |

`otel.protocol` is `grpc` or `http/protobuf`. `otel.metrics.interval` and `otel.batch.delay` are milliseconds. `otel.headers` is the header list applied to outgoing traces, metrics, and logs. `otel.resourceAttributes` is a comma-separated `key=value` list.
