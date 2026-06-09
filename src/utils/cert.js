const forge = require('node-forge')
const k8sClient = require('./k8s-client')
const BigNumber = require('bignumber.js')

// Types for CA input
const CA_TYPES = {
  K8S_SECRET: 'k8s-secret',
  DIRECT: 'direct',
  SELF_SIGNED: 'self-signed'
}

/**
 * Certificate Authority class
 * Holds certificate, private key, and certificate data
 */
class CertificateAuthority {
  constructor (certificate, key, crtData) {
    this.certificate = certificate
    this.key = key
    this.crtData = crtData
  }

  // Get certificate in PEM format
  get certPem () {
    return this.certificate
  }
}

/**
 * CA Storage Format
 * @typedef {Object} CAStorage
 * @property {string} cert - PEM encoded certificate
 * @property {string} key - PEM encoded private key
 */

/**
 * Validates a CA certificate and key pair
 * @param {string} cert - PEM encoded certificate
 * @param {string} key - PEM encoded private key
 * @returns {boolean} - True if valid
 * @throws {Error} - If validation fails
 */
async function validateCA (cert, key) {
  try {
    // Convert PEM to forge objects
    const forgeCert = forge.pki.certificateFromPem(cert)
    const forgeKey = forge.pki.privateKeyFromPem(key)

    // Extract public key from the certificate
    const certPublicKey = forgeCert.publicKey

    // Create a message to test the keys
    const md = forge.md.sha256.create()
    md.update('test', 'utf8')

    // Sign with private key
    const signature = forge.util.encode64(
      forgeKey.sign(md)
    )

    // Verify with the certificate's public key
    const verified = certPublicKey.verify(
      md.digest().getBytes(),
      forge.util.decode64(signature)
    )

    if (!verified) {
      throw new Error('Private key does not match certificate')
    }

    return true
  } catch (error) {
    throw new Error(`CA validation failed: ${error.message}`)
  }
}

/**
 * Stores CA certificate and key to internal secret storage
 * @param {CAStorage} ca - CA data to store
 * @param {string} name - Name of the secret
 * @returns {Promise<void>}
 */
async function storeCA (ca, name) {
  try {
    // Ensure data is in base64 format for TLS secrets
    const secretData = {
      'tls.crt': Buffer.from(ca.cert).toString('base64'),
      'tls.key': Buffer.from(ca.key).toString('base64'),
      'ca.crt': Buffer.from(ca.cert).toString('base64')
    }

    const secret = {
      name: name,
      type: 'tls',
      data: secretData
    }

    // Use the secret service to store the CA
    const SecretService = require('../services/secret-service')
    await SecretService.createSecretEndpoint(secret)
  } catch (error) {
    throw new Error(`Failed to store CA: ${error.message}`)
  }
}

/**
 * Loads CA certificate and key from internal secret storage
 * @param {string} name - Name of the secret
 * @returns {Promise<CAStorage>}
 */
async function loadCA (name) {
  try {
    // Use SecretManager to get the secret with decryption handling
    const SecretManager = require('../data/managers/secret-manager')
    const fakeTransaction = { fakeTransaction: true }

    const secret = await SecretManager.getSecret(name, fakeTransaction)
    if (!secret) {
      throw new Error(`TLS secret with name ${name} not found`)
    }

    if (secret.type !== 'tls') {
      throw new Error(`Secret ${name} is not a TLS secret`)
    }

    if (!secret.data || !secret.data['tls.crt'] || !secret.data['tls.key']) {
      throw new Error(`Invalid TLS secret data for ${name}`)
    }

    // Convert base64 data back to PEM format
    return {
      cert: Buffer.from(secret.data['tls.crt'], 'base64').toString(),
      key: Buffer.from(secret.data['tls.key'], 'base64').toString()
    }
  } catch (error) {
    throw new Error(`Failed to load CA: ${error.message}`)
  }
}

/**
 * Generates a random serial number between 0 and 2^128-1
 * Ensures the serial number is always positive by making sure the first byte < 0x80
 * @returns {string} - Serial number as a decimal string
 */
function generateSerialNumber () {
  // Create a random 16-byte buffer
  let randomBytes = forge.random.getBytesSync(16)
  // Ensure first byte is < 0x80 to prevent negative serial numbers in ASN.1 encoding
  // In ASN.1, INTEGER is signed, so if MSB of first byte is set (>= 0x80), it's negative
  let firstByte = randomBytes.charCodeAt(0)
  // Regenerate first byte if it's >= 0x80 to ensure positive serial number
  while (firstByte >= 0x80) {
    firstByte = forge.random.getBytesSync(1).charCodeAt(0)
  }
  randomBytes = String.fromCharCode(firstByte) + randomBytes.substring(1)
  // Convert to BigNumber
  const serialNumber = new BigNumber('0x' + forge.util.bytesToHex(randomBytes))
  return serialNumber.toString()
}

/**
 * Generates a self-signed CA certificate
 * @param {string} subject - CA subject name
 * @param {number} expiration - Expiration time in milliseconds
 * @returns {Promise<CAStorage>}
 */
async function generateSelfSignedCA (subject, expiration = 5 * 365 * 24 * 60 * 60 * 1000) {
  try {
    // Generate RSA key pair
    const keys = forge.pki.rsa.generateKeyPair(2048)

    // Create a certificate
    const cert = forge.pki.createCertificate()

    // Set certificate fields
    cert.publicKey = keys.publicKey
    cert.serialNumber = generateSerialNumber()

    // Set validity period
    const now = new Date()
    cert.validity.notBefore = now
    cert.validity.notAfter = new Date(now.getTime() + expiration)

    // Parse the subject string (format: /CN=Subject Name)
    const subjectAttrs = []
    const issuerAttrs = []

    // Extract CN from subject string
    let commonName = subject
    if (subject.startsWith('/CN=')) {
      commonName = subject.substring(4)
    }

    subjectAttrs.push({ name: 'commonName', value: commonName })
    issuerAttrs.push({ name: 'commonName', value: commonName })

    cert.setSubject(subjectAttrs)
    cert.setIssuer(issuerAttrs) // Self-signed, so issuer = subject

    // Add extensions for a CA certificate
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
        critical: true
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        cRLSign: true,
        critical: true
      },
      {
        name: 'subjectKeyIdentifier'
      }
    ])

    // Self-sign the certificate with SHA-256
    cert.sign(keys.privateKey, forge.md.sha256.create())

    // Convert to PEM
    const certPem = forge.pki.certificateToPem(cert)
    const keyPem = forge.pki.privateKeyToPem(keys.privateKey)

    return {
      cert: certPem,
      key: keyPem
    }
  } catch (error) {
    throw new Error(`Failed to generate certificate: ${error.message}`)
  }
}

// CA handling functions
async function getCAFromK8sSecret (secretName) {
  try {
    // Check that k8sClient is properly required and available
    if (!k8sClient) {
      throw new Error('Kubernetes client not available')
    }
    const secret = await k8sClient.getSecret(secretName)
    if (!secret) {
      return null
    }
    if (!secret.data) {
      return null
    }
    if (!secret.data['tls.crt'] || !secret.data['tls.key']) {
      return null
    }

    const cert = Buffer.from(secret.data['tls.crt'], 'base64').toString()
    const key = Buffer.from(secret.data['tls.key'], 'base64').toString()

    // Check if we need to register this CA in our local database
    try {
      // Use SecretManager to check if there's a local secret
      const SecretManager = require('../data/managers/secret-manager')
      const localSecret = await SecretManager.findOne({ name: secretName }, { fakeTransaction: true })

      // If no local secret, we need to create one
      if (!localSecret) {
        // Store the CA in local secret storage
        await storeCA({ cert, key }, secretName)
        // Also create a certificate record
        const CertificateManager = require('../data/managers/certificate-manager')
        const forge = require('node-forge')
        const forgeCert = forge.pki.certificateFromPem(cert)
        // Extract subject
        const subject = forgeCert.subject.getField('CN') ? forgeCert.subject.getField('CN').value : secretName

        // Create CA record
        await CertificateManager.createCertificateRecord({
          name: secretName,
          subject: subject,
          isCA: true,
          validFrom: forgeCert.validity.notBefore,
          validTo: forgeCert.validity.notAfter,
          serialNumber: forgeCert.serialNumber
        }, { fakeTransaction: true })
      }
    } catch (dbError) {
      // Continue anyway - we at least have the cert/key
    }

    return new CertificateAuthority(
      cert,
      key,
      cert
    )
  } catch (error) {
    throw new Error(`Failed to get CA from Kubernetes secret: ${error.message}`)
  }
}

async function getCAFromDirect (ca) {
  if (!ca.cert || !ca.key) {
    throw new Error('CA must provide both certificate and private key in PEM format')
  }

  try {
    // Validate the CA
    await validateCA(ca.cert, ca.key)

    return new CertificateAuthority(ca.cert, ca.key, ca.cert)
  } catch (error) {
    throw new Error(`failed to get CA from direct input: ${error.message}`)
  }
}

async function getCAFromInput (ca) {
  if (!ca) {
    return null
  }

  // Normalize CA type to lowercase for case-insensitive matching
  const caType = ca.type ? ca.type.toLowerCase() : ''

  switch (caType) {
    case CA_TYPES.K8S_SECRET.toLowerCase():
      return getCAFromK8sSecret(ca.secretName)
    case CA_TYPES.DIRECT.toLowerCase():
      if (ca.secretName) {
        // If secretName is provided, load from internal secret storage
        const caData = await loadCA(ca.secretName)
        return getCAFromDirect(caData)
      }
      return getCAFromDirect(ca)
    case CA_TYPES.SELF_SIGNED.toLowerCase():
      return null
    default:
      throw new Error(`unknown CA type: ${caType}. Expected one of: ${Object.values(CA_TYPES).join(', ')}`)
  }
}

/**
 * Main certificate generation function
 * @param {Object} params - Certificate parameters
 * @returns {Promise<Object>} - Certificate data
 */
async function generateCertificate ({
  name,
  subject,
  hosts,
  expiration = 5 * 365 * 24 * 60 * 60 * 1000,
  ca,
  isRenewal = false
}) {
  try {
    const caCert = await getCAFromInput(ca)

    // Generate RSA key pair
    const keys = forge.pki.rsa.generateKeyPair(2048)

    // Create a certificate
    const cert = forge.pki.createCertificate()

    // Set certificate fields
    cert.publicKey = keys.publicKey
    cert.serialNumber = generateSerialNumber()

    // Set validity period
    const now = new Date()
    cert.validity.notBefore = now
    cert.validity.notAfter = new Date(now.getTime() + expiration)

    // Parse the subject string (format: /CN=Subject Name)
    const subjectAttrs = []

    // Extract CN from subject string
    let commonName = subject
    if (subject.startsWith('/CN=')) {
      commonName = subject.substring(4)
    }

    subjectAttrs.push({ name: 'commonName', value: commonName })
    cert.setSubject(subjectAttrs)

    // Process hosts for Subject Alternative Names
    const hostsList = hosts ? hosts.split(',').map(h => h.trim()) : []
    const altNames = []

    for (const host of hostsList) {
      if (host.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
        // IP address
        altNames.push({ type: 7, ip: host })
        altNames.push({ type: 2, value: host })
      } else {
        // DNS name
        altNames.push({ type: 2, value: host })
      }
    }

    // Set up the certificate based on whether we have a CA or not
    if (caCert) {
      // If we have a CA, use it to sign the certificate
      const caForgeCert = forge.pki.certificateFromPem(caCert.certPem || caCert.crtData)
      const caForgeKey = forge.pki.privateKeyFromPem(caCert.key)

      // Set the issuer from the CA
      cert.setIssuer(caForgeCert.subject.attributes)

      // Add extensions for a server certificate
      cert.setExtensions([
        {
          name: 'basicConstraints',
          cA: false,
          critical: true
        },
        {
          name: 'keyUsage',
          digitalSignature: true,
          keyEncipherment: true,
          critical: true
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true
        },
        {
          name: 'subjectAltName',
          altNames: altNames
        },
        {
          name: 'authorityKeyIdentifier',
          authorityCertIssuer: true,
          serialNumber: caForgeCert.serialNumber
        }
      ])

      // Sign the certificate with the CA's private key
      cert.sign(caForgeKey, forge.md.sha256.create())
    } else {
      // Self-signed certificate
      cert.setIssuer(subjectAttrs)

      // Add extensions for a self-signed server certificate
      cert.setExtensions([
        {
          name: 'basicConstraints',
          cA: false,
          critical: true
        },
        {
          name: 'keyUsage',
          digitalSignature: true,
          keyEncipherment: true,
          critical: true
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true
        },
        {
          name: 'subjectAltName',
          altNames: altNames
        },
        {
          name: 'subjectKeyIdentifier'
        }
      ])

      // Self-sign the certificate
      cert.sign(keys.privateKey, forge.md.sha256.create())
    }

    // Convert to PEM
    const certPem = forge.pki.certificateToPem(cert)
    const keyPem = forge.pki.privateKeyToPem(keys.privateKey)

    // Store the certificate as a TLS secret
    const secretData = {
      'tls.crt': Buffer.from(certPem).toString('base64'),
      'tls.key': Buffer.from(keyPem).toString('base64'),
      'ca.crt': Buffer.from(caCert ? caCert.certPem || caCert.crtData : certPem).toString('base64')
    }

    const secret = {
      name: name,
      type: 'tls',
      data: secretData
    }

    // Use the secret service to store the certificate
    const SecretService = require('../services/secret-service')

    if (isRenewal) {
      // For renewals, delete the existing secret first
      try {
        await SecretService.deleteSecretEndpoint(name)
      } catch (error) {
        // If the secret doesn't exist, that's okay, just continue
        if (error.name !== 'NotFoundError') {
          throw error
        }
      }
    }

    // Create new secret with certificate data
    await SecretService.createSecretEndpoint(secret)

    return {
      cert: certPem,
      key: keyPem,
      ca: caCert ? caCert.crtData : certPem
    }
  } catch (error) {
    throw error
  }
}

function decodeCertificate (data) {
  try {
    const cert = forge.pki.certificateFromPem(data)
    return {
      subject: cert.subject.getField('CN').value,
      issuer: cert.issuer.getField('CN').value,
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      serialNumber: cert.serialNumber,
      extensions: cert.extensions
    }
  } catch (error) {
    throw new Error(`Failed to decode certificate: ${error.message}`)
  }
}

module.exports = {
  CA_TYPES,
  CertificateAuthority,
  generateCertificate,
  decodeCertificate,
  generateSelfSignedCA,
  storeCA,
  loadCA,
  validateCA,
  getCAFromDirect,
  getCAFromK8sSecret
}
