const { expect } = require('chai')
const sinon = require('sinon')

const ClusterControllerService = require('../../../src/services/cluster-controller-service')
const ClusterControllerManager = require('../../../src/data/managers/cluster-controller-manager')

describe('Cluster Controller Service', () => {
  def('sandbox', () => sinon.createSandbox())
  afterEach(() => $sandbox.restore())

  describe('.listClusterControllers()', () => {
    const transaction = {}
    const activeRow = {
      uuid: 'active-uuid',
      host: 'controller-pod-a',
      processId: 1,
      lastHeartbeat: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const inactiveRow = {
      uuid: 'inactive-uuid',
      host: 'controller-pod-b',
      processId: 1,
      lastHeartbeat: new Date(),
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    beforeEach(() => {
      $sandbox.stub(ClusterControllerManager, 'findAll').callsFake((where) => {
        const rows = [activeRow, inactiveRow]
        if (where && where.isActive === true) {
          return Promise.resolve(rows.filter((row) => row.isActive))
        }
        return Promise.resolve(rows)
      })
    })

    it('returns only active controllers by default', async () => {
      const result = await ClusterControllerService.listClusterControllers(false, transaction)

      expect(ClusterControllerManager.findAll).to.have.been.calledWith({ isActive: true }, transaction)
      expect(result).to.have.length(1)
      expect(result[0].uuid).to.equal('active-uuid')
      expect(result[0].isActive).to.equal(true)
    })

    it('returns all controllers when includeInactive is true', async () => {
      const result = await ClusterControllerService.listClusterControllers(true, transaction)

      expect(ClusterControllerManager.findAll).to.have.been.calledWith({}, transaction)
      expect(result).to.have.length(2)
      expect(result.map((row) => row.uuid)).to.deep.equal(['active-uuid', 'inactive-uuid'])
    })
  })
})
