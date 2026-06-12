'use strict'

const DEFAULT_POLICY = {
  minPasswordLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  passwordMaxAgeDays: 0,
  passwordHistoryCount: 5,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 3600,
  refreshRotation: true,
  maxConcurrentSessions: null
}

module.exports = {
  DEFAULT_POLICY
}
