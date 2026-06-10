const { expect } = require('chai')
const sinon = require('sinon')

const authorizer = require('../../../../src/lib/rbac/authorizer')
const rbacMiddleware = require('../../../../src/lib/rbac/middleware')
const { MockOidcProvider } = require('../../../support/mock-oidc-provider')
const {
  snapshotOidcEnv,
  restoreOidcEnv,
  applyOidcEnv,
  enableMockOidcTls,
  restoreMockOidcTls,
  reloadOidcModule,
  runMiddleware
} = require('../../../support/oidc-test-helpers')

describe('RBAC middleware OIDC integration', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('provider', () => new MockOidcProvider())

  beforeEach(async () => {
    enableMockOidcTls()
    await $provider.start()
  })

  afterEach(async () => {
    $sandbox.restore()
    restoreOidcEnv($envSnapshot)
    restoreMockOidcTls()
    await $provider.stop()
  })

  describe('extractSubjects()', () => {
    it('extracts user and roles claim subjects', () => {
      const req = {
        kauth: {
          grant: {
            access_token: {
              content: {
                preferred_username: 'alice',
                roles: ['SRE', 'Developer']
              }
            }
          }
        }
      }

      const subjects = rbacMiddleware.extractSubjects(req)
      expect(subjects).to.deep.include({ kind: 'User', name: 'alice' })
      expect(subjects).to.deep.include({ kind: 'Group', name: 'sre' })
      expect(subjects).to.deep.include({ kind: 'Group', name: 'developer' })
    })

    it('extracts Keycloak-style resource_access roles for the configured client', () => {
      applyOidcEnv($provider.getEnv())
      reloadOidcModule()

      const req = {
        kauth: {
          grant: {
            access_token: {
              content: {
                preferred_username: 'bob',
                resource_access: {
                  [$provider.clientId]: {
                    roles: ['Viewer']
                  }
                }
              }
            }
          }
        }
      }

      const subjects = rbacMiddleware.extractSubjects(req)
      expect(subjects).to.deep.include({ kind: 'User', name: 'bob' })
      expect(subjects).to.deep.include({ kind: 'Group', name: 'viewer' })
    })

    it('returns an empty list when req.kauth is missing', () => {
      expect(rbacMiddleware.extractSubjects({})).to.deep.equal([])
    })
  })

  describe('protect()', () => {
    def('callback', () => sinon.spy())
    def('res', () => ({
      statusCode: null,
      body: null,
      status (code) {
        this.statusCode = code
        return this
      },
      json (payload) {
        this.body = payload
        return this
      }
    }))

    it('returns 401 when no authentication information is present', async () => {
      const req = { method: 'GET', path: '/api/v3/applications' }
      await rbacMiddleware.protect()(req, $res, $callback)

      expect($res.statusCode).to.equal(401)
      expect($res.body.error).to.match(/Unauthorized/)
      expect($callback).to.not.have.been.called
    })

    it('allows routes that are not listed in the RBAC catalog', async () => {
      const req = {
        method: 'GET',
        path: '/api/v3/not-in-catalog',
        kauth: {
          grant: {
            access_token: {
              content: {
                preferred_username: 'alice'
              }
            }
          }
        }
      }

      await rbacMiddleware.protect()(req, $res, $callback)
      expect($callback).to.have.been.calledOnce
      expect($res.statusCode).to.equal(null)
    })

    it('authorizes catalog routes using subjects from OIDC bearer tokens', async () => {
      applyOidcEnv($provider.getEnv())
      const oidc = reloadOidcModule()
      oidc.initOidc()

      const token = await $provider.issueAccessToken({
        preferred_username: 'alice',
        roles: ['SRE']
      })

      const middlewareResult = await runMiddleware(oidc.getOidcMiddleware(), {
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      $sandbox.stub(authorizer, 'authorize').resolves({ allowed: true })

      const req = {
        method: 'GET',
        path: '/api/v3/microservices/',
        kauth: middlewareResult.req.kauth
      }

      await rbacMiddleware.protect()(req, $res, $callback)

      expect(authorizer.authorize).to.have.been.calledOnce
      expect($callback).to.have.been.calledOnce
      expect($res.statusCode).to.equal(null)
    })

    it('returns 403 when authorizer denies access', async () => {
      $sandbox.stub(authorizer, 'authorize').resolves({
        allowed: false,
        reason: 'insufficient permissions'
      })

      const req = {
        method: 'GET',
        path: '/api/v3/microservices/',
        kauth: {
          grant: {
            access_token: {
              content: {
                preferred_username: 'alice'
              }
            }
          }
        }
      }

      await rbacMiddleware.protect()(req, $res, $callback)

      expect($res.statusCode).to.equal(403)
      expect($res.body.error).to.equal('Forbidden')
      expect($callback).to.not.have.been.called
    })
  })
})
