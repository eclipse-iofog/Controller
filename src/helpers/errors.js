class AuthenticationError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'AuthenticationError'
  }
}

class TransactionError extends Error {
  constructor () {
    const message = 'Transaction not provided'
    super(message)
    this.message = message
    this.name = 'TransactionError'
  }
}

class ValidationError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'ValidationError'
  }
}

class InvalidCredentialsError extends Error {
  constructor () {
    const message = 'Invalid credentials'
    super(message)
    this.message = message
    this.name = 'InvalidCredentialsError'
  }
}

class DuplicatePropertyError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'DuplicatePropertyError'
  }
}

class ModelNotFoundError extends Error {
  constructor () {
    const message = 'Model not found'
    super(message)
    this.message = message
    this.name = 'ModelNotFoundError'
  }
}

class NotFoundError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'NotFoundError'
  }
}

class FtpError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'FtpError'
  }
}

class InvalidArgumentError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'InvalidArgumentError'
  }
}

class InvalidArgumentTypeError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'InvalidArgumentTypeError'
  }
}

class CLIArgsNotProvidedError extends Error {
  constructor () {
    super('Empty args')
    this.message = 'Empty args'
    this.name = 'CLIArgsNotProvidedError'
  }
}

class ConflictError extends Error {
  constructor (message) {
    super(message)
    this.name = 'ConflictError'
    this.status = 409
  }
}

class ForbiddenError extends Error {
  constructor (message) {
    super(message)
    this.message = message
    this.name = 'ForbiddenError'
  }
}

class NotImplementedError extends Error {
  constructor (message = 'This endpoint is only available in embedded auth mode') {
    super(message)
    this.message = message
    this.name = 'NotImplementedError'
  }
}

class RateLimitExceededError extends Error {
  constructor (message = 'Too many authentication requests from this IP address') {
    super(message)
    this.message = message
    this.name = 'RateLimitExceededError'
  }
}

class AgentAuthenticationError extends Error {
  constructor (code, message) {
    super(message)
    this.code = code
    this.message = message
    this.name = 'AgentAuthenticationError'
    this.retryable = false
  }

  toResponseBody () {
    return {
      error: 'Unauthorized',
      code: this.code,
      message: this.message,
      retryable: this.retryable
    }
  }
}

class ServiceUnavailableError extends Error {
  constructor (code, message) {
    super(message)
    this.code = code
    this.message = message
    this.name = 'ServiceUnavailableError'
    this.retryable = true
  }

  toResponseBody () {
    return {
      error: 'ServiceUnavailable',
      code: this.code,
      message: this.message,
      retryable: this.retryable
    }
  }
}

class TransactionTimeoutError extends Error {
  constructor (label, priority, timeoutMs) {
    const message = `Database transaction timed out after ${timeoutMs}ms (${label || 'unknown'}, ${priority || 'unknown'})`
    super(message)
    this.name = 'TransactionTimeoutError'
    this.label = label || 'unknown'
    this.priority = priority || 'unknown'
    this.timeoutMs = timeoutMs
    this.retryable = true
  }
}

class QueueBackpressureError extends Error {
  constructor (message = 'SQLite write queue backpressure active') {
    super(message)
    this.name = 'QueueBackpressureError'
    this.retryable = true
  }
}

class ReadinessNotReadyError extends Error {
  constructor (code, message, basePayload) {
    super(message)
    this.code = code
    this.message = message
    this.name = 'ReadinessNotReadyError'
    this.retryable = true
    this.basePayload = basePayload
  }

  toResponseBody () {
    return {
      ...this.basePayload,
      error: 'ServiceUnavailable',
      code: this.code,
      message: this.message,
      retryable: this.retryable
    }
  }
}

module.exports = {
  AuthenticationError,
  AgentAuthenticationError,
  ServiceUnavailableError,
  TransactionTimeoutError,
  QueueBackpressureError,
  ReadinessNotReadyError,
  TransactionError,
  ValidationError,
  InvalidCredentialsError,
  NotFoundError,
  ModelNotFoundError,
  DuplicatePropertyError,
  FtpError,
  InvalidArgumentError,
  InvalidArgumentTypeError,
  CLIArgsNotProvidedError,
  ConflictError,
  ForbiddenError,
  NotImplementedError,
  RateLimitExceededError
}
