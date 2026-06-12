const config = require('../config')
const constants = require('../helpers/constants')
const logger = require('../logger')

const EXACT_PATHS = new Set([
  '/api/v3/user/login',
  '/api/v3/user/oauth/authorize',
  '/api/v3/user/oauth/callback',
  '/api/v3/user/change-password',
  '/api/v3/user/mfa/enroll',
  '/api/v3/user/mfa/confirm'
])

const INTERACTION_POST_PREFIX = '/api/v3/user/interaction/'

const rateLimits = new Map()

function getRateLimitConfig () {
  return {
    enabled: config.get('auth.rateLimit.enabled', true),
    maxRequests: config.get('auth.rateLimit.maxRequestsPerWindow', 60),
    windowMs: config.get('auth.rateLimit.windowMs', 60000)
  }
}

function getClientIp (req) {
  return req.ip || (req.socket && req.socket.remoteAddress) || 'unknown'
}

function isProtectedAuthRoute (method, path) {
  const normalizedMethod = (method || '').toUpperCase()
  const normalizedPath = path || ''

  if (EXACT_PATHS.has(normalizedPath)) {
    return true
  }

  return normalizedMethod === 'POST' &&
    normalizedPath.startsWith(INTERACTION_POST_PREFIX) &&
    normalizedPath.length > INTERACTION_POST_PREFIX.length
}

function buildRateLimitResponse (resetTime) {
  return {
    name: 'RateLimitExceededError',
    message: 'Too many authentication requests from this IP address'
  }
}

function authRateLimitMiddleware (req, res, next) {
  const { enabled, maxRequests, windowMs } = getRateLimitConfig()
  if (!enabled) {
    return next()
  }

  const path = req.path || (req.url && req.url.split('?')[0]) || ''
  if (!isProtectedAuthRoute(req.method, path)) {
    return next()
  }

  const clientIp = getClientIp(req)
  const now = Date.now()
  let bucket = rateLimits.get(clientIp)

  if (!bucket || now > bucket.resetTime) {
    bucket = { count: 0, resetTime: now + windowMs }
  }

  if (bucket.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetTime - now) / 1000))
    logger.warn({
      msg: 'Auth rate limit exceeded',
      clientIp,
      method: req.method,
      path
    })
    res.set('Retry-After', String(retryAfterSeconds))
    return res.status(constants.HTTP_CODE_TOO_MANY_REQUESTS).json(buildRateLimitResponse(bucket.resetTime))
  }

  bucket.count += 1
  rateLimits.set(clientIp, bucket)
  return next()
}

function resetAuthRateLimitStore () {
  rateLimits.clear()
}

module.exports = {
  authRateLimitMiddleware,
  resetAuthRateLimitStore,
  isProtectedAuthRoute,
  getRateLimitConfig
}
