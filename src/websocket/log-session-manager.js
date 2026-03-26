/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const WebSocket = require('ws')
const logger = require('../logger')
const MicroserviceLogStatusManager = require('../data/managers/microservice-log-status-manager')
const FogLogStatusManager = require('../data/managers/fog-log-status-manager')
const ChangeTrackingService = require('../services/change-tracking-service')
const FogManager = require('../data/managers/iofog-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')

class LogSessionManager {
  constructor (config) {
    if (!config || !config.session) {
      const error = new Error('Invalid session manager configuration')
      logger.error('Failed to initialize LogSessionManager:' + error)
      throw error
    }
    this.logSessions = new Map() // Map<sessionId, LogSession>
    this.config = config
    this.cleanupInterval = null
    this.startCleanupInterval()
    logger.info('LogSessionManager initialized with config:' + JSON.stringify({
      sessionTimeout: config.session.timeout,
      cleanupInterval: config.session.cleanupInterval
    }))
  }

  createLogSession (sessionId, microserviceUuid, fogUuid, agentWs, userWs, tailConfig, transaction) {
    const session = {
      sessionId, // Unique per user session
      microserviceUuid,
      fogUuid,
      agent: agentWs,
      user: userWs, // Single user per session (one-to-one)
      tailConfig: tailConfig, // Per-session tail configuration
      lastActivity: Date.now(),
      createdAt: Date.now(),
      transaction
    }
    this.logSessions.set(sessionId, session)
    return session
  }

  getLogSession (sessionId) {
    return this.logSessions.get(sessionId) || null
  }

  getAllSessionsForLogSource (microserviceUuid, fogUuid) {
    const sessions = []
    for (const [, session] of this.logSessions) {
      if ((fogUuid && session.fogUuid === fogUuid) ||
          (microserviceUuid && session.microserviceUuid === microserviceUuid)) {
        sessions.push(session)
      }
    }
    return sessions
  }

  updateLastActivity (sessionId) {
    const session = this.logSessions.get(sessionId)
    if (session) {
      session.lastActivity = Date.now()
    }
  }

  async removeLogSession (sessionId, transaction) {
    const session = this.logSessions.get(sessionId)
    if (!session) return

    // Close connections
    if (session.agent && session.agent.readyState === WebSocket.OPEN) {
      session.agent.close()
    }
    if (session.user && session.user.readyState === WebSocket.OPEN) {
      session.user.close()
    }
    this.logSessions.delete(sessionId)

    // Remove from database
    try {
      if (session.microserviceUuid) {
        await MicroserviceLogStatusManager.delete(
          { sessionId: sessionId },
          transaction
        )
      } else if (session.fogUuid) {
        await FogLogStatusManager.delete(
          { sessionId: sessionId },
          transaction
        )
      }

      // Trigger change tracking (so agent knows session is removed)
      let fogUuid = session.fogUuid
      if (!fogUuid && session.microserviceUuid) {
        // Get fog UUID from microservice
        const microservice = await MicroserviceManager.findOne(
          { uuid: session.microserviceUuid },
          transaction
        )
        if (microservice) {
          fogUuid = microservice.iofogUuid
        }
      }

      if (fogUuid) {
        const fog = await FogManager.findOne({ uuid: fogUuid }, transaction)
        if (fog) {
          await ChangeTrackingService.update(
            fog.uuid,
            session.microserviceUuid ? ChangeTrackingService.events.microserviceLogs : ChangeTrackingService.events.fogLogs,
            transaction
          )
        }
      }
    } catch (error) {
      logger.error('Error removing log session from database:' + JSON.stringify({
        error: error.message,
        stack: error.stack,
        sessionId: sessionId,
        microserviceUuid: session.microserviceUuid,
        fogUuid: session.fogUuid
      }))
    }
  }

  // Cleanup expired sessions (timeout mechanism)
  async cleanupExpiredSessions (transaction) {
    const now = Date.now()
    const timeout = this.config.session.timeout || 3600000 // Default 1 hour
    const expiredSessions = []

    for (const [sessionId, session] of this.logSessions) {
      const timeSinceLastActivity = now - session.lastActivity
      const timeSinceCreation = now - session.createdAt

      // Session is expired if:
      // 1. No activity for timeout period AND session is older than timeout
      // 2. OR user disconnected but agent still connected (orphaned agent connection)
      // 3. OR agent disconnected but user still connected (orphaned user connection)
      const isExpired = (
        (timeSinceLastActivity > timeout && timeSinceCreation > timeout) ||
        (!session.user && session.agent) || // Orphaned agent
        (!session.agent && session.user && timeSinceCreation > timeout) // Orphaned user (wait timeout before cleanup)
      )

      if (isExpired) {
        expiredSessions.push(sessionId)
      }
    }

    // Remove expired sessions
    for (const sessionId of expiredSessions) {
      logger.info('Cleaning up expired log session:' + JSON.stringify({ sessionId }))
      await this.removeLogSession(sessionId, transaction)
    }

    return expiredSessions.length
  }

  startCleanupInterval () {
    const interval = this.config.session.cleanupInterval || 30000 // Default 30 seconds
    this.cleanupInterval = setInterval(async () => {
      try {
        const models = require('../data/models')
        const sequelize = models.sequelize
        if (!sequelize) {
          logger.warn('Sequelize not available, skipping log session cleanup')
          return
        }

        await sequelize.transaction(async (transaction) => {
          await this.cleanupExpiredSessions(transaction)
        })
      } catch (error) {
        logger.error('Error during log session cleanup:' + JSON.stringify({
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

module.exports = LogSessionManager
