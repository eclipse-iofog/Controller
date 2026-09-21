const { expect } = require('chai')

const YamlParserService = require('../../../src/services/yaml-parser-service')

describe('YAML Parser Service', () => {
  describe('.parseAppFile()', () => {
    it('parses application natsConfig', async () => {
      const yaml = `
kind: Application
metadata:
  name: app-a
spec:
  natsConfig:
    natsAccess: true
    natsRule: app-rule
  microservices: []
`
      const result = await YamlParserService.parseAppFile(yaml)
      expect(result.natsConfig).to.eql({
        natsAccess: true,
        natsRule: 'app-rule'
      })
    })

    it('parses nested microservice serviceAccount', async () => {
      const yaml = `
kind: Application
metadata:
  name: app-a
spec:
  microservices:
    - name: ms-a
      serviceAccount:
        roleRef:
          kind: Role
          name: custom-role
          apiGroup: edgelet.iofog.org/v1
      container:
        env: []
`
      const result = await YamlParserService.parseAppFile(yaml)
      expect(result.microservices).to.have.length(1)
      expect(result.microservices[0].serviceAccount).to.eql({
        roleRef: {
          kind: 'Role',
          name: 'custom-role',
          apiGroup: 'edgelet.iofog.org/v1'
        }
      })
    })

    it('copies knowledge from an inline microservice', async () => {
      const yaml = `
kind: Application
metadata:
  name: app-a
spec:
  microservices:
    - name: ms-a
      knowledge:
        bindPath: /knowledge
        permissions: rw
        items:
          - name: product-docs
      container:
        env: []
`
      const result = await YamlParserService.parseAppFile(yaml)
      expect(result.microservices[0].knowledge).to.eql({
        bindPath: '/knowledge',
        permissions: 'rw',
        items: [{ name: 'product-docs' }]
      })
    })
  })

  describe('.parseMicroserviceFile()', () => {
    it('parses microservice natsConfig', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-a
spec:
  container:
    env: []
  natsConfig:
    natsAccess: true
    natsRule: user-rule
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.natsConfig).to.eql({
        natsAccess: true,
        natsRule: 'user-rule'
      })
      expect(result.application).to.eql('app-a')
      expect(result.name).to.eql('ms-a')
    })

    it('parses microservice serviceAccount', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-a
spec:
  serviceAccount:
    roleRef:
      kind: Role
      name: custom-role
      apiGroup: edgelet.iofog.org/v1
  container:
    env: []
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.serviceAccount).to.eql({
        roleRef: {
          kind: 'Role',
          name: 'custom-role',
          apiGroup: 'edgelet.iofog.org/v1'
        }
      })
    })

    it('parses microservice natsEnabled', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-b
spec:
  container:
    env: []
  natsEnabled: true
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.natsEnabled).to.eql(true)
      expect(result.application).to.eql('app-a')
      expect(result.name).to.eql('ms-b')
    })

    it('maps multi-arch YAML image keys to archId', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-d
spec:
  images:
    x86: edgeworx/foo:x86
    arm64: edgeworx/foo:arm64
    riscv64: edgeworx/foo:riscv
    arm: edgeworx/foo:arm32
  container:
    env: []
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.images).to.eql([
        { archId: 1, containerImage: 'edgeworx/foo:x86' },
        { archId: 2, containerImage: 'edgeworx/foo:arm64' },
        { archId: 3, containerImage: 'edgeworx/foo:riscv' },
        { archId: 4, containerImage: 'edgeworx/foo:arm32' }
      ])
    })

    it('maps spec.models and prefers container.commands over cmd', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-models
spec:
  models:
    bindPath: /models
    permissions: ro
    items:
      - name: test-model
  container:
    commands:
      - python
      - app.py
    cmd:
      - ignored
    env: []
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.models).to.eql({
        bindPath: '/models',
        permissions: 'ro',
        items: [{ name: 'test-model' }]
      })
      expect(result.commands).to.eql(['python', 'app.py'])
      expect(result.cmd).to.eql(['python', 'app.py'])
      expect(result).to.not.have.property('volumes')
    })

    it('maps spec.knowledge next to models', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-knowledge
spec:
  knowledge:
    bindPath: /knowledge
    permissions: ro
    items:
      - name: product-docs
  container:
    env: []
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.knowledge).to.eql({
        bindPath: '/knowledge',
        permissions: 'ro',
        items: [{ name: 'product-docs' }]
      })
    })

    it('maps container devices, tmpfs, sysctls, and ulimits', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-container
spec:
  container:
    sysctls:
      net.ipv4.tcp_syncookies: 1
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    devices:
      - hostPath: /dev/null
        containerPath: /dev/null
        permissions: rwm
    tmpfs:
      - containerPath: /tmp
        size: 64
    volumes:
      - hostDestination: /data
        containerDestination: /data
        accessMode: rw
        type: bind
    env: []
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.sysctls).to.eql({ 'net.ipv4.tcp_syncookies': '1' })
      expect(result.ulimits).to.eql({ nofile: { soft: 65536, hard: 65536 } })
      expect(result.devices).to.eql([{
        hostPath: '/dev/null',
        containerPath: '/dev/null',
        permissions: 'rwm'
      }])
      expect(result.tmpfs).to.eql([{ containerPath: '/tmp', size: 64 }])
      expect(result.volumeMappings).to.eql([{
        hostDestination: '/data',
        containerDestination: '/data',
        accessMode: 'rw',
        type: 'bind'
      }])
      expect(result).to.not.have.property('volumes')
    })

    it('passes container volume scope through to volumeMappings', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-shared-volume
spec:
  container:
    volumes:
      - hostDestination: nodered-config
        containerDestination: /data
        accessMode: rw
        type: volume
        scope: shared
    env: []
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.volumeMappings).to.eql([{
        hostDestination: 'nodered-config',
        containerDestination: '/data',
        accessMode: 'rw',
        type: 'volume',
        scope: 'shared'
      }])
    })

    it('does not map deprecated top-level natsAccess', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-c
spec:
  container:
    env: []
  natsAccess: true
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.natsAccess).to.eql(undefined)
    })

    it('maps spec.template with object variables', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: whisper-instance-1
spec:
  application: test-app
  agent:
    name: edge-node-1
  template:
    name: whisper-infer
    variables:
      model: llama-7b
  container:
    env: []
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.name).to.eql('whisper-instance-1')
      expect(result.application).to.eql('test-app')
      expect(result.agentName).to.eql('edge-node-1')
      expect(result.template).to.eql({
        name: 'whisper-infer',
        variables: { model: 'llama-7b' }
      })
    })

    it('maps spec.template with array variables', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: test-app/whisper-instance-2
spec:
  template:
    name: whisper-infer
    variables:
      - key: model
        value: llama-7b
  container:
    env: []
`
      const result = await YamlParserService.parseMicroserviceFile(yaml)
      expect(result.name).to.eql('whisper-instance-2')
      expect(result.application).to.eql('test-app')
      expect(result.template).to.eql({
        name: 'whisper-infer',
        variables: [{ key: 'model', value: 'llama-7b' }]
      })
    })

    it('rejects spec.template without name', async () => {
      const yaml = `
kind: Microservice
metadata:
  name: app-a/ms-template
spec:
  template:
    variables:
      model: llama-7b
  container:
    env: []
`
      await expect(YamlParserService.parseMicroserviceFile(yaml)).to.be.rejectedWith(
        'template.name is required when template is specified'
      )
    })
  })

  describe('NATS rule YAML parsing', () => {
    it('parses NatsAccountRule resource', async () => {
      const yaml = `
kind: NatsAccountRule
metadata:
  name: app-rule
spec:
  maxConnections: 100
  memStorage: -1
  diskStorage: -1
`
      const result = await YamlParserService.parseNatsAccountRuleFile(yaml)
      expect(result.name).to.equal('app-rule')
      expect(result.maxConnections).to.equal(100)
      expect(result.memStorage).to.equal(-1)
      expect(result.diskStorage).to.equal(-1)
      expect(result).to.not.have.property('jetstreamEnabled')
    })

    it('parses NatsUserRule resource', async () => {
      const yaml = `
kind: NatsUserRule
metadata:
  name: user-rule
spec:
  maxSubscriptions: 10
  allowedConnectionTypes:
    - STANDARD
`
      const result = await YamlParserService.parseNatsUserRuleFile(yaml)
      expect(result).to.eql({
        name: 'user-rule',
        maxSubscriptions: 10,
        allowedConnectionTypes: ['STANDARD']
      })
    })
  })

  describe('.parseModelFile()', () => {
    it('parses metadata.name and spec fields matching the wire object', async () => {
      const yaml = `
apiVersion: datasance.com/v3
kind: Model
metadata:
  name: test-model
spec:
  repo: org/repo
  revision: abc123
  registryId: 3
  files:
    - file.gguf
  format: gguf
`
      const result = await YamlParserService.parseModelFile(yaml)
      expect(result).to.eql({
        name: 'test-model',
        repo: 'org/repo',
        revision: 'abc123',
        registryId: 3,
        files: ['file.gguf'],
        format: 'gguf'
      })
    })

    it('accepts spec.registry as an alias for registryId', async () => {
      const yaml = `
apiVersion: iofog.org/v3
kind: Model
metadata:
  name: test-model
spec:
  repo: org/repo
  registry: 3
  files:
    - file.gguf
`
      const result = await YamlParserService.parseModelFile(yaml)
      expect(result.registryId).to.equal(3)
    })

    it('omits name on update and rejects a path mismatch', async () => {
      const yaml = `
kind: Model
metadata:
  name: test-model
spec:
  repo: org/repo
  registryId: 3
`
      const updated = await YamlParserService.parseModelFile(yaml, {
        isUpdate: true,
        modelName: 'test-model'
      })
      expect(updated).to.not.have.property('name')
      expect(updated.repo).to.equal('org/repo')

      await expect(YamlParserService.parseModelFile(yaml, {
        isUpdate: true,
        modelName: 'other-model'
      })).to.be.rejectedWith(/doesn't match endpoint path/)
    })
  })

  describe('.parseKnowledgeFile()', () => {
    it('parses kind Knowledge into the wire object', async () => {
      const yaml = `
apiVersion: datasance.com/v3
kind: Knowledge
metadata:
  name: product-docs
spec:
  repo: acme/product-manuals
  revision: abc123
  registryId: 3
  files:
    - data/**/*.jsonl
  format: JSONL
`
      const result = await YamlParserService.parseKnowledgeFile(yaml)
      expect(result).to.eql({
        name: 'product-docs',
        repo: 'acme/product-manuals',
        revision: 'abc123',
        registryId: 3,
        files: ['data/**/*.jsonl'],
        format: 'JSONL'
      })
    })

    it('accepts spec.registry as an alias for registryId', async () => {
      const yaml = `
apiVersion: iofog.org/v3
kind: Knowledge
metadata:
  name: product-docs
spec:
  repo: acme/product-manuals
  registry: 3
  files:
    - data/**/*.jsonl
`
      const result = await YamlParserService.parseKnowledgeFile(yaml)
      expect(result.registryId).to.equal(3)
      expect(result).to.not.have.property('labels')
    })

    it('omits name on upsert and rejects a path mismatch', async () => {
      const yaml = `
kind: Knowledge
metadata:
  name: product-docs
spec:
  repo: acme/product-manuals
  registryId: 3
`
      const updated = await YamlParserService.parseKnowledgeFile(yaml, {
        isUpdate: true,
        knowledgeName: 'product-docs'
      })
      expect(updated).to.not.have.property('name')
      expect(updated.repo).to.equal('acme/product-manuals')

      await expect(YamlParserService.parseKnowledgeFile(yaml, {
        isUpdate: true,
        knowledgeName: 'other-docs'
      })).to.be.rejectedWith(/doesn't match endpoint path/)
    })
  })

  describe('.parseRuntimeClassFile()', () => {
    it('parses metadata.name and top-level handler matching the wire object', async () => {
      const yaml = `
apiVersion: datasance.com/v3
kind: RuntimeClass
metadata:
  name: spin
handler: spin
`
      const result = await YamlParserService.parseRuntimeClassFile(yaml)
      expect(result).to.eql({
        name: 'spin',
        handler: 'spin'
      })
    })

    it('accepts iofog.org/v3 apiVersion', async () => {
      const yaml = `
apiVersion: iofog.org/v3
kind: RuntimeClass
metadata:
  name: nvidia-cdi
handler: nvidia-cdi
`
      const result = await YamlParserService.parseRuntimeClassFile(yaml)
      expect(result.handler).to.equal('nvidia-cdi')
    })

    it('accepts spec.handler as a fallback', async () => {
      const yaml = `
kind: RuntimeClass
metadata:
  name: spin
spec:
  handler: spin
`
      const result = await YamlParserService.parseRuntimeClassFile(yaml)
      expect(result).to.eql({ name: 'spin', handler: 'spin' })
    })

    it('rejects YAML without handler', async () => {
      const yaml = `
kind: RuntimeClass
metadata:
  name: spin
`
      await expect(YamlParserService.parseRuntimeClassFile(yaml))
        .to.be.rejectedWith(/handler is required/)
    })

    it('omits name on update and rejects a path mismatch', async () => {
      const yaml = `
kind: RuntimeClass
metadata:
  name: spin
handler: wasmtime
`
      const updated = await YamlParserService.parseRuntimeClassFile(yaml, {
        isUpdate: true,
        runtimeClassName: 'spin'
      })
      expect(updated).to.not.have.property('name')
      expect(updated.handler).to.equal('wasmtime')

      await expect(YamlParserService.parseRuntimeClassFile(yaml, {
        isUpdate: true,
        runtimeClassName: 'other-class'
      })).to.be.rejectedWith(/doesn't match endpoint path/)
    })
  })

  describe('.parseMicroserviceTemplateFile()', () => {
    it('parses kind, variables, and microservice catalog/container fields', async () => {
      const yaml = `
apiVersion: datasance.com/v3
kind: MicroserviceTemplate
metadata:
  name: nginx-edge
spec:
  description: nginx at the edge
  variables:
    - key: port
      description: listen port
      defaultValue: "8080"
  microservice:
    images:
      x86: nginx:alpine
    models:
      bindPath: /models
      permissions: ro
      items:
        - name: test-model
    knowledge:
      bindPath: /knowledge
      permissions: ro
      items:
        - name: product-docs
    container:
      commands:
        - nginx
        - -g
        - daemon off;
      env:
        - key: PORT
          value: "{{ port }}"
`
      const result = await YamlParserService.parseMicroserviceTemplateFile(yaml)
      expect(result.name).to.equal('nginx-edge')
      expect(result.description).to.equal('nginx at the edge')
      expect(result.variables).to.eql([
        { key: 'port', description: 'listen port', defaultValue: '8080' }
      ])
      expect(result.microservice.images).to.eql([
        { archId: 1, containerImage: 'nginx:alpine' }
      ])
      expect(result.microservice.models).to.eql({
        bindPath: '/models',
        permissions: 'ro',
        items: [{ name: 'test-model' }]
      })
      expect(result.microservice.knowledge).to.eql({
        bindPath: '/knowledge',
        permissions: 'ro',
        items: [{ name: 'product-docs' }]
      })
      expect(result.microservice.commands).to.eql(['nginx', '-g', 'daemon off;'])
      expect(result.microservice.env).to.eql([{ key: 'PORT', value: '{{ port }}' }])
      expect(result.microservice).to.not.have.property('name')
      expect(result.microservice).to.not.have.property('pidMode')
      expect(result.microservice).to.not.have.property('healthCheck')
    })

    it('preserves template placeholders and typed variable defaults', async () => {
      const yaml = `
apiVersion: datasance.com/v3
kind: MicroserviceTemplate
metadata:
  name: ms-template2
spec:
  description: Template for creating microservices
  variables:
    - key: application
      defaultValue: test-app
    - key: agent-name
      defaultValue: lima
    - key: nats-access
      defaultValue: true
    - key: registry-id
      defaultValue: 5
    - key: schedule
      defaultValue: 50
    - key: shm-size
      defaultValue: 1024
  microservice:
    application: "{{application}}"
    schedule: "{{schedule}}"
    agent:
      name: "{{agent-name}}"
    natsConfig:
      natsAccess: "{{nats-access}}"
      natsRule: "{{nats-rule}}"
    images:
      registry: "{{registry-id}}"
      arm64: "{{arm64-image}}"
      amd64: "{{amd64-image}}"
    models:
      bindPath: "{{bind-path}}"
      permissions: "{{permissions}}"
      items:
        - name: "{{model1}}"
    container:
      hostNetworkMode: false
      shmSize: "{{shm-size}}"
      commands: []
`
      const result = await YamlParserService.parseMicroserviceTemplateFile(yaml)
      expect(result.variables).to.eql([
        { key: 'application', defaultValue: 'test-app' },
        { key: 'agent-name', defaultValue: 'lima' },
        { key: 'nats-access', defaultValue: true },
        { key: 'registry-id', defaultValue: 5 },
        { key: 'schedule', defaultValue: 50 },
        { key: 'shm-size', defaultValue: 1024 }
      ])
      expect(result.microservice.application).to.equal('{{application}}')
      expect(result.microservice.agentName).to.equal('{{agent-name}}')
      expect(result.microservice.registryId).to.equal('{{registry-id}}')
      expect(result.microservice.schedule).to.equal('{{schedule}}')
      expect(result.microservice.shmSize).to.equal('{{shm-size}}')
      expect(result.microservice.natsConfig).to.eql({
        natsAccess: '{{nats-access}}',
        natsRule: '{{nats-rule}}'
      })
      expect(result.microservice.models.items).to.eql([{ name: '{{model1}}' }])
      expect(result.microservice).to.not.have.property('pidMode')
      expect(result.microservice).to.not.have.property('cmd')
    })

    it('accepts iofog.org/v3 apiVersion', async () => {
      const yaml = `
apiVersion: iofog.org/v3
kind: MicroserviceTemplate
metadata:
  name: nginx-edge
spec:
  microservice:
    images:
      x86: nginx:alpine
    container:
      env: []
`
      const result = await YamlParserService.parseMicroserviceTemplateFile(yaml)
      expect(result.name).to.equal('nginx-edge')
    })

    it('omits name on update and rejects a path mismatch', async () => {
      const yaml = `
kind: MicroserviceTemplate
metadata:
  name: nginx-edge
spec:
  microservice:
    images:
      x86: nginx:alpine
    container:
      env: []
`
      const updated = await YamlParserService.parseMicroserviceTemplateFile(yaml, {
        isUpdate: true,
        templateName: 'nginx-edge'
      })
      expect(updated).to.not.have.property('name')
      expect(updated.microservice.images[0].containerImage).to.equal('nginx:alpine')

      await expect(YamlParserService.parseMicroserviceTemplateFile(yaml, {
        isUpdate: true,
        templateName: 'other-template'
      })).to.be.rejectedWith(/doesn't match endpoint path/)
    })
  })
})
