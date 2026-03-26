const WebSocket = require('ws')
const logger = require('../logger')
const Errors = require('../helpers/errors')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const { microserviceExecState } = require('../enums/microservice-state')

class SessionManager {
  constructor (config) {
    if (!config || !config.session) {
      const error = new Errors.ValidationError('Invalid session manager configuration')
      logger.error('Failed to initialize SessionManager:' + error)
      throw error
    }
    this.sessions = new Map()
    this.pendingUsers = new Map() // Map<microserviceUuid, Set<WebSocket>>
    this.pendingAgents = new Map() // Map<microserviceUuid, Map<execId, {ws: WebSocket, execId: string}>>
    this.userRetryTimers = new Map() // Map<microserviceUuid, Map<userWs, timer>>
    this.config = config
    this.cleanupInterval = null
    logger.info('SessionManager initialized with config:' + JSON.stringify({
      sessionTimeout: config.session.timeout,
      maxConnections: config.session.maxConnections,
      cleanupInterval: config.session.cleanupInterval
    }))
  }

  createSession (execId, microserviceUuid, agentWs, userWs, transaction) {
    const session = {
      execId,
      microserviceUuid,
      agent: agentWs,
      user: userWs,
      lastActivity: Date.now(),
      transaction
    }
    this.sessions.set(execId, session)
    logger.info('Session created:' + JSON.stringify({
      execId,
      microserviceUuid,
      agentConnected: !!agentWs,
      userConnected: !!userWs
    }))
    return session
  }

  getSession (execId) {
    return this.sessions.get(execId) || null
  }

  async removeSession (execId, transaction) {
    const session = this.sessions.get(execId)
    if (session) {
      logger.info('Removing session:' + JSON.stringify({
        execId,
        microserviceUuid: session.microserviceUuid
      }))
      this.sessions.delete(execId)
      await MicroserviceExecStatusManager.update(
        { microserviceUuid: session.microserviceUuid },
        { execSessionId: '', status: microserviceExecState.INACTIVE },
        transaction
      )
      await MicroserviceManager.update({ uuid: session.microserviceUuid }, { execEnabled: false }, transaction)
    }
  }

  addPendingUser (microserviceUuid, userWs) {
    if (!this.pendingUsers.has(microserviceUuid)) {
      this.pendingUsers.set(microserviceUuid, new Map())
    }
    const users = this.pendingUsers.get(microserviceUuid)
    users.set(userWs, { timestamp: Date.now() })

    logger.info('Added pending user:' + JSON.stringify({
      microserviceUuid,
      pendingUserCount: users.size
    }))
  }

  async addPendingAgent (microserviceUuid, execId, agentWs, transaction) {
    if (!this.pendingAgents.has(microserviceUuid)) {
      this.pendingAgents.set(microserviceUuid, new Map())
      // await MicroserviceExecStatusManager.update(
      //   { microserviceUuid: microserviceUuid },
      //   { execSessionId: execId, status: microserviceExecState.PENDING },
      //   transaction
      // )
    }
    const agents = this.pendingAgents.get(microserviceUuid)

    // Check if agent with this execId already exists
    if (agents.has(execId)) {
      logger.warn('Agent with execId already exists in pending list:' + JSON.stringify({
        microserviceUuid,
        execId,
        existingAgentState: agents.get(execId).ws.readyState,
        newAgentState: agentWs.readyState
      }))
      // Remove old agent if it's not in OPEN state
      if (agents.get(execId).ws.readyState !== WebSocket.OPEN) {
        agents.delete(execId)
      } else {
        return // Skip adding if we already have an active agent with this execId
      }
    }

    const agentInfo = { ws: agentWs, execId }
    agents.set(execId, agentInfo)
    logger.info('Added pending agent:' + JSON.stringify({
      microserviceUuid,
      execId,
      pendingAgentCount: agents.size,
      agentState: agentWs.readyState
    }))
  }

  removePendingUser (microserviceUuid, userWs) {
    if (this.pendingUsers.has(microserviceUuid)) {
      const users = this.pendingUsers.get(microserviceUuid)
      users.delete(userWs)
      if (users.size === 0) {
        this.pendingUsers.delete(microserviceUuid)
      }

      // Clear retry timer when removing user
      this.clearUserRetryTimer(microserviceUuid, userWs)

      logger.info('Removed pending user:' + JSON.stringify({
        microserviceUuid,
        remainingUsers: users.size
      }))
    }
  }

  removePendingAgent (microserviceUuid, agentWs) {
    if (this.pendingAgents.has(microserviceUuid)) {
      const agents = this.pendingAgents.get(microserviceUuid)
      // Find and remove agent by WebSocket instance
      for (const [execId, agentInfo] of agents.entries()) {
        if (agentInfo.ws === agentWs) {
          agents.delete(execId)
          logger.info('Removed pending agent:' + JSON.stringify({
            microserviceUuid,
            execId,
            remainingAgents: agents.size
          }))
          break
        }
      }

      if (agents.size === 0) {
        this.pendingAgents.delete(microserviceUuid)
      }
    }
  }

  findPendingUserForExecId (microserviceUuid, execId) {
    if (this.pendingUsers.has(microserviceUuid)) {
      const users = this.pendingUsers.get(microserviceUuid)
      // Find any available user (no execId matching needed)
      for (const [userWs] of users.entries()) {
        if (userWs.readyState === WebSocket.OPEN) {
          return userWs
        }
      }
    }
    return null
  }

  findPendingAgentForExecId (microserviceUuid, execId) {
    if (this.pendingAgents.has(microserviceUuid)) {
      const agents = this.pendingAgents.get(microserviceUuid)
      const agentInfo = agents.get(execId)
      if (agentInfo && agentInfo.ws.readyState === WebSocket.OPEN) {
        return agentInfo.ws
      }
    }
    return null
  }

  async tryActivateSession (microserviceUuid, execId, newConnection, isAgent, transaction) {
    let pendingUser = null
    let pendingAgent = null
    let session = null

    try {
      if (isAgent) {
        pendingUser = this.findPendingUserForExecId(microserviceUuid, execId)
        if (pendingUser) {
          // Atomic operation: remove user and create session
          this.removePendingUser(microserviceUuid, pendingUser)
          session = this.createSession(execId, microserviceUuid, newConnection, pendingUser, transaction)
          logger.info('Session activated with agent first:' + JSON.stringify({
            execId,
            microserviceUuid,
            userConnected: !!pendingUser,
            agentConnected: !!newConnection,
            userState: pendingUser.readyState,
            agentState: newConnection.readyState
          }))
          await MicroserviceExecStatusManager.update(
            { microserviceUuid: microserviceUuid },
            { execSessionId: execId, status: microserviceExecState.ACTIVE },
            transaction
          )
        } else {
          await this.addPendingAgent(microserviceUuid, execId, newConnection, transaction)
          logger.info('No pending user found for agent, added to pending list:' + JSON.stringify({
            execId,
            microserviceUuid,
            agentState: newConnection.readyState
          }))
        }
      } else {
        pendingAgent = this.findPendingAgentForExecId(microserviceUuid, execId)
        if (pendingAgent) {
          // Atomic operation: remove agent and create session
          this.removePendingAgent(microserviceUuid, pendingAgent)
          session = this.createSession(execId, microserviceUuid, pendingAgent, newConnection, transaction)
          logger.info('Session activated with user first:' + JSON.stringify({
            execId,
            microserviceUuid,
            userConnected: !!newConnection,
            agentConnected: !!pendingAgent,
            userState: newConnection.readyState,
            agentState: pendingAgent.readyState
          }))
          await MicroserviceExecStatusManager.update(
            { microserviceUuid: microserviceUuid },
            { execSessionId: execId, status: microserviceExecState.ACTIVE },
            transaction
          )
        } else {
          this.addPendingUser(microserviceUuid, newConnection)
          logger.info('No pending agent found for user, added to pending list:' + JSON.stringify({
            execId,
            microserviceUuid,
            userState: newConnection.readyState
          }))
        }
      }
    } catch (error) {
      logger.error('Failed to activate session:' + JSON.stringify({
        error: error.message,
        execId,
        microserviceUuid,
        isAgent,
        userState: newConnection.readyState
      }))
      // Cleanup any partial state
      if (session) {
        await this.removeSession(execId, transaction)
      }
      throw error
    }

    return session
  }

  logSessionState () {
    logger.info('--- WebSocket SessionManager State ---')
    logger.info('Active sessions:')
    for (const [execId, session] of this.sessions) {
      logger.info(JSON.stringify({
        execId,
        microserviceUuid: session.microserviceUuid,
        agentConnected: !!session.agent,
        userConnected: !!session.user,
        lastActivity: new Date(session.lastActivity).toISOString(),
        agentState: session.agent ? session.agent.readyState : 'N/A',
        userState: session.user ? session.user.readyState : 'N/A'
      }))
    }
    logger.info('Pending users:')
    for (const [microserviceUuid, users] of this.pendingUsers) {
      logger.info(JSON.stringify({
        microserviceUuid,
        count: users.size,
        users: Array.from(users.entries()).map(([ws, info]) => ({
          timestamp: new Date(info.timestamp).toISOString(),
          readyState: ws.readyState
        }))
      }))
    }
    logger.info('Pending agents:')
    for (const [microserviceUuid, agents] of this.pendingAgents) {
      logger.info(JSON.stringify({
        microserviceUuid,
        count: agents.size,
        execIds: Array.from(agents.keys())
      }))
    }
    logger.info('--------------------------------------')
  }

  assignAgentToSession (execId, agentWs) {
    const session = this.getSession(execId)
    if (session) {
      session.agent = agentWs
      session.lastActivity = Date.now()
    }
  }

  assignUserToSession (execId, userWs) {
    const session = this.getSession(execId)
    if (session) {
      session.user = userWs
      session.lastActivity = Date.now()
    }
  }

  addConnection (sessionId, ws) {
    try {
      const session = this.getSession(sessionId)
      session.connections.add(ws)
      session.lastActivity = Date.now()
      logger.info('Connection added to session' + JSON.stringify({
        sessionId,
        connectionCount: session.connections.size
      }))
    } catch (error) {
      logger.error('Failed to add connection:' + error)
      throw error
    }
  }

  removeConnection (sessionId, ws) {
    try {
      const session = this.getSession(sessionId)
      session.connections.delete(ws)
      if (session.connections.size === 0) {
        session.lastActivity = Date.now()
        logger.info('Last connection removed from session' + JSON.stringify({ sessionId }))
      } else {
        logger.debug('Connection removed from session' + JSON.stringify({
          sessionId,
          remainingConnections: session.connections.size
        }))
      }
    } catch (error) {
      logger.error('Failed to remove connection:' + error)
      throw error
    }
  }

  handleReconnection (sessionId, ws) {
    try {
      const session = this.getSession(sessionId)
      if (session.reconnectAttempts < this.config.maxReconnectAttempts) {
        session.reconnectAttempts++
        this.addConnection(sessionId, ws)
        logger.info('Reconnection successful' + JSON.stringify({
          sessionId,
          attempt: session.reconnectAttempts
        }))
        return true
      } else {
        const error = new Errors.ValidationError('Max reconnection attempts reached')
        logger.warn('Max reconnection attempts reached' + JSON.stringify({
          sessionId,
          maxAttempts: this.config.maxReconnectAttempts,
          error: error.message
        }))
        throw error
      }
    } catch (error) {
      logger.error('Reconnection failed:' + error)
      throw error
    }
  }

  startCleanup () {
    if (this.cleanupInterval) {
      logger.debug('Cleanup interval already running')
      return
    }
    logger.info('Starting session cleanup service with interval: ' + this.config.session.cleanupInterval + 'ms')
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let cleanedCount = 0
      logger.debug('Running session cleanup cycle')
      for (const [sessionId, session] of this.sessions) {
        if (now - session.lastActivity > this.config.session.timeout) {
          this.cleanupSession(sessionId)
          cleanedCount++
        }
      }
      if (cleanedCount > 0) {
        logger.info('Session cleanup completed' + JSON.stringify({ cleanedCount }))
      }
      // Log session state after cleanup
      this.logSessionState()
    }, this.config.session.cleanupInterval)
  }

  cleanupSession (sessionId) {
    try {
      const session = this.getSession(sessionId)
      logger.info('Cleaning up session' + JSON.stringify({
        sessionId,
        type: session.type,
        connectionCount: session.connections.size
      }))
      for (const ws of session.connections) {
        ws.close(1000, 'Session timeout')
      }
      this.sessions.delete(sessionId)
      logger.debug('Session cleanup completed' + JSON.stringify({ sessionId }))
    } catch (error) {
      logger.error('Failed to cleanup session:' + error)
      throw error
    }
  }

  stopCleanup () {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      logger.info('Session cleanup service stopped')
    }
  }

  getActiveConnections (sessionId) {
    try {
      const session = this.getSession(sessionId)
      const count = session.connections.size
      logger.debug('Getting active connections' + JSON.stringify({ sessionId, count }))
      return count
    } catch (error) {
      logger.error('Failed to get active connections:' + error)
      throw error
    }
  }

  broadcastToSession (sessionId, message) {
    try {
      const session = this.getSession(sessionId)
      const messageStr = JSON.stringify(message)
      let sentCount = 0
      for (const ws of session.connections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr)
          sentCount++
        }
      }
      logger.debug('Broadcast message to session' + JSON.stringify({
        sessionId,
        recipients: sentCount,
        totalConnections: session.connections.size
      }))
    } catch (error) {
      logger.error('Failed to broadcast message:' + error)
      throw error
    }
  }

  bufferMessage (sessionId, message) {
    try {
      const session = this.getSession(sessionId)
      session.buffer.push(message)
      if (session.buffer.length > this.config.maxBufferSize) {
        session.buffer.shift() // Remove oldest message
        logger.debug('Buffer size limit reached, removed oldest message' + JSON.stringify({
          sessionId,
          bufferSize: session.buffer.length
        }))
      }
    } catch (error) {
      logger.error('Failed to buffer message:' + error)
      throw error
    }
  }

  getBufferedMessages (sessionId) {
    try {
      const session = this.getSession(sessionId)
      const messages = session.buffer
      logger.debug('Retrieved buffered messages' + JSON.stringify({
        sessionId,
        messageCount: messages.length
      }))
      return messages
    } catch (error) {
      logger.error('Failed to get buffered messages:' + error)
      throw error
    }
  }

  clearBuffer (sessionId) {
    try {
      const session = this.getSession(sessionId)
      const count = session.buffer.length
      session.buffer = []
      logger.info('Cleared message buffer' + JSON.stringify({ sessionId, clearedCount: count }))
    } catch (error) {
      logger.error('Failed to clear buffer:' + error)
      throw error
    }
  }

  getPendingAgentExecIds (microserviceUuid) {
    if (this.pendingAgents.has(microserviceUuid)) {
      const agents = this.pendingAgents.get(microserviceUuid)
      return Array.from(agents.keys())
    }
    return []
  }

  isUserStillPending (microserviceUuid, userWs) {
    if (this.pendingUsers.has(microserviceUuid)) {
      const users = this.pendingUsers.get(microserviceUuid)
      return users.has(userWs)
    }
    return false
  }

  setUserRetryTimer (microserviceUuid, userWs, timer) {
    if (!this.userRetryTimers.has(microserviceUuid)) {
      this.userRetryTimers.set(microserviceUuid, new Map())
    }
    const timers = this.userRetryTimers.get(microserviceUuid)
    timers.set(userWs, timer)
  }

  getUserRetryTimer (microserviceUuid, userWs) {
    if (this.userRetryTimers.has(microserviceUuid)) {
      const timers = this.userRetryTimers.get(microserviceUuid)
      return timers.get(userWs)
    }
    return null
  }

  clearUserRetryTimer (microserviceUuid, userWs) {
    if (this.userRetryTimers.has(microserviceUuid)) {
      const timers = this.userRetryTimers.get(microserviceUuid)
      timers.delete(userWs)
      if (timers.size === 0) {
        this.userRetryTimers.delete(microserviceUuid)
      }
    }
  }
}

module.exports = SessionManager
