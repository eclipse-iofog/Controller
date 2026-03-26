module.exports = {
  // Application Configuration
  'CONTROLLER_NAME': 'app.name',
  'CONTROLLER_UUID': 'app.uuid',
  'CONTROL_PLANE': 'app.controlPlane',
  'CONTROLLER_NAMESPACE': 'app.namespace',

  // Server Configuration
  'SERVER_PORT': 'server.port',
  'SERVER_DEV_MODE': 'server.devMode',

  'WS_PING_INTERVAL': 'server.webSocket.pingInterval',
  'WS_PONG_TIMEOUT': 'server.webSocket.pongTimeout',
  'WS_MAX_PAYLOAD': 'server.webSocket.maxPayload',
  'WS_SESSION_TIMEOUT': 'server.webSocket.session.timeout',
  'WS_SESSION_MAX_CONNECTIONS': 'server.webSocket.session.maxConnections',
  'WS_CLEANUP_INTERVAL': 'server.webSocket.session.cleanupInterval',
  'WS_SECURITY_MAX_CONNECTIONS_PER_IP': 'server.webSocket.security.maxConnectionsPerIp',
  'WS_SECURITY_MAX_REQUESTS_PER_MINUTE': 'server.webSocket.security.maxRequestsPerMinute',
  'WS_SECURITY_MAX_PAYLOAD': 'server.webSocket.security.maxPayload',

  // SSL Configuration
  'SSL_PATH_KEY': 'server.ssl.path.key',
  'SSL_PATH_CERT': 'server.ssl.path.cert',
  'SSL_PATH_INTERMEDIATE_CERT': 'server.ssl.path.intermediateCert',
  'SSL_BASE64_KEY': 'server.ssl.base64.key',
  'SSL_BASE64_CERT': 'server.ssl.base64.cert',
  'SSL_BASE64_INTERMEDIATE_CERT': 'server.ssl.base64.intermediateCert',

  // Viewer Configuration
  'VIEWER_PORT': 'viewer.port',
  'VIEWER_URL': 'viewer.url',

  // Logging Configuration
  'LOG_LEVEL': 'log.level',
  'LOG_DIRECTORY': 'log.directory',
  'LOG_FILE_SIZE': 'log.fileSize',
  'LOG_FILE_COUNT': 'log.fileCount',

  // Settings Configuration
  'FOG_STATUS_UPDATE_INTERVAL': 'settings.fogStatusUpdateInterval',
  'FOG_STATUS_UPDATE_TOLERANCE': 'settings.fogStatusUpdateTolerance',
  'FOG_EXPIRED_TOKEN_CLEANUP_INTERVAL': 'settings.fogExpiredTokenCleanupInterval',
  'EVENT_RETENTION_DAYS': 'settings.eventRetentionDays',
  'EVENT_CLEANUP_INTERVAL': 'settings.eventCleanupInterval',
  'EVENT_AUDIT_ENABLED': 'settings.eventAuditEnabled',
  'EVENT_CAPTURE_IP_ADDRESS': 'settings.eventCaptureIpAddress',
  'CONTROLLER_HEARTBEAT_INTERVAL': 'settings.controllerHeartbeatInterval',
  'CONTROLLER_INACTIVE_THRESHOLD': 'settings.controllerInactiveThreshold',
  'CONTROLLER_CLEANUP_INTERVAL': 'settings.controllerCleanupInterval',

  // Database Configuration
  'DB_PROVIDER': 'database.provider',
  // These will map to the appropriate provider based on DB_PROVIDER
  'DB_HOST': {
    path: (provider) => `database.${provider}.host`
  },
  'DB_PORT': {
    path: (provider) => `database.${provider}.port`
  },
  'DB_USERNAME': {
    path: (provider) => `database.${provider}.username`
  },
  'DB_PASSWORD': {
    path: (provider) => `database.${provider}.password`
  },
  'DB_NAME': {
    path: (provider) => `database.${provider}.databaseName`
  },
  'DB_USE_SSL': {
    path: (provider) => `database.${provider}.useSSL`
  },
  'DB_SSL_CA': {
    path: (provider) => `database.${provider}.sslCA`
  },

  // Auth Configuration
  'KC_REALM': 'auth.realm',
  'KC_REALM_KEY': 'auth.realmKey',
  'KC_URL': 'auth.url',
  'KC_SSL_REQ': 'auth.sslRequired',
  'KC_CLIENT': 'auth.client.id',
  'KC_CLIENT_SECRET': 'auth.client.secret',
  'KC_VIEWER_CLIENT': 'auth.viewerClient',

  // Bridge Ports Configuration
  'BRIDGE_PORTS_RANGE': 'bridgePorts.range',

  // System Images Configuration
  'ROUTER_IMAGE_1': 'systemImages.router.1',
  'ROUTER_IMAGE_2': 'systemImages.router.2',
  'DEBUG_IMAGE_1': 'systemImages.debug.1',
  'DEBUG_IMAGE_2': 'systemImages.debug.2',
  'NATS_IMAGE_1': 'systemImages.nats.1',
  'NATS_IMAGE_2': 'systemImages.nats.2',

  // NATS Configuration
  'NATS_ENABLED': 'nats.enabled',

  // Diagnostics Configuration
  'DIAGNOSTICS_DIRECTORY': 'diagnostics.directory',

  // Vault Configuration
  'VAULT_ENABLED': 'vault.enabled',
  'VAULT_PROVIDER': 'vault.provider',
  'VAULT_BASE_PATH': 'vault.basePath',
  // HashiCorp Vault
  'VAULT_HASHICORP_ADDRESS': 'vault.hashicorp.address',
  'VAULT_HASHICORP_TOKEN': 'vault.hashicorp.token',
  'VAULT_HASHICORP_MOUNT': 'vault.hashicorp.mount',
  // AWS Secrets Manager
  'VAULT_AWS_REGION': 'vault.aws.region',
  'VAULT_AWS_ACCESS_KEY_ID': 'vault.aws.accessKeyId',
  'VAULT_AWS_ACCESS_KEY': 'vault.aws.accessKey',
  // Azure Key Vault
  'VAULT_AZURE_URL': 'vault.azure.url',
  'VAULT_AZURE_TENANT_ID': 'vault.azure.tenantId',
  'VAULT_AZURE_CLIENT_ID': 'vault.azure.clientId',
  'VAULT_AZURE_CLIENT_SECRET': 'vault.azure.clientSecret',
  // Google Secret Manager
  'VAULT_GOOGLE_PROJECT_ID': 'vault.google.projectId',
  'VAULT_GOOGLE_CREDENTIALS': 'vault.google.credentials',

  // OpenTelemetry Configuration
  'ENABLE_TELEMETRY': 'otel.enabled',
  'OTEL_SERVICE_NAME': 'otel.serviceName',
  'OTEL_EXPORTER_OTLP_ENDPOINT': 'otel.endpoint',
  'OTEL_EXPORTER_OTLP_PROTOCOL': 'otel.protocol',
  'OTEL_EXPORTER_OTLP_HEADERS': 'otel.headers',
  'OTEL_RESOURCE_ATTRIBUTES': 'otel.resourceAttributes',
  'OTEL_METRICS_EXPORTER': 'otel.metrics.exporter',
  'OTEL_METRICS_INTERVAL': 'otel.metrics.interval',
  'OTEL_LOG_LEVEL': 'otel.logs.level',
  'OTEL_PROPAGATORS': 'otel.propagators',
  'OTEL_TRACES_SAMPLER': 'otel.traces.sampler',
  'OTEL_TRACES_SAMPLER_ARG': 'otel.traces.samplerArg',
  'OTEL_BATCH_SIZE': 'otel.batch.size',
  'OTEL_BATCH_DELAY': 'otel.batch.delay'
}
