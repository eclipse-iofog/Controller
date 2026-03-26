const logger = require('../logger')

class WebSocketError extends Error {
  constructor (code, message) {
    super(message)
    this.code = code
    this.name = 'WebSocketError'
  }
}

class WebSocketErrorHandler {
  static handleError (ws, error) {
    logger.error('WebSocket error:' + JSON.stringify({ error }))

    if (error instanceof WebSocketError) {
      ws.send(JSON.stringify({
        type: 'error',
        code: error.code,
        message: error.message
      }))
      ws.close(error.code, error.message)
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        code: 1011,
        message: 'Internal server error'
      }))
      ws.close(1011, 'Internal server error')
    }
  }

  static createError (code, message) {
    return new WebSocketError(code, message)
  }

  static getErrorCode (error) {
    if (error instanceof WebSocketError) {
      return error.code
    }
    return 1011 // Internal server error
  }

  static getErrorMessage (error) {
    if (error instanceof WebSocketError) {
      return error.message
    }
    return 'Internal server error'
  }
}

module.exports = {
  WebSocketError,
  WebSocketErrorHandler
}
