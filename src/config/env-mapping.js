module.exports = {
  // Application Configuration
  CONTROLLER_NAME: 'app.name',
  CONTROLLER_UUID: 'app.uuid',
  CONTROL_PLANE: 'app.controlPlane',
  CONTROLLER_NAMESPACE: 'app.namespace',
  CONTROLLER_DISTRIBUTION: 'flavor.distribution',
  RBAC_API_VERSION: 'flavor.rbacApiVersion',
  SERVICE_ANNOTATION_TAG: 'flavor.serviceAnnotationTag',
  COMPONENT_LABEL_DOMAIN: 'flavor.componentLabelDomain',

  // Server Configuration
  SERVER_PORT: 'server.port',
  SERVER_DEV_MODE: 'server.devMode',
  CONTROLLER_PUBLIC_URL: 'server.publicUrl',
  TRUST_PROXY: 'server.trustProxy',

  WS_PING_INTERVAL: 'server.webSocket.pingInterval',
  WS_PONG_TIMEOUT: 'server.webSocket.pongTimeout',
  WS_MAX_PAYLOAD: 'server.webSocket.maxPayload',
  WS_SESSION_TIMEOUT: 'server.webSocket.session.timeout',
  WS_SESSION_MAX_CONNECTIONS: 'server.webSocket.session.maxConnections',
  WS_CLEANUP_INTERVAL: 'server.webSocket.session.cleanupInterval',
  WS_EXEC_PENDING_TIMEOUT_MS: 'server.webSocket.session.execPendingTimeoutMs',
  WS_EXEC_MAX_DURATION_MS: 'server.webSocket.session.execMaxDurationMs',
  WS_EXEC_MAX_CONCURRENT_PER_RESOURCE: 'server.webSocket.session.execMaxConcurrentPerResource',
  WS_LOG_PENDING_TIMEOUT_MS: 'server.webSocket.session.logPendingTimeoutMs',
  WS_LOG_IDLE_TIMEOUT_MS: 'server.webSocket.session.logIdleTimeoutMs',
  WS_LOG_MAX_CONCURRENT_PER_RESOURCE: 'server.webSocket.session.logMaxConcurrentPerResource',
  WS_LOG_TAIL_MAX_LINES: 'server.webSocket.session.logTailMaxLines',
  WS_REPLICA_MAX_CONCURRENT_WS: 'server.webSocket.session.replicaMaxConcurrentWs',
  WS_DRAIN_TIMEOUT_MS: 'server.webSocket.session.drainTimeoutMs',
  WS_HA_CROSS_REPLICA_REQUIRES_AMQP: 'server.webSocket.ha.crossReplicaRequiresAmqp',
  WS_HA_FAIL_FAST_ON_ROUTER_UNAVAILABLE: 'server.webSocket.ha.failFastOnRouterUnavailable',
  WS_SESSION_RECONCILE_INTERVAL_SECONDS: 'settings.wsSessionReconcileIntervalSeconds',
  WS_SECURITY_MAX_CONNECTIONS_PER_IP: 'server.webSocket.security.maxConnectionsPerIp',
  WS_SECURITY_MAX_REQUESTS_PER_MINUTE: 'server.webSocket.security.maxRequestsPerMinute',
  WS_SECURITY_MAX_PAYLOAD: 'server.webSocket.security.maxPayload',

  // TLS Configuration (listener certificates; env TLS_* per Plan 8.1)
  TLS_PATH_KEY: 'server.tls.path.key',
  TLS_PATH_CERT: 'server.tls.path.cert',
  TLS_PATH_INTERMEDIATE_CERT: 'server.tls.path.intermediateCert',
  TLS_BASE64_KEY: 'server.tls.base64.key',
  TLS_BASE64_CERT: 'server.tls.base64.cert',
  TLS_BASE64_INTERMEDIATE_CERT: 'server.tls.base64.intermediateCert',

  // Console Configuration
  CONSOLE_PORT: 'console.port',
  CONSOLE_URL: 'console.url',

  // Logging Configuration
  LOG_LEVEL: 'log.level',
  LOG_DIRECTORY: 'log.directory',
  LOG_FILE_SIZE: 'log.fileSize',
  LOG_FILE_COUNT: 'log.fileCount',

  // Settings Configuration
  FOG_STATUS_UPDATE_INTERVAL: 'settings.fogStatusUpdateInterval',
  FOG_STATUS_UPDATE_TOLERANCE: 'settings.fogStatusUpdateTolerance',
  FOG_EXPIRED_TOKEN_CLEANUP_INTERVAL: 'settings.fogExpiredTokenCleanupInterval',
  EVENT_RETENTION_DAYS: 'settings.eventRetentionDays',
  EVENT_CLEANUP_INTERVAL: 'settings.eventCleanupInterval',
  EVENT_AUDIT_ENABLED: 'settings.eventAuditEnabled',
  EVENT_CAPTURE_IP_ADDRESS: 'settings.eventCaptureIpAddress',
  CONTROLLER_HEARTBEAT_INTERVAL: 'settings.controllerHeartbeatInterval',
  CONTROLLER_INACTIVE_THRESHOLD: 'settings.controllerInactiveThreshold',
  CONTROLLER_CLEANUP_INTERVAL: 'settings.controllerCleanupInterval',
  FOG_PLATFORM_RECONCILE_WORKER_INTERVAL_SECONDS: 'settings.fogPlatformReconcileWorkerIntervalSeconds',
  FOG_PLATFORM_RECONCILE_TASK_STALENESS_SECONDS: 'settings.fogPlatformReconcileTaskStalenessSeconds',
  FOG_PLATFORM_DELETE_RECONCILE_TASK_STALENESS_SECONDS: 'settings.fogPlatformDeleteReconcileTaskStalenessSeconds',
  FOG_PLATFORM_RECONCILE_MAX_ATTEMPTS: 'settings.fogPlatformReconcileMaxAttempts',
  FOG_PLATFORM_RECONCILE_BACKOFF_BASE_SECONDS: 'settings.fogPlatformReconcileBackoffBaseSeconds',
  FOG_PLATFORM_SWEEP_INTERVAL_SECONDS: 'settings.fogPlatformSweepIntervalSeconds',
  SERVICE_PLATFORM_RECONCILE_MAX_ATTEMPTS: 'settings.servicePlatformReconcileMaxAttempts',
  HUB_ROUTER_CONFIG_LOCK_TIMEOUT_SECONDS: 'settings.hubRouterConfigLockTimeoutSeconds',
  SERVICE_LOAD_BALANCER_WATCH_TIMEOUT_SECONDS: 'settings.serviceLoadBalancerWatchTimeoutSeconds',
  JOB_STARTUP_DELAY_SECONDS: 'settings.jobStartupDelaySeconds',
  RECONCILE_OUTBOX_DRAINER_INTERVAL_SECONDS: 'settings.reconcileOutboxDrainerIntervalSeconds',
  RECONCILE_OUTBOX_DRAINER_BATCH_SIZE: 'settings.reconcileOutboxDrainerBatchSize',
  SQLITE_ENTERPRISE_FOG_WARNING_THRESHOLD: 'settings.sqliteEnterpriseFogWarningThreshold',
  DB_WRITE_QUEUE_MAX_DEPTH: 'settings.dbWriteQueueMaxDepth',
  DB_WRITE_QUEUE_BACKPRESSURE_DEPTH: 'settings.dbWriteQueueBackpressureDepth',
  DB_TRANSACTION_TIMEOUT_READINESS_MS: 'settings.dbTransactionTimeoutReadinessMs',
  DB_TRANSACTION_TIMEOUT_INTERACTIVE_MS: 'settings.dbTransactionTimeoutInteractiveMs',
  DB_TRANSACTION_TIMEOUT_BACKGROUND_MS: 'settings.dbTransactionTimeoutBackgroundMs',
  DB_BUSY_RETRY_MAX_ATTEMPTS: 'settings.dbBusyRetryMaxAttempts',
  DB_BUSY_RETRY_BASE_MS: 'settings.dbBusyRetryBaseMs',

  // Database Configuration
  DB_PROVIDER: 'database.provider',
  // These will map to the appropriate provider based on DB_PROVIDER
  DB_HOST: {
    path: (provider) => `database.${provider}.host`
  },
  DB_PORT: {
    path: (provider) => `database.${provider}.port`
  },
  DB_USERNAME: {
    path: (provider) => `database.${provider}.username`
  },
  DB_PASSWORD: {
    path: (provider) => `database.${provider}.password`
  },
  DB_NAME: {
    path: (provider) => `database.${provider}.databaseName`
  },
  DB_USE_SSL: {
    path: (provider) => `database.${provider}.useSSL`
  },
  DB_SSL_CA: {
    path: (provider) => `database.${provider}.sslCA`
  },

  // Auth Configuration (OIDC — k8s-style; naming-map §13)
  AUTH_MODE: 'auth.mode',
  OIDC_ISSUER_URL: 'auth.issuerUrl',
  OIDC_CLIENT_ID: 'auth.client.id',
  OIDC_CLIENT_SECRET: 'auth.client.secret',
  OIDC_CONSOLE_CLIENT_ID: 'auth.consoleClient',
  AUTH_CONSOLE_CLIENT_ENABLED: 'auth.consoleClient.enabled',
  AUTH_INSECURE_ALLOW_HTTP: 'auth.insecureAllowHttp',
  OIDC_BOOTSTRAP_ADMIN_USERNAME: 'auth.bootstrap.username',
  OIDC_BOOTSTRAP_ADMIN_PASSWORD: 'auth.bootstrap.password',
  AUTH_INSECURE_ALLOW_BOOTSTRAP_LOG: 'auth.insecureAllowBootstrapLog',
  AUTH_RATE_LIMIT_ENABLED: 'auth.rateLimit.enabled',
  AUTH_RATE_LIMIT_MAX_REQUESTS: 'auth.rateLimit.maxRequestsPerWindow',
  AUTH_RATE_LIMIT_WINDOW_MS: 'auth.rateLimit.windowMs',
  AUTH_SESSION_STORE_TYPE: 'auth.sessionStore.type',
  AUTH_SESSION_STORE_TTL_MS: 'auth.sessionStore.ttlMs',
  AUTH_SESSION_SECRET: 'auth.sessionStore.secret',
  AUTH_OIDC_INTERACTION_TTL_SECONDS: 'auth.oidcTtl.interactionTtlSeconds',
  AUTH_OIDC_GRANT_TTL_SECONDS: 'auth.oidcTtl.grantTtlSeconds',
  AUTH_OIDC_SESSION_TTL_SECONDS: 'auth.oidcTtl.sessionTtlSeconds',
  AUTH_OIDC_ID_TOKEN_TTL_SECONDS: 'auth.oidcTtl.idTokenTtlSeconds',
  AUTH_ACCESS_TOKEN_TTL_SECONDS: 'auth.tokenTtl.accessTokenTtlSeconds',
  AUTH_REFRESH_TOKEN_TTL_SECONDS: 'auth.tokenTtl.refreshTokenTtlSeconds',

  // Bridge Ports Configuration
  BRIDGE_PORTS_RANGE: 'bridgePorts.range',

  // System Images Configuration
  ROUTER_IMAGE_1: 'systemImages.router.1',
  ROUTER_IMAGE_2: 'systemImages.router.2',
  ROUTER_IMAGE_3: 'systemImages.router.3',
  ROUTER_IMAGE_4: 'systemImages.router.4',
  DEBUG_IMAGE_1: 'systemImages.debug.1',
  DEBUG_IMAGE_2: 'systemImages.debug.2',
  DEBUG_IMAGE_3: 'systemImages.debug.3',
  DEBUG_IMAGE_4: 'systemImages.debug.4',
  NATS_IMAGE_1: 'systemImages.nats.1',
  NATS_IMAGE_2: 'systemImages.nats.2',
  NATS_IMAGE_3: 'systemImages.nats.3',
  NATS_IMAGE_4: 'systemImages.nats.4',

  // NATS Configuration
  NATS_ENABLED: 'nats.enabled',

  // Vault Configuration
  VAULT_ENABLED: 'vault.enabled',
  VAULT_PROVIDER: 'vault.provider',
  VAULT_BASE_PATH: 'vault.basePath',
  // HashiCorp Vault
  VAULT_HASHICORP_ADDRESS: 'vault.hashicorp.address',
  VAULT_HASHICORP_TOKEN: 'vault.hashicorp.token',
  VAULT_HASHICORP_MOUNT: 'vault.hashicorp.mount',
  // AWS Secrets Manager
  VAULT_AWS_REGION: 'vault.aws.region',
  VAULT_AWS_ACCESS_KEY_ID: 'vault.aws.accessKeyId',
  VAULT_AWS_ACCESS_KEY: 'vault.aws.accessKey',
  // Azure Key Vault
  VAULT_AZURE_URL: 'vault.azure.url',
  VAULT_AZURE_TENANT_ID: 'vault.azure.tenantId',
  VAULT_AZURE_CLIENT_ID: 'vault.azure.clientId',
  VAULT_AZURE_CLIENT_SECRET: 'vault.azure.clientSecret',
  // Google Secret Manager
  VAULT_GOOGLE_PROJECT_ID: 'vault.google.projectId',
  VAULT_GOOGLE_CREDENTIALS: 'vault.google.credentials',

  // OpenTelemetry Configuration
  ENABLE_TELEMETRY: 'otel.enabled',
  OTEL_SERVICE_NAME: 'otel.serviceName',
  OTEL_EXPORTER_OTLP_ENDPOINT: 'otel.endpoint',
  OTEL_EXPORTER_OTLP_PROTOCOL: 'otel.protocol',
  OTEL_EXPORTER_OTLP_HEADERS: 'otel.headers',
  OTEL_RESOURCE_ATTRIBUTES: 'otel.resourceAttributes',
  OTEL_METRICS_EXPORTER: 'otel.metrics.exporter',
  OTEL_METRICS_INTERVAL: 'otel.metrics.interval',
  OTEL_LOG_LEVEL: 'otel.logs.level',
  OTEL_PROPAGATORS: 'otel.propagators',
  OTEL_TRACES_SAMPLER: 'otel.traces.sampler',
  OTEL_TRACES_SAMPLER_ARG: 'otel.traces.samplerArg',
  OTEL_BATCH_SIZE: 'otel.batch.size',
  OTEL_BATCH_DELAY: 'otel.batch.delay'
}
