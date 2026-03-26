# OpenTelemetry Test Setup

This directory contains the necessary configuration files to test OpenTelemetry integration with Jaeger, Prometheus, and Grafana.

## Prerequisites

- Docker
- Docker Compose

## Setup

1. Start the observability stack:
```bash
docker-compose up -d
```

2. Access the UIs:
- Jaeger UI: http://localhost:16686
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (login with admin/admin)

## Testing Your Application

To test your application with this setup:

1. Set the environment variables:
```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export OTEL_SERVICE_NAME=your-service-name
```

2. Run your application with OpenTelemetry:
```bash
sudo -E node  -r dotenv/config src/server.js
```

## Verifying the Setup

1. Make some requests to your application
2. Open Jaeger UI (http://localhost:16686)
3. Select your service from the dropdown
4. Click "Find Traces"
5. You should see traces from your application

## Cleanup

To stop and remove all containers:
```bash
docker-compose down -v
``` 