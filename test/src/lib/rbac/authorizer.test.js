const { expect } = require('chai')
const sinon = require('sinon')

const RbacCacheVersionManager = require('../../../../src/data/managers/rbac-cache-version-manager')
const RbacRoleBindingManager = require('../../../../src/data/managers/rbac-role-binding-manager')
const RbacRoleManager = require('../../../../src/data/managers/rbac-role-manager')
const transactionRunner = require('../../../../src/helpers/transaction-runner')
const authorizer = require('../../../../src/lib/rbac/authorizer')

const VIEWER_SUBJECTS = [{ kind: 'Group', name: 'viewer' }]
const USER_SUBJECTS = [{ kind: 'User', name: 'alice' }]
const MICROSERVICES_GET = ['', 'microservices', 'get', null]

describe('RBAC authorizer fast path', () => {
  def('sandbox', () => sinon.createSandbox())
  def('fakeTransaction', () => ({ id: 'test-tx' }))

  beforeEach(() => {
    authorizer._resetStateForTests()
    $sandbox.stub(RbacCacheVersionManager, 'getVersionWithoutTransaction').resolves(1)
    $sandbox.stub(transactionRunner, 'runInTransaction').callsFake(async (fn) => fn($fakeTransaction))
    $sandbox.stub(RbacRoleBindingManager, 'findRoleBindingsBySubject').resolves([])
  })

  afterEach(() => {
    $sandbox.restore()
    authorizer._resetStateForTests()
  })

  describe('authorizeRequest()', () => {
    it('denies when no subjects are provided', async () => {
      const result = await authorizer.authorizeRequest([], ...MICROSERVICES_GET)

      expect(result).to.deep.equal({ allowed: false, reason: 'No subjects provided' })
      expect(transactionRunner.runInTransaction).to.not.have.been.called
      expect(RbacCacheVersionManager.getVersionWithoutTransaction).to.not.have.been.called
    })

    it('runs full authorization in a transaction on cache miss', async () => {
      const result = await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)

      expect(result.allowed).to.equal(true)
      expect(transactionRunner.runInTransaction).to.have.been.calledOnce
      expect(RbacCacheVersionManager.getVersionWithoutTransaction).to.have.been.calledOnce
    })

    it('serves cache hits without DB or transaction when version check is fresh', async () => {
      await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)

      transactionRunner.runInTransaction.resetHistory()
      RbacCacheVersionManager.getVersionWithoutTransaction.resetHistory()

      const result = await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)

      expect(result.allowed).to.equal(true)
      expect(transactionRunner.runInTransaction).to.not.have.been.called
      expect(RbacCacheVersionManager.getVersionWithoutTransaction).to.not.have.been.called
    })

    it('re-checks version after the interval but still skips transaction on cache hit', async () => {
      const clock = $sandbox.useFakeTimers({ now: Date.now(), toFake: ['Date'] })

      await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)

      clock.tick(authorizer.VERSION_CHECK_INTERVAL_MS + 1)
      transactionRunner.runInTransaction.resetHistory()
      RbacCacheVersionManager.getVersionWithoutTransaction.resetHistory()

      const result = await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)

      expect(result.allowed).to.equal(true)
      expect(RbacCacheVersionManager.getVersionWithoutTransaction).to.have.been.calledOnce
      expect(transactionRunner.runInTransaction).to.not.have.been.called

      clock.restore()
    })

    it('clears cache and re-authorizes when version changes', async () => {
      await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)

      RbacCacheVersionManager.getVersionWithoutTransaction.resolves(2)
      authorizer._setVersionCheckStateForTests({ lastVersionCheckAt: 0 })

      transactionRunner.runInTransaction.resetHistory()

      const result = await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)

      expect(result.allowed).to.equal(true)
      expect(transactionRunner.runInTransaction).to.have.been.calledOnce
    })

    it('caches deny decisions and serves them from the fast path', async () => {
      const result = await authorizer.authorizeRequest(USER_SUBJECTS, ...MICROSERVICES_GET)

      expect(result.allowed).to.equal(false)
      expect(transactionRunner.runInTransaction).to.have.been.calledOnce

      transactionRunner.runInTransaction.resetHistory()
      RbacCacheVersionManager.getVersionWithoutTransaction.resetHistory()

      const cachedDeny = await authorizer.authorizeRequest(USER_SUBJECTS, ...MICROSERVICES_GET)

      expect(cachedDeny.allowed).to.equal(false)
      expect(transactionRunner.runInTransaction).to.not.have.been.called
      expect(RbacCacheVersionManager.getVersionWithoutTransaction).to.not.have.been.called
    })

    it('uses separate cache entries for different subjects and resources', async () => {
      await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)
      transactionRunner.runInTransaction.resetHistory()

      await authorizer.authorizeRequest(USER_SUBJECTS, ...MICROSERVICES_GET)

      expect(transactionRunner.runInTransaction).to.have.been.calledOnce

      transactionRunner.runInTransaction.resetHistory()
      await authorizer.authorizeRequest(VIEWER_SUBJECTS, '', 'applications', 'get', null)
      expect(transactionRunner.runInTransaction).to.have.been.calledOnce
    })
  })

  describe('authorize() full path', () => {
    it('allows viewer system role for microservices get', async () => {
      const result = await authorizer.authorize(
        VIEWER_SUBJECTS,
        ...MICROSERVICES_GET,
        $fakeTransaction
      )

      expect(result.allowed).to.equal(true)
      expect(result.reason).to.include('viewer system role')
      expect(RbacRoleBindingManager.findRoleBindingsBySubject).to.not.have.been.called
    })

    it('resolves custom role bindings when system role check does not match', async () => {
      RbacRoleBindingManager.findRoleBindingsBySubject.resolves([{
        roleRef: { kind: 'Role', name: 'custom-reader' }
      }])
      $sandbox.stub(RbacRoleManager, 'getRoleWithRules').resolves({
        rules: [{
          apiGroups: [''],
          resources: ['microservices'],
          verbs: ['get']
        }]
      })

      const result = await authorizer.authorize(
        USER_SUBJECTS,
        ...MICROSERVICES_GET,
        $fakeTransaction
      )

      expect(result.allowed).to.equal(true)
      expect(result.reason).to.equal('Rule matched')
      expect(RbacRoleBindingManager.findRoleBindingsBySubject).to.have.been.calledOnce
    })

    it('denies when no matching system role or role binding exists', async () => {
      const result = await authorizer.authorize(
        USER_SUBJECTS,
        ...MICROSERVICES_GET,
        $fakeTransaction
      )

      expect(result.allowed).to.equal(false)
      expect(RbacRoleBindingManager.findRoleBindingsBySubject).to.have.been.called
    })

    it('returns cached result inside transaction path without re-querying bindings', async () => {
      await authorizer.authorize(VIEWER_SUBJECTS, ...MICROSERVICES_GET, $fakeTransaction)
      RbacRoleBindingManager.findRoleBindingsBySubject.resetHistory()

      const result = await authorizer.authorize(
        VIEWER_SUBJECTS,
        ...MICROSERVICES_GET,
        $fakeTransaction
      )

      expect(result.allowed).to.equal(true)
      expect(RbacRoleBindingManager.findRoleBindingsBySubject).to.not.have.been.called
    })
  })

  describe('cache maintenance', () => {
    it('clearCache removes all cached entries forcing a new transaction', async () => {
      await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)
      authorizer.clearCache()
      authorizer._setVersionCheckStateForTests({ lastVersionCheckAt: Date.now() })

      transactionRunner.runInTransaction.resetHistory()

      await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)

      expect(transactionRunner.runInTransaction).to.have.been.calledOnce
    })

    it('continues to serve cache hits when version check fails', async () => {
      await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)

      RbacCacheVersionManager.getVersionWithoutTransaction.rejects(new Error('db unavailable'))
      authorizer._setVersionCheckStateForTests({ lastVersionCheckAt: 0 })

      transactionRunner.runInTransaction.resetHistory()

      const result = await authorizer.authorizeRequest(VIEWER_SUBJECTS, ...MICROSERVICES_GET)

      expect(result.allowed).to.equal(true)
      expect(transactionRunner.runInTransaction).to.not.have.been.called
    })
  })
})
