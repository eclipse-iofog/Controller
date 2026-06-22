'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const Errors = require('../../../src/helpers/errors')

function stubModelMethod (db, modelName, methodName, sandbox, impl) {
  if (!db[modelName]) {
    db[modelName] = {}
  }
  db[modelName][methodName] = sandbox.stub().callsFake(impl)
}

function createGroupRecord (data) {
  const record = {
    id: 4,
    name: 'viewer',
    isSystem: true,
    mfaRequired: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...data
  }

  record.update = async function (fields) {
    Object.assign(this, fields)
    return this
  }

  record.destroy = async function () {
    record._deleted = true
    return undefined
  }

  return record
}

function reloadAuthUserService () {
  delete require.cache[require.resolve('../../../src/services/auth-user-service')]
  return require('../../../src/services/auth-user-service')
}

describe('auth-user-service groups by name', () => {
  def('sandbox', () => sinon.createSandbox())
  def('viewerGroup', () => createGroupRecord({ id: 4, name: 'viewer', isSystem: true }))

  afterEach(() => {
    $sandbox.restore()
    delete require.cache[require.resolve('../../../src/services/auth-user-service')]
  })

  it('gets a group by name', async () => {
    const db = require('../../../src/data/models')
    stubModelMethod(db, 'AuthGroup', 'findOne', $sandbox, async () => $viewerGroup)

    const { getGroup } = reloadAuthUserService()
    const result = await getGroup('viewer')

    expect(result).to.deep.include({ id: 4, name: 'viewer', isSystem: true, mfaRequired: false })
    expect(db.AuthGroup.findOne.firstCall.args[0].where).to.deep.equal({ name: 'viewer' })
  })

  it('normalizes group name lookup to lowercase', async () => {
    const db = require('../../../src/data/models')
    stubModelMethod(db, 'AuthGroup', 'findOne', $sandbox, async () => $viewerGroup)

    const { getGroup } = reloadAuthUserService()
    await getGroup('Viewer')

    expect(db.AuthGroup.findOne.firstCall.args[0].where).to.deep.equal({ name: 'viewer' })
  })

  it('returns 404 when group name is not found', async () => {
    const db = require('../../../src/data/models')
    stubModelMethod(db, 'AuthGroup', 'findOne', $sandbox, async () => null)

    const { getGroup } = reloadAuthUserService()

    try {
      await getGroup('missing-group')
      expect.fail('expected not found')
    } catch (error) {
      expect(error).to.be.instanceOf(Errors.NotFoundError)
    }
  })

  it('rejects deleting system groups by name', async () => {
    const db = require('../../../src/data/models')
    stubModelMethod(db, 'AuthGroup', 'findOne', $sandbox, async () => $viewerGroup)

    const { deleteGroup } = reloadAuthUserService()

    try {
      await deleteGroup('viewer')
      expect.fail('expected forbidden')
    } catch (error) {
      expect(error).to.be.instanceOf(Errors.ForbiddenError)
    }
  })

  it('updates mfaRequired on a system group', async () => {
    const db = require('../../../src/data/models')
    const adminGroup = createGroupRecord({ id: 1, name: 'admin', isSystem: true, mfaRequired: true })
    stubModelMethod(db, 'AuthGroup', 'findOne', $sandbox, async () => adminGroup)

    const { updateGroup } = reloadAuthUserService()
    const result = await updateGroup('admin', { mfaRequired: false })

    expect(result.mfaRequired).to.equal(false)
    expect(adminGroup.mfaRequired).to.equal(false)
  })

  it('rejects renaming a system group', async () => {
    const db = require('../../../src/data/models')
    stubModelMethod(db, 'AuthGroup', 'findOne', $sandbox, async () => $viewerGroup)

    const { updateGroup } = reloadAuthUserService()

    try {
      await updateGroup('viewer', { name: 'read-only' })
      expect.fail('expected forbidden')
    } catch (error) {
      expect(error).to.be.instanceOf(Errors.ForbiddenError)
    }
  })

  it('creates a custom group with mfaRequired', async () => {
    const db = require('../../../src/data/models')
    stubModelMethod(db, 'AuthGroup', 'findOne', $sandbox, async () => null)
    stubModelMethod(db, 'AuthGroup', 'create', $sandbox, async (values) => createGroupRecord({
      id: 10,
      isSystem: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      ...values
    }))

    const { createGroup } = reloadAuthUserService()
    const result = await createGroup({ name: 'secops', mfaRequired: true })

    expect(result).to.deep.include({ name: 'secops', isSystem: false, mfaRequired: true })
  })
})
