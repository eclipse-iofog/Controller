const { expect } = require('chai')
const sinon = require('sinon')
const config = require('../../../src/config')
const constants = require('../../../src/helpers/constants')
const {
  authRateLimitMiddleware,
  resetAuthRateLimitStore,
  isProtectedAuthRoute
} = require('../../../src/middlewares/auth-rate-limit-middleware')

describe('auth-rate-limit-middleware', () => {
  def('sandbox', () => sinon.createSandbox())
  def('next', () => sinon.spy())
  def('res', () => ({
    status: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis(),
    set: sinon.stub().returnsThis()
  }))

  beforeEach(() => {
    resetAuthRateLimitStore()
    $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
      const overrides = {
        'auth.rateLimit.enabled': true,
        'auth.rateLimit.maxRequestsPerWindow': 2,
        'auth.rateLimit.windowMs': 60000
      }
      return overrides[key] !== undefined ? overrides[key] : defaultValue
    })
  })

  afterEach(() => {
    $sandbox.restore()
    resetAuthRateLimitStore()
  })

  describe('isProtectedAuthRoute', () => {
    it('matches exact auth endpoints', () => {
      expect(isProtectedAuthRoute('POST', '/api/v3/user/login')).to.equal(true)
      expect(isProtectedAuthRoute('GET', '/api/v3/user/oauth/authorize')).to.equal(true)
      expect(isProtectedAuthRoute('POST', '/api/v3/user/change-password')).to.equal(true)
    })

    it('matches POST interaction endpoints only', () => {
      expect(isProtectedAuthRoute('POST', '/api/v3/user/interaction/abc/login')).to.equal(true)
      expect(isProtectedAuthRoute('GET', '/api/v3/user/interaction/abc')).to.equal(false)
    })

    it('ignores unrelated routes', () => {
      expect(isProtectedAuthRoute('POST', '/api/v3/user/refresh')).to.equal(false)
      expect(isProtectedAuthRoute('GET', '/api/v3/user/profile')).to.equal(false)
    })
  })

  describe('authRateLimitMiddleware', () => {
    def('req', () => ({
      method: 'POST',
      path: '/api/v3/user/login',
      ip: '203.0.113.10'
    }))

    it('passes through non-auth routes', () => {
      authRateLimitMiddleware({ method: 'POST', path: '/api/v3/user/refresh', ip: '203.0.113.10' }, $res, $next)

      expect($next).to.have.been.calledOnce
      expect($res.status).to.not.have.been.called
    })

    it('allows requests under the configured limit', () => {
      authRateLimitMiddleware($req, $res, $next)
      authRateLimitMiddleware($req, $res, $next)

      expect($next).to.have.been.calledTwice
      expect($res.status).to.not.have.been.called
    })

    it('returns 429 with a consistent error body when the limit is exceeded', () => {
      authRateLimitMiddleware($req, $res, $next)
      authRateLimitMiddleware($req, $res, $next)
      authRateLimitMiddleware($req, $res, $next)

      expect($next).to.have.been.calledTwice
      expect($res.status).to.have.been.calledOnceWith(constants.HTTP_CODE_TOO_MANY_REQUESTS)
      expect($res.set).to.have.been.calledWith('Retry-After', sinon.match.string)
      expect($res.json).to.have.been.calledOnceWith({
        name: 'RateLimitExceededError',
        message: 'Too many authentication requests from this IP address'
      })
    })

    it('tracks limits per client IP', () => {
      authRateLimitMiddleware($req, $res, $next)
      authRateLimitMiddleware($req, $res, $next)
      authRateLimitMiddleware($req, $res, $next)

      const otherReq = { ...$req, ip: '203.0.113.11' }
      authRateLimitMiddleware(otherReq, $res, $next)

      expect($next).to.have.been.calledThrice
    })

    it('skips limiting when disabled in config', () => {
      config.get.restore()
      $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
        if (key === 'auth.rateLimit.enabled') {
          return false
        }
        return defaultValue
      })

      authRateLimitMiddleware($req, $res, $next)
      authRateLimitMiddleware($req, $res, $next)
      authRateLimitMiddleware($req, $res, $next)

      expect($next).to.have.been.calledThrice
      expect($res.status).to.not.have.been.called
    })
  })
})
