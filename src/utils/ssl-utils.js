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

const fs = require('fs')
const logger = require('../logger')

/**
 * Loads a certificate from either a file path or base64 string
 * @param {string} source - The source of the certificate (file path or base64 string)
 * @param {boolean} isBase64 - Whether the source is a base64 string
 * @returns {Buffer} The loaded certificate
 * @throws {Error} If there's an error loading the certificate
 */
function loadCertificate (source, isBase64 = false) {
  try {
    if (!source) {
      throw new Error('Certificate source is empty')
    }

    if (isBase64) {
      return Buffer.from(source, 'base64')
    }
    return fs.readFileSync(source)
  } catch (e) {
    logger.error(`Error loading certificate: ${e.message}`)
    throw e
  }
}

/**
 * Creates SSL options from either file paths or base64 strings
 * @param {Object} options - SSL configuration options
 * @param {string} options.key - SSL key file path or base64 string
 * @param {string} options.cert - SSL certificate file path or base64 string
 * @param {string} [options.intermedKey] - Intermediate certificate file path or base64 string
 * @param {boolean} [options.isBase64=false] - Whether the inputs are base64 strings
 * @returns {Object} SSL options for HTTPS server
 */
function createSSLOptions ({ key, cert, intermedKey, isBase64 = false }) {
  if (!key || !cert) {
    throw new Error('SSL key and certificate are required')
  }

  const sslOptions = {
    key: loadCertificate(key, isBase64),
    cert: loadCertificate(cert, isBase64),
    requestCert: true,
    rejectUnauthorized: false
  }

  // Only add CA if intermediate certificate is provided and exists
  if (intermedKey) {
    try {
      // Check if file exists when not using base64
      if (!isBase64 && !fs.existsSync(intermedKey)) {
        logger.warn(`Intermediate certificate file not found at path: ${intermedKey}, continuing without it`)
        return sslOptions
      }
      sslOptions.ca = loadCertificate(intermedKey, isBase64)
    } catch (e) {
      logger.warn('Intermediate certificate could not be loaded, continuing without it')
    }
  }

  return sslOptions
}

module.exports = {
  loadCertificate,
  createSSLOptions
}
