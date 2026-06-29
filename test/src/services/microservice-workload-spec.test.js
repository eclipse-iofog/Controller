const { expect } = require('chai')
const sinon = require('sinon')

const WorkloadSpec = require('../../../src/services/microservice-workload-spec')
const MicroserviceCapAddManager = require('../../../src/data/managers/microservice-cap-add-manager')
const MicroserviceCapDropManager = require('../../../src/data/managers/microservice-cap-drop-manager')
const MicroserviceArgManager = require('../../../src/data/managers/microservice-arg-manager')
const MicroserviceHealthCheckManager = require('../../../src/data/managers/microservice-healthcheck-manager')
const MicroserviceEnvManager = require('../../../src/data/managers/microservice-env-manager')

describe('Microservice Workload Spec', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => $sandbox.restore())

  describe('.shouldRebuildForWorkloadChange()', () => {
    const existing = {
      schedule: 0,
      hostNetworkMode: false,
      isPrivileged: false,
      logSize: 2048,
      runtime: 'io.containerd.runc.v2',
      config: '{}',
      annotations: '{}'
    }

    it('returns true when capAdd is present in update', () => {
      expect(WorkloadSpec.shouldRebuildForWorkloadChange(existing, { capAdd: ['NET_ADMIN'] }, {})).to.equal(true)
    })

    it('returns true when isPrivileged changes', () => {
      expect(WorkloadSpec.shouldRebuildForWorkloadChange(existing, { isPrivileged: true }, {})).to.equal(true)
    })

    it('returns false when no workload fields are present', () => {
      expect(WorkloadSpec.shouldRebuildForWorkloadChange(existing, {}, {})).to.equal(false)
    })
  })

  describe('.createWorkloadRelations()', () => {
    beforeEach(() => {
      $sandbox.stub(MicroserviceCapAddManager, 'create').resolves()
      $sandbox.stub(MicroserviceCapDropManager, 'create').resolves()
      $sandbox.stub(MicroserviceArgManager, 'create').resolves()
      $sandbox.stub(MicroserviceHealthCheckManager, 'create').resolves()
      $sandbox.stub(MicroserviceEnvManager, 'create').resolves()
    })

    it('persists capAdd, capDrop, cmd, and healthCheck on create', async () => {
      await WorkloadSpec.createWorkloadRelations(
        { uuid: 'ms-uuid' },
        {
          capAdd: ['NET_ADMIN'],
          capDrop: ['MKNOD'],
          cmd: ['/bin/controller'],
          healthCheck: { test: ['CMD', 'true'], interval: 30 }
        },
        { transaction }
      )

      expect(MicroserviceCapAddManager.create).to.have.been.calledWith(
        { capAdd: 'NET_ADMIN', microserviceUuid: 'ms-uuid' },
        transaction
      )
      expect(MicroserviceCapDropManager.create).to.have.been.calledWith(
        { capDrop: 'MKNOD', microserviceUuid: 'ms-uuid' },
        transaction
      )
      expect(MicroserviceArgManager.create).to.have.been.calledWith(
        { cmd: '/bin/controller', microserviceUuid: 'ms-uuid' },
        transaction
      )
      expect(MicroserviceHealthCheckManager.create).to.have.been.called
    })
  })

  describe('.updateWorkloadRelations()', () => {
    beforeEach(() => {
      $sandbox.stub(MicroserviceCapAddManager, 'delete').resolves()
      $sandbox.stub(MicroserviceCapAddManager, 'create').resolves()
    })

    it('clears capAdd when an empty array is sent', async () => {
      await WorkloadSpec.updateWorkloadRelations(
        'ms-uuid',
        { capAdd: [] },
        { transaction }
      )

      expect(MicroserviceCapAddManager.delete).to.have.been.calledWith({ microserviceUuid: 'ms-uuid' }, transaction)
      expect(MicroserviceCapAddManager.create).to.not.have.been.called
    })
  })
})
