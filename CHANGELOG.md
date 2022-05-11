# Changelog

## [v3.0.1] - 12-05-2022

* Updated the default router to use the latest image

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
