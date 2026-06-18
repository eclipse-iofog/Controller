# Controller

[![CI](https://github.com/eclipse-iofog/Controller/actions/workflows/ci.yaml/badge.svg)](https://github.com/eclipse-iofog/Controller/actions/workflows/ci.yaml)
[![Release](https://github.com/eclipse-iofog/Controller/actions/workflows/release.yaml/badge.svg)](https://github.com/eclipse-iofog/Controller/actions/workflows/release.yaml)
[![Version](https://img.shields.io/github/v/release/eclipse-iofog/Controller?include_prereleases)](https://github.com/eclipse-iofog/Controller/releases)
[![Node.js](https://img.shields.io/badge/node-24.x-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-EPL--2.0-blue.svg)](LICENSE)
[![Ship](https://img.shields.io/badge/ship-container-blue.svg)](Dockerfile)
![Supports amd64 Architecture][amd64-shield]
![Supports aarch64 Architecture][arm64-shield]

[arm64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg

**Upstream:** [eclipse-iofog/Controller](https://github.com/eclipse-iofog/Controller) · **Datasance mirror:** [Datasance/Controller](https://github.com/Datasance/Controller)

**Cloud-native control plane for edge fleets.** Controller orchestrates [Edgelet](https://github.com/eclipse-iofog/edgelet) nodes, microservices, routing, NATS messaging, RBAC, and certificates. v3.8 is a **greenfield** release: **Edgelet only** — v3.7 legacy field agents are not supported.

See [CONTRIBUTING](CONTRIBUTING) for the dual-mirror repository model, CI/release workflows, and per-mirror GitHub Actions variables.

## Platforms

| Artifact | amd64 | arm64 | Notes |
|----------|-------|-------|-------|
| Container image | yes | yes | Primary distribution for v3.8 |
| Local dev (Node 24) | yes | yes | `npm run start-dev` |

## Quick start (container)

Pull a release image from the registry that matches your product line, then run Controller with the API on **51121** and EdgeOps Console on **8008**:

### Eclipse ioFog

```bash
docker run -d --name controller \
  -p 51121:51121 \
  -p 8008:8008 \
  ghcr.io/eclipse-iofog/controller:v3.8.0
```

### Datasance PoT

```bash
docker run -d --name controller \
  -p 51121:51121 \
  -p 8008:8008 \
  ghcr.io/datasance/controller:v3.8.0
```

Verify the API:

```bash
curl -s http://localhost:51121/api/v3/status | head
```

Open EdgeOps Console at `http://localhost:8008`. For production, set `CONTROLLER_PUBLIC_URL`, TLS, and an external database (mysql/postgres) — see [Documentation](#documentation) below.

Images publish to `${IMAGE_REGISTRY}/controller` on **`v*` tags only**; both mirrors build from the **same commit SHA**. See [CONTRIBUTING](CONTRIBUTING) for CI variables.

## Edgelet (required agent)

Controller v3.8 requires **Edgelet v1.0.0-rc.1+** on the same release train. Install Edgelet on each edge node before provisioning:

| Channel | GitHub repo | Container image |
|---------|-------------|-----------------|
| **Eclipse (canonical)** | [eclipse-iofog/edgelet](https://github.com/eclipse-iofog/edgelet) | `ghcr.io/eclipse-iofog/edgelet:<tag>` |
| **Datasance mirror** | [Datasance/edgelet](https://github.com/Datasance/edgelet) | `ghcr.io/datasance/edgelet:<tag>` |

**Pin:** use an Edgelet release tag that matches your Controller version (e.g. **`v1.0.0-rc.1`** with Controller **`v3.8.0`**). Identical builds and tags on both mirrors.

### Eclipse (canonical)

```bash
curl -fsSL https://github.com/eclipse-iofog/edgelet/releases/download/v1.0.0-rc.1/install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh --version=v1.0.0-rc.1
edgelet config --a http://<controller-host>:51121/api/v3/
edgelet provision <provisioning-key>
```

### Datasance mirror

```bash
curl -fsSL https://github.com/Datasance/edgelet/releases/download/v1.0.0-rc.1/install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh --version=v1.0.0-rc.1
edgelet config --a http://<controller-host>:51121/api/v3/
edgelet provision <provisioning-key>
```

Edgelet docs: [eclipse-iofog/edgelet](https://github.com/eclipse-iofog/edgelet/blob/main/docs/edgelet/README.md)

## Full platform install

For production ECN / PoT deployments, use the unified platform CLI for your product line:

| Product | CLI | Documentation |
|---------|-----|---------------|
| Eclipse ioFog | [iofogctl](https://github.com/eclipse-iofog/iofogctl) | [Eclipse ioFog docs](https://docs.iofog.org/) |
| Datasance PoT | [potctl](https://github.com/Datasance/potctl) | [Datasance docs](https://docs.datasance.com/) |

## CLI

The container and npm package expose the **`iofog-controller`** CLI:

```bash
iofog-controller <command> <action> [options]
iofog-controller --help
```

## Local development

Requires **Node.js 24.x** (`nvm use 24`):

```bash
npm ci --legacy-peer-deps
npm run dev:embedded
```

API: `http://localhost:51121` · Console (embedded or split): set `CONSOLE_URL` when running EdgeOps Console separately.

## Documentation

| Topic | Doc |
|-------|-----|
| Architecture | [docs/architecture.md](docs/architecture.md) |
| RBAC | [docs/rbac-reference.md](docs/rbac-reference.md) |
| External OIDC | [docs/external-oidc-client-setup.md](docs/external-oidc-client-setup.md) |

## License

[EPL-2.0](LICENSE) — see [NOTICE](NOTICE) for attribution.
