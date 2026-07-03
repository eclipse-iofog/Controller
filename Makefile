# Local Docker build — mirrors CI/release build-args (see .github/actions/set-build-env).
# Override any variable: make build FLAVOR=iofog EDGEOPS_CONSOLE_VERSION=v1.0.6

FLAVOR ?= datasance
IMAGE_NAME ?= controller
DOCKER_TAG ?= $(PKG_VERSION)

PKG_VERSION ?= $(shell node -p "require('./package.json').version")

ifeq ($(FLAVOR),iofog)
  IMAGE_REGISTRY ?= ghcr.io/eclipse-iofog
  OCI_SOURCE_REPO ?= https://github.com/eclipse-iofog/Controller
  CONTROLLER_DISTRIBUTION ?= iofog
  RBAC_API_VERSION ?= iofog.org/v3
  EDGEOPS_CONSOLE_REPO ?= https://github.com/eclipse-iofog/edgeops-console
  EDGEOPS_CONSOLE_FLAVOR ?= iofog
else ifeq ($(FLAVOR),datasance)
  IMAGE_REGISTRY ?= ghcr.io/datasance
  OCI_SOURCE_REPO ?= https://github.com/Datasance/Controller
  CONTROLLER_DISTRIBUTION ?= datasance
  RBAC_API_VERSION ?= datasance.com/v3
  EDGEOPS_CONSOLE_REPO ?= https://github.com/Datasance/edgeops-console
  EDGEOPS_CONSOLE_FLAVOR ?= datasance
else
  $(error FLAVOR must be "datasance" or "iofog", got "$(FLAVOR)")
endif

EDGEOPS_CONSOLE_VERSION ?= v1.0.6

IMAGE_REF = $(IMAGE_REGISTRY)/$(IMAGE_NAME):$(DOCKER_TAG)

DOCKER_BUILD_ARGS = \
  --build-arg PKG_VERSION=$(PKG_VERSION) \
  --build-arg EDGEOPS_CONSOLE_REPO=$(EDGEOPS_CONSOLE_REPO) \
  --build-arg EDGEOPS_CONSOLE_VERSION=$(EDGEOPS_CONSOLE_VERSION) \
  --build-arg EDGEOPS_CONSOLE_FLAVOR=$(EDGEOPS_CONSOLE_FLAVOR) \
  --build-arg IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
  --build-arg OCI_SOURCE_REPO=$(OCI_SOURCE_REPO) \
  --build-arg CONTROLLER_DISTRIBUTION=$(CONTROLLER_DISTRIBUTION) \
  --build-arg RBAC_API_VERSION=$(RBAC_API_VERSION)

.PHONY: default help build push build-iofog build-datasance print-vars

default: build

help:
	@echo "Targets:"
	@echo "  make build              Build image (FLAVOR=datasance by default)"
	@echo "  make build-iofog        Build with ioFog flavor defaults"
	@echo "  make build-datasance    Build with Datasance flavor defaults"
	@echo "  make push               Build and push to IMAGE_REGISTRY"
	@echo "  make print-vars         Show resolved build variables"
	@echo ""
	@echo "Variables (override on command line or environment):"
	@echo "  FLAVOR                    datasance | iofog"
	@echo "  PKG_VERSION               from package.json by default"
	@echo "  DOCKER_TAG                image tag (default: PKG_VERSION)"
	@echo "  IMAGE_REGISTRY            ghcr.io/datasance | ghcr.io/eclipse-iofog"
	@echo "  OCI_SOURCE_REPO           OCI source label URL"
	@echo "  CONTROLLER_DISTRIBUTION   baked runtime distribution"
	@echo "  RBAC_API_VERSION          baked RBAC API version"
	@echo "  EDGEOPS_CONSOLE_REPO      console git clone URL"
	@echo "  EDGEOPS_CONSOLE_FLAVOR    console Vite distribution"
	@echo "  EDGEOPS_CONSOLE_VERSION   console git tag (v prefix optional)"

print-vars:
	@echo "FLAVOR=$(FLAVOR)"
	@echo "PKG_VERSION=$(PKG_VERSION)"
	@echo "DOCKER_TAG=$(DOCKER_TAG)"
	@echo "IMAGE_REF=$(IMAGE_REF)"
	@echo "IMAGE_REGISTRY=$(IMAGE_REGISTRY)"
	@echo "OCI_SOURCE_REPO=$(OCI_SOURCE_REPO)"
	@echo "CONTROLLER_DISTRIBUTION=$(CONTROLLER_DISTRIBUTION)"
	@echo "RBAC_API_VERSION=$(RBAC_API_VERSION)"
	@echo "EDGEOPS_CONSOLE_REPO=$(EDGEOPS_CONSOLE_REPO)"
	@echo "EDGEOPS_CONSOLE_FLAVOR=$(EDGEOPS_CONSOLE_FLAVOR)"
	@echo "EDGEOPS_CONSOLE_VERSION=$(EDGEOPS_CONSOLE_VERSION)"

build:
	docker build $(DOCKER_BUILD_ARGS) -f Dockerfile -t $(IMAGE_REF) .

push: build
	docker push $(IMAGE_REF)

build-iofog:
	$(MAKE) build FLAVOR=iofog

build-datasance:
	$(MAKE) build FLAVOR=datasance
