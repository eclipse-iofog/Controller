# Changelog

## [v3.8.0] - 2026-06-17

Controller v3.8 is a **greenfield** release aligned with **Edgelet**. There is **no upgrade path** from v3.7: use a fresh database and redeploy Controller + Edgelet together.

### Breaking changes

#### Agent runtime

- **Edgelet only** — v3.7 legacy field agents are **not supported**.
- Requires **Edgelet v1.0.0-rc.1+** on the same release train (pin e.g. `v1.0.0-rc.1` with Controller `v3.8.0`).
- Provision accepts `containerEngine`: `edgelet` | `docker` | `podman` (was docker-implied).
- Agent config: `dockerUrl` → **`containerEngineUrl`**; `dockerPruningFrequency` → **`pruningFrequency`**.
- Agent architecture: `fogType` / `fogTypeId` → **`arch`** / **`archId`** (ids: 0=auto, 1=amd64, 2=arm64, 3=riscv64, 4=arm).
- Agent status: removed **`processedMessages`**, **`messageSpeed`**; added **`availableRuntimes`**, optional **`runtimeAgentPhase`**, **`controlPlaneQuiesced`**.
- Default container registry: **`docker.io`** (was `registry.hub.docker.com`).
- Reserved ports: **54321**, **54322**, **53**.
- New field-agent endpoint: **`POST /api/v3/agent/controller/register`** (system fogs only; Edgelet rc.1+).

#### API — architectures and applications

- **`GET /api/v3/fog-types`** → **`GET /api/v3/architectures/`** (public).
- **`/api/v3/flow/*`** → **`/api/v3/application/*`**; RBAC resource **`flows`** → **`applications`**.
- Microservice create: **`application`** string (name) in body — **`flowId` query param removed**.
- Error codes: **`INVALID_FLOW_*`** → **`INVALID_APPLICATION_*`**.
- Catalog and microservice images: **`images[]`** with `{ containerImage, archId }` (up to **4** per arch 1–4); single-image-only create removed.
- Microservice **`runtime`** must be in agent **`availableRuntimes`**.
- Service account volume type **`serviceAccount`** (immutable); `roleRef.apiGroup` **`edgelet.iofog.org/v1`** (was `agent.datasance.com/v3`).
- System microservice **`controller`** in application `system-{agentName}`; user delete → **403**, user PATCH → **400**.
- **TCP bridge** connector `host` depends on target agent **router mode** and service type. A router is **required** (`routerMode` ≠ `none`) for `microservice` and `agent` services. **Interior** router: **`127.0.0.1`**. **Edge** router: **`edgelet.default.svc.bridge.local`** for host-network microservices and `agent` services; **`{appName}.{microserviceName}`** for pod-network microservices (removed `iofog`, `iofog_{uuid}`, and `edgelet.default.bridge.local`).
- Skupper router **`siteId`** removed from persisted **`tcpConnector`** / **`tcpListener`** entries in router microservice config (target router is implied by which router microservice holds the config).
- NATS system microservice env and config templates: **`NATS_SSL_DIR`** → **`NATS_TLS_DIR`**.
- Debug catalog image: **`ghcr.io/eclipse-iofog/node-debugger`** → **`ghcr.io/eclipse-iofog/debugger`** (seeders and `config.yaml`).

#### Removed APIs

- **EdgeResource** APIs, models, and RBAC.
- **Diagnostics**, **strace**, image **snapshot** / **download** APIs.
- All **`/api/v3/flow`** routes.

#### Authentication

- **`keycloak-connect` removed** — generic OIDC (`openid-client` + JWKS discovery).
- Keycloak-specific env removed: **`KC_*`**, **`auth.realm`**, **`auth.realmKey`**, realm public key.
- Canonical OIDC env: **`OIDC_ISSUER_URL`** (full issuer URL), **`OIDC_CLIENT_ID`**, **`OIDC_CLIENT_SECRET`**, **`OIDC_CONSOLE_CLIENT_ID`**, **`AUTH_MODE`** (`embedded` | `external`).
- Embedded issuer at **`{CONTROLLER_PUBLIC_URL}/oidc`** when `AUTH_MODE=embedded`.
- TLS env renamed: **`SSL_*`** → **`TLS_*`**; use **`CONTROLLER_PUBLIC_URL`** + **`TRUST_PROXY`** behind reverse proxies.
- Browser login: OAuth BFF (`GET /api/v3/user/oauth/authorize`) — not browser `POST /user/login`.
- Bootstrap admin: **`OIDC_BOOTSTRAP_ADMIN_USERNAME`**, **`OIDC_BOOTSTRAP_ADMIN_PASSWORD`** (embedded first boot).

#### EdgeOps Console (replaces ECN-Viewer)

- **Container-only ship** — no npm publish of `@datasance/iofogcontroller` or `@datasance/ecn-viewer`.
- **EdgeOps Console** static SPA embedded in the Controller image (replaces **`@datasance/ecn-viewer`** / **`@iofog/ecn-viewer`** npm package).
- Build flavors: **`datasance`** | **`iofog`** via **`EDGEOPS_CONSOLE_FLAVOR`** / **`EDGEOPS_CONSOLE_VERSION`**.
- Env renames (no aliases):

  | Remove | Canonical |
  |--------|-----------|
  | `VIEWER_URL` | **`CONSOLE_URL`** |
  | `VIEWER_PORT` | **`CONSOLE_PORT`** |
  | `ECN_VIEWER_PATH` | **`EDGEOPS_CONSOLE_PATH`** |
  | `OIDC_VIEWER_CLIENT_ID` | **`OIDC_CONSOLE_CLIENT_ID`** |
  | `AUTH_VIEWER_CLIENT_ENABLED` | **`AUTH_CONSOLE_CLIENT_ENABLED`** |

- Runtime **`controller-config.js`** uses **`consoleUrl`** (not `viewerUrl`); **`auth.*`** endpoints only — no `keycloak*` or `oidcIssuerUrl` keys in Console config.
- Dual-port default: API **51121**, Console **8008**.
- Status API field **`versions.ecnViewer`** retained for compatibility; value is the embedded Console version string.

#### Database and distribution

- **Greenfield schema** — **new install required**; no v3.7 → v3.8 database migrator.
- PKI: central router/NATS local CAs; legacy per-agent CAs migrated via one-time **rotation job** (Plan 5).
- **Node.js 24.x** required for dev and CI (was 16/18).
- Dual-mirror container images: **`ghcr.io/eclipse-iofog/controller`** and **`ghcr.io/datasance/controller`** from the **same commit SHA**; publish on **`v*` tags only** via repo variable **`IMAGE_REGISTRY`**.

### Added

- Embedded OIDC identity service with TOTP MFA (mandatory for `admin` group).
- **`POST /api/v3/auth/migration/export`** — one-way embedded → external IdP migration.
- **`POST /api/v3/auth/jwks/rotate`** — manual JWKS rotation (embedded mode).
- Built-in rate limiting on auth endpoints.
- HA BFF session store support for multi-replica Controller deployments.
- **NOTICE** file replaces per-file copyright headers.
- Neutral in-tree identity: RBAC **`iofog.org/v3`**, default namespace **`iofog`**, `package.json` name **`controller`**.
- NATS account/user rule **JWT Latin-1 validation** — rejects rules whose fields cannot be encoded in a NATS JWT (create/update on rules, applications, microservices, and NATS API).
- RBAC **route catalog utils** (`isPublicCatalogRoute`) — shared lookup of public routes from `rbac-resources.yaml` (empty verb list = no auth required).

### Fixed

- Controller register accepts optional **`schedule: 0`**; server always enforces schedule **0** on create, re-register, and **`PATCH /api/v3/microservices/system/:uuid`** for controller workloads.
- Agent version command (**`GET /api/v3/agent/version`**) refreshes the provision key on each pull instead of returning a stale or deleted key.
- Controller AMQP certificate provisioning uses shared **`default-router-local-ca`** instead of per-fog router local CA secret names.
- Fog teardown drops obsolete per-fog **`nats-local-ca-*`** and **`router-local-ca-*`** secret names from cleanup lists.
- OIDC discovery with **`AUTH_INSECURE_ALLOW_HTTP`** uses the supported `openid-client` insecure-request hook for local **`http://`** issuers.
- Config keys **`auth.bootstrap.adminUsername`** / **`adminPassword`** renamed to **`auth.bootstrap.username`** / **`password`** (**`OIDC_BOOTSTRAP_ADMIN_*`** env vars unchanged).
- Microservice create/update **strips** user-supplied **`serviceAccount`** volume mappings instead of rejecting them — allows GET → PATCH round-trips; system still injects the canonical binding.
- OIDC middleware **skips Bearer validation** on public catalog routes (e.g. **`GET /api/v3/status`**, **`GET /api/v3/architectures/`**, OAuth BFF) so agent/controller tokens on health checks no longer spam JWKS warnings.
- TCP bridge background provisioning resolves agent router mode via **`RouterManager.findOne`** (fixes **`TypeError`** when **`fakeTransaction`** is used in background jobs).
- TCP bridge / router provisioning **background error logging** uses pino object-first `{ err, msg, … }` so failures are no longer logged as empty errors.
- Router microservice **`siteConfig.platform`** defaults to **`edgelet`** (was **`docker`**) when the agent uses the Edgelet runtime.

### Changed

- OpenTelemetry SDK dependencies bumped to **0.219.x**; telemetry init simplified (removed custom resource detector wrapper).
- **`js-yaml`** bumped to **4.2.0**.

### Removed

- v3.7 legacy field-agent wire protocol and deprecated agent field names.
- npm package distribution of Controller and ECN-Viewer.
- EdgeResource, diagnostics, strace, and legacy flow APIs.
- Keycloak-specific configuration and `keycloak-connect` dependency.
- `processedMessages`, `messageSpeed`, and dual-read aliases for deprecated agent fields.

---

## [v3.0.0] - 11-05-2022

### Features

* Updated ecn-viewer to v3.0.2
* Updated job schedular logic
* Removed sentry from the code (#744)
* Removed sentry and analytics from the code as they were obsolete.
* Updated the down  migration of TrackingEvent table
* Added timeZone in agentConfig
* Removed node 10 tests and added node 16 tests
* Removed node 12
* Minimum node version is now >= 12
* Updated Docker Node.js version to Gallium
* Updated API to use name instead of uuid as primary identifier
* Allow password update without sending email

## [v3.0.0-beta1] - 13-08-2021

### Features

* Update ECN Viewer version to 2.0.1

### Bugs
* Fixed issue when rebuild flag was not set to true when images are updated
* Fixed issue when microservice states were inconsistent on moving from one agent to another

## [v3.0.0-alpha1] - 24 March 2021

* Add Edge Resources API endpoints and functionality
* Add Application Templates API endpoints and functionality
* Add Applications API endpionts
* Use LiquidJS templating engine for any incoming request
* Update Docker Node.js version to Fermium
* Add UDP port mapping support

## [v2.0.1] - 2020-10-23

#### Features

* Return microservice download percentage

### Bugs

* Fix default available disk threshold being too high
* Replace Winston logger with Pino
* Make flowId query param optional for GET microservices endpoint

## [v2.0.0] - 2020-08-05

### Features

* Add graceful shutdown of servers when SIGTERM is received
* Add plugin support for Public Port allocation

## [v2.0.0-rc1] - 2020-04-28

### Features

* Volume mapping types
* Add logic to initDB to prevent CLI command to override values configured using env variables
* Remove connector from iofog-controller
* Update ECN Viewer
* Make system images configurable
* Add versions to status

### Bugs

* Fix migration column name
* Check for Agent duplicate name
* Fixed updating proxy config when an agent is deleted
* Set agent/ms status to UNKNOWN


## [v2.0.0-beta2] - 2020-04-06

### Features

* Sort ioFog and Microservice list response
* Updated default value of dockerPruningFreq to 1
* Add system query param to /iofog-list endpoint
* Changed router images to `iofog/router`
* Update messageSpeed datatype to float
* Update diskThreshold to availableDiskThreshold

### Bugs

* Check for reserved ports
* Only log error and warnings
* Bump ECN Viewer version
* Fix list agents query param logic


## [v2.0.0-beta] - 2020-03-12

No changes

## [v2.0.0-alpha] - 2020-03-11

### Features

* Added endpoint to return public ports
* Add agent docker pruning endpoint
* Support websocket proxy
* Added rotation to log files
* Allow creation of microservice without catalog item
* Bump ECN Viewer to 1.0.4
* Support mixed k8s and non-k8s flows

### Bugs

* Throw error if router host is not provided
* Fix update microservice image command
* Fixed proxy deletion bug
* Fixed the bug for moving msvcs to new Agent
* Fix optional catalog-item in provisioning check of microservices
* Fixed k8s get pod issue
* Fixed `ProviderFailed` on k8s deployments
* Removed HA dependencies
* Fix catalog item id validation if no image provided
* Always return populated array for k8s get node addresses
* Fixed k8s deployment bug
* Add CLI support for microservice without catalog item
* Allow patch without catalogitem

## [v1.2.1] - 2019-07-13

### Features

* Return Agent's external IP for Kubelet
* Add uptime to status endpoint

### Bugs

* Requests not failing if with additional properties

## [v1.1.1] - 2019-07-03

### Features

* Added support for setting and passing through environment variables in docker containers at runtime (see iofog-controller CLI)
* Added support for overriding container CMD directives at runtime (see iofog-controller CLI)
* Added capability to return a microservice's public url when a public port is set
* New metrics being tracked:
  * Total CPU usage
  * Available disk
  * Available memory
* Controller Docker images now build from iofog-docker-images for stability

### Bugs

* Update microservice did always get picked up by Agent
* High CPU usage when Controller was running for couple of weeks
* Fixed log rotation (should work infinitely now)
* Fixed regression where Ports public directive was not honored

## [1.0.28](https://github.com/ioFog/Controller/releases/tag/1.0.28) (2018-12-14

## [1.0.27](https://github.com/ioFog/Controller/releases/tag/1.0.27) (2018-12-06)

### Features

* **npm-scripts:** allow to use only one image on catalog item creation ([#415](https://github.com/ioFog/Controller/issues/415)) ([2a3e5d4](https://github.com/ioFog/Controller/commit/2a3e5d4))
* **npm-scripts:** init db automatically after installation ([#413](https://github.com/ioFog/Controller/issues/413)) ([a77bea3](https://github.com/ioFog/Controller/commit/a77bea3))

### Bug Fixes

* **tests:** rename logLimit -> logSize ([#416](https://github.com/ioFog/Controller/issues/416)) ([7b6b310](https://github.com/ioFog/Controller/commit/7b6b310))
* **transactions:** fix transaction validation if last method's arg is undefined ([#414](https://github.com/ioFog/Controller/issues/414)) ([5369b05](https://github.com/ioFog/Controller/commit/5369b05)

## [1.0.26](https://github.com/ioFog/Controller/releases/tag/1.0.26) (2018-11-30)

## [1.0.25](https://github.com/ioFog/Controller/releases/tag/1.0.25) (2018-11-30)

## [1.0.24](https://github.com/ioFog/Controller/releases/tag/1.0.24) (2018-11-26)

## [1.0.23](https://github.com/ioFog/Controller/releases/tag/1.0.23) (2018-11-26)

## [1.0.22](https://github.com/ioFog/Controller/releases/tag/1.0.22) (2018-11-26)

## [1.0.21](https://github.com/ioFog/Controller/releases/tag/1.0.21) (2018-11-24)

## [1.0.20](https://github.com/ioFog/Controller/releases/tag/1.0.20) (2018-11-24)

## [1.0.19](https://github.com/ioFog/Controller/releases/tag/1.0.19) (2018-11-22)

## [1.0.19](https://github.com/ioFog/Controller/releases/tag/1.0.19) (2018-11-21)

## [1.0.16](https://github.com/ioFog/Controller/releases/tag/1.0.16) (2018-11-21)

## [1.0.15](https://github.com/ioFog/Controller/releases/tag/1.0.15) (2018-11-19)

## [1.0.14](https://github.com/ioFog/Controller/releases/tag/1.0.14) (2018-11-14)

## [1.0.0](https://github.com/ioFog/Controller/releases/tag/1.0.0) (2018-10-30)


[v2.0.0-rc1]:   https://github.com/eclipse-iofog/helm/compare/v2.0.0-rc1..v2.0.0-beta2
[v2.0.0-beta2]: https://github.com/eclipse-iofog/helm/compare/v2.0.0-beta2..v2.0.0-beta
[v2.0.0-beta]:  https://github.com/eclipse-iofog/helm/compare/v2.0.0-beta..v2.0.0-alpha
[v2.0.0-alpha]: https://github.com/eclipse-iofog/helm/compare/v2.0.0-alpha..v1.3.0
[v1.2.1]: https://github.com/eclipse-iofog/helm/compare/v1.2.1..v1.1.1
[v1.1.1]: https://github.com/eclipse-iofog/helm/releases/tag/v1.1.1
