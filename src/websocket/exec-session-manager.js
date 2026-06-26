const WebSocket = require('ws')
const logger = require('../logger')
const MicroserviceExecSessionManager = require('../data/managers/microservice-exec-session-manager')
const ChangeTrackingService = require('../services/change-tracking-service')
const FogManager = require('../data/managers/iofog-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')

class ExecSessionManager {
  constructor (config) {
    if (!config || !config.session) {
      const error = new Error('Invalid session manager configuration')
      logger.error('Failed to initialize ExecSessionManager:' + error)
      throw error
    }
    this.execSessions = new Map()
    this.config = config
    this.cleanupInterval = null
    this.startCleanupInterval()
    logger.info('ExecSessionManager initialized with config:' + JSON.stringify({
      execPendingTimeoutMs: config.session.execPendingTimeoutMs,
      execMaxDurationMs: config.session.execMaxDurationMs,
      cleanupInterval: config.session.cleanupInterval
    }))
  }

  countSessionsForResource (microserviceUuid) {
    return this.getAllSessionsForMicroservice(microserviceUuid).length
  }

  getActiveExecSessionCount () {
    return this.execSessions.size
  }

  getAllExecSessionIds () {
    return Array.from(this.execSessions.keys())
  }

  createExecSession (sessionId, microserviceUuid, agentWs, userWs, transaction) {
    const session = {
      sessionId,
      execId: sessionId,
      microserviceUuid,
      agent: agentWs,
      user: userWs,
      lastActivity: Date.now(),
      createdAt: Date.now(),
      transaction,
      queueBridgeEnabled: false,
      metricsActive: false
    }
    this.execSessions.set(sessionId, session)
    return session
  }

  getExecSession (sessionId) {
    return this.execSessions.get(sessionId) || null
  }

  getAllSessionsForMicroservice (microserviceUuid) {
    const sessions = []
    for (const [, session] of this.execSessions) {
      if (session.microserviceUuid === microserviceUuid) {
        sessions.push(session)
      }
    }
    return sessions
  }

  updateLastActivity (sessionId) {
    const session = this.execSessions.get(sessionId)
    if (session) {
      session.lastActivity = Date.now()
    }
  }

  async removeExecSession (sessionId, transaction) {
    const session = this.execSessions.get(sessionId)
    if (!session) return

    if (session.agent && session.agent.readyState === WebSocket.OPEN) {
      session.agent.close()
    }
    if (session.user && session.user.readyState === WebSocket.OPEN) {
      session.user.close()
    }
    this.execSessions.delete(sessionId)

    try {
      await MicroserviceExecSessionManager.deleteBySessionId(sessionId, transaction)

      const microservice = await MicroserviceManager.findOne(
        { uuid: session.microserviceUuid },
        transaction
      )
      if (microservice) {
        const fog = await FogManager.findOne({ uuid: microservice.iofogUuid }, transaction)
        if (fog) {
          await ChangeTrackingService.update(
            fog.uuid,
            ChangeTrackingService.events.microserviceExecSessions,
            transaction
          )
        }
      }
    } catch (error) {
      logger.error('Error removing exec session from database:' + JSON.stringify({
        error: error.message,
        stack: error.stack,
        sessionId,
        microserviceUuid: session.microserviceUuid
      }))
    }
  }

  async cleanupExpiredSessions (transaction) {
    const now = Date.now()
    const pendingTimeout = this.config.session.execPendingTimeoutMs || 60000
    const maxDuration = this.config.session.execMaxDurationMs || 28800000
    const expiredSessions = []

    for (const [sessionId, session] of this.execSessions) {
      const timeSinceLastActivity = now - session.lastActivity
      const timeSinceCreation = now - session.createdAt

      let isExpired = false

      if (!session.agent && session.user) {
        isExpired = timeSinceCreation > pendingTimeout
      } else if (session.agent && !session.user) {
        isExpired = timeSinceLastActivity > pendingTimeout
      } else if (session.agent && session.user) {
        isExpired = timeSinceLastActivity > maxDuration
      } else {
        isExpired = timeSinceCreation > pendingTimeout
      }

      if (isExpired) {
        expiredSessions.push(sessionId)
      }
    }

    for (const sessionId of expiredSessions) {
      logger.info('Cleaning up expired exec session:' + JSON.stringify({ sessionId }))
      const session = this.execSessions.get(sessionId)
      if (session && session.user && session.user.readyState === WebSocket.OPEN) {
        try {
          session.user.close(1008, session.agent ? 'Exec session max duration exceeded' : 'Timeout waiting for agent connection')
        } catch (error) {
          logger.warn('Failed to close expired exec user connection:' + error.message)
        }
      }
      if (session && session.agent && session.agent.readyState === WebSocket.OPEN) {
        try {
          session.agent.close(1000, 'Exec session expired')
        } catch (error) {
          logger.warn('Failed to close expired exec agent connection:' + error.message)
        }
      }
      await this.removeExecSession(sessionId, transaction)
    }

    return expiredSessions.length
  }

  startCleanupInterval () {
    const interval = this.config.session.cleanupInterval || 30000
    this.cleanupInterval = setInterval(async () => {
      try {
        const models = require('../data/models')
        const sequelize = models.sequelize
        if (!sequelize) {
          logger.warn('Sequelize not available, skipping exec session cleanup')
          return
        }

        await sequelize.transaction(async (transaction) => {
          await this.cleanupExpiredSessions(transaction)
        })
      } catch (error) {
        logger.error('Error during exec session cleanup:' + JSON.stringify({
          error: error.message,
          stack: error.stack
        }))
      }
    }, interval)
  }

  stopCleanupInterval () {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

module.exports = ExecSessionManager
