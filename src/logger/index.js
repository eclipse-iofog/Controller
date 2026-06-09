/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const pino = require('pino')
const path = require('path')
const fs = require('fs')
const config = require('../config')
const serializer = require('pino-std-serializers')
const zlib = require('zlib')

// Get log directory and settings from environment or config
const dirName = process.env.LOG_DIRECTORY || config.get('log.directory')

const maxFileSize = process.env.LOG_FILE_SIZE ? parseInt(process.env.LOG_FILE_SIZE) * 1024 * 1024 * 1024 : config.get('log.fileSize')

const maxFiles = process.env.LOG_FILE_COUNT ? parseInt(process.env.LOG_FILE_COUNT) : config.get('log.fileCount')

// Validate required values
if (!dirName) {
  throw new Error('Log directory is not configured. Please set LOG_DIRECTORY environment variable or log.directory in config.')
}
if (!maxFileSize) {
  throw new Error('Log file size is not configured. Please set LOG_FILE_SIZE environment variable or log.fileSize in config.')
}
if (!maxFiles) {
  throw new Error('Log file count is not configured. Please set LOG_FILE_COUNT environment variable or log.fileCount in config.')
}

const baseFileName = 'iofog-controller'
const logFileName = `${baseFileName}.log`

console.log('Log directory:', dirName)
console.log('Max file size:', maxFileSize)
console.log('Max files:', maxFiles)

// Default log level from environment variable, fallback to config, then 'info' if not set
let defaultLogLevel = process.env.LOG_LEVEL || config.get('log.level') || 'info'

// Validate log level
const validLogLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silly']
if (!validLogLevels.includes(defaultLogLevel)) {
  console.error(`Invalid LOG_LEVEL: ${defaultLogLevel}. Using default level: info`)
  defaultLogLevel = 'info'
}

const levels = {
  error: 100,
  warn: 90,
  cliReq: 80,
  cliRes: 70,
  apiReq: 60,
  apiRes: 50,
  service: 45,
  db: 40,
  info: 40,
  verbose: 30,
  debug: 20,
  silly: 10
}

const defaultFormat = {
  level: defaultLogLevel,
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  customLevels: levels,
  useOnlyCustomLevels: true,
  redact: {
    paths: ['headers.authorization', 'token', 'password', 'apiKey', 'secret', 'privateKey'],
    censor: '[REDACTED]'
  },
  formatters: {
    level: (label) => {
      return { level: label }
    },
    log: (log) => {
      if (!log.req && !log.res) {
        return log
      }

      let result = {}

      if (log.req) {
        // Create base request info
        result = Object.assign(
          result,
          serializer.req(log.req),
          {
            params: log.req.params,
            query: log.req.query,
            body: log.req.body,
            username: log.req.kauth && log.req.kauth.grant && log.req.kauth.grant.access_token && log.req.kauth.grant.access_token.content && log.req.kauth.grant.access_token.content.preferred_username
          }
        )
        // Filter request headers
        if (result.headers) {
          const allowedHeaders = ['content-type', 'content-length', 'user-agent']
          const filteredHeaders = {}
          for (const header of allowedHeaders) {
            if (result.headers[header]) {
              filteredHeaders[header] = result.headers[header]
            }
          }
          result.headers = filteredHeaders
        }
      }

      if (log.res) {
        // Get serialized response
        const serializedRes = serializer.res(log.res)
        // Find status code
        let statusCode = null
        if (log.statusCode !== undefined) {
          statusCode = log.statusCode
        } else if (log.res.statusCode !== undefined) {
          statusCode = log.res.statusCode
        } else if (serializedRes.statusCode !== undefined) {
          statusCode = serializedRes.statusCode
        }
        // Filter response headers
        if (serializedRes.headers) {
          const allowedHeaders = ['content-type', 'content-length', 'x-timestamp', 'etag']
          const filteredHeaders = {}
          for (const header of allowedHeaders) {
            if (serializedRes.headers[header]) {
              filteredHeaders[header] = serializedRes.headers[header]
            }
          }
          serializedRes.headers = filteredHeaders
        }
        // Add filtered response to result
        result = Object.assign(result, serializedRes, { statusCode })
        // Remove body for privacy
        delete result.body
      }

      return result
    }
  }
}

let fileLogger = null
let consoleLogger = null

async function compressFile (sourcePath, targetPath) {
  return new Promise((resolve, reject) => {
    const gzip = zlib.createGzip()
    const input = fs.createReadStream(sourcePath)
    const output = fs.createWriteStream(targetPath)

    input.pipe(gzip).pipe(output)

    output.on('finish', () => {
      fs.unlink(sourcePath, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    output.on('error', reject)
  })
}

async function rotateLogFile (isStartup = false) {
  try {
    const logFile = path.join(dirName, logFileName)

    // On startup, rotate if file exists and has content
    // During runtime, rotate if size limit is reached
    const shouldRotate = isStartup
      ? (fs.existsSync(logFile) && fs.statSync(logFile).size > 0)
      : (fs.existsSync(logFile) && fs.statSync(logFile).size >= maxFileSize)

    if (shouldRotate) {
      console.log(isStartup ? 'Rotating log file on startup...' : 'Log file size exceeded, rotating...')

      // Find the next available compressed file number
      let nextFileNumber = 1
      while (fs.existsSync(path.join(dirName, `${baseFileName}${nextFileNumber}.log.gz`))) {
        nextFileNumber++
      }

      // If we've reached max files, remove the oldest compressed file
      if (nextFileNumber > maxFiles) {
        const oldestFile = path.join(dirName, `${baseFileName}1.log.gz`)
        if (fs.existsSync(oldestFile)) {
          console.log('Removing oldest compressed log file:', oldestFile)
          await fs.promises.unlink(oldestFile)
        }
        nextFileNumber = maxFiles
      }

      // Compress the current log file to the numbered target
      const compressedFile = path.join(dirName, `${baseFileName}${nextFileNumber}.log.gz`)
      console.log(`Compressing current log file to: ${compressedFile}`)
      await compressFile(logFile, compressedFile)

      // Create new empty log file
      await fs.promises.writeFile(logFile, '')
      console.log('Log rotation completed')
    }
  } catch (err) {
    console.error('Error during log rotation:', err)
  }
}

function getLogger () {
  if (!fileLogger) {
    try {
      // Create the log directory if it does not exist
      if (!fs.existsSync(dirName)) {
        console.log('Creating log directory:', dirName)
        fs.mkdirSync(dirName, { recursive: true })
      }

      const logFile = path.join(dirName, logFileName)
      console.log('Log file path:', logFile)

      // Perform initial rotation if needed
      rotateLogFile(true).catch(err => {
        console.error('Error during initial rotation:', err)
      })

      const logDestination = pino.destination({
        dest: logFile,
        sync: true,
        mkdir: true
      })

      // Check rotation before each write
      const originalWrite = logDestination.write
      logDestination.write = function (chunk) {
        rotateLogFile(false).catch(err => {
          console.error('Error during rotation check:', err)
        })
        return originalWrite.call(this, chunk)
      }

      fileLogger = pino(
        {
          ...defaultFormat,
          level: defaultLogLevel
        },
        logDestination
      )

      // Test write to ensure file is writable
      fileLogger.info('Logger initialized successfully')
      console.log('File logger initialized and tested')
    } catch (err) {
      console.error('Error initializing file logger:', err)
      return getConsoleLogger()
    }
  }
  return fileLogger
}

function getConsoleLogger () {
  if (!consoleLogger) {
    consoleLogger = pino({
      ...defaultFormat,
      level: defaultLogLevel
    })
  }
  return consoleLogger
}

// Initialize file logger immediately
getLogger()

module.exports = {
  getLogger,
  getConsoleLogger
}

for (const level of Object.keys(levels)) {
  module.exports[level] = (...log) => {
    if (level === 'cliRes') {
      return console.log(log[0])
    }

    if (level === 'cliReq') {
      return
    }

    if (log[0] instanceof Error) {
      log = serializer.err(...log)
    }
    if (level === 'apiRes' && log[0] && typeof log[0] === 'object') {
      log[0] = sanitizeApiResLogPayload(log[0])
    }
    getConsoleLogger()[level](...log)
    if (fileLogger !== null) {
      getLogger()[level](...log)
    }
  }
}

function sanitizeApiResLogPayload (payload) {
  // Keep original req/res objects intact so pino serializers can process them.
  // Redact only the remaining fields with cycle-aware traversal.
  const sanitized = {}
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'req' || key === 'res') {
      sanitized[key] = value
      continue
    }
    sanitized[key] = redactSensitiveKeys(value)
  }
  return sanitized
}

function redactSensitiveKeys (value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value !== 'object') {
    return value
  }

  if (Buffer.isBuffer(value) || value instanceof Date || value instanceof RegExp) {
    return value
  }

  if (seen.has(value)) {
    return '[Circular]'
  }

  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveKeys(item, seen))
  }

  const redacted = {}
  for (const [key, item] of Object.entries(value)) {
    const loweredKey = key.toLowerCase()
    if (loweredKey === 'jwt' || loweredKey === 'creds' || loweredKey.includes('seed') || loweredKey.includes('secret')) {
      redacted[key] = '[REDACTED]'
      continue
    }
    redacted[key] = redactSensitiveKeys(item, seen)
  }
  return redacted
}
