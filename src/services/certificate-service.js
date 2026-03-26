const TransactionDecorator = require('../decorators/transaction-decorator')
const SecretService = require('./secret-service')
const CertificateManager = require('../data/managers/certificate-manager')
const SecretManager = require('../data/managers/secret-manager')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const AppHelper = require('../helpers/app-helper')
const Validator = require('../schemas/index')
const { generateSelfSignedCA, storeCA, generateCertificate } = require('../utils/cert')
const config = require('../config')
const forge = require('node-forge')

// Helper function to check Kubernetes environment
function checkKubernetesEnvironment () {
  const controlPlane = process.env.CONTROL_PLANE || config.get('app.ControlPlane')
  const isKubernetes = controlPlane && controlPlane.toLowerCase() === 'kubernetes'
  if (!isKubernetes) {
    throw new Errors.ValidationError(ErrorMessages.NOT_KUBERNETES_ENV)
  }
}

// Helper function to validate CA type
function validateCertType (type) {
  if (type === 'k8s-secret') {
    checkKubernetesEnvironment()
  } else if (type !== 'self-signed' && type !== 'direct') {
    throw new Errors.ValidationError(`Invalid CA type: ${type}. Must be one of: self-signed, direct, k8s-secret`)
  }
}

// Parse PEM certificate to extract metadata
function parseCertificate (certPem) {
  try {
    const cert = forge.pki.certificateFromPem(certPem)
    return {
      subject: cert.subject.getField('CN') ? cert.subject.getField('CN').value : '',
      issuer: cert.issuer.getField('CN') ? cert.issuer.getField('CN').value : '',
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      serialNumber: cert.serialNumber
    }
  } catch (error) {
    throw new Errors.ValidationError(`Invalid certificate: ${error.message}`)
  }
}

// Helper function to convert months to milliseconds
function monthsToMilliseconds (months) {
  // Average month length in milliseconds (30.44 days per month)
  const avgMonthInMs = 30.44 * 24 * 60 * 60 * 1000
  return months * avgMonthInMs
}

// Helper function to handle expiration input
function processExpiration (expiration) {
  // If expiration is less than 1000, assume it's in months
  // This threshold is chosen because no realistic certificate would expire in less than 1 second
  if (expiration && expiration < 1000) {
    return monthsToMilliseconds(expiration)
  }
  // Otherwise, use as-is (assuming milliseconds)
  return expiration
}

async function createCAEndpoint (caData, transaction) {
  // Validate input data
  const validation = await Validator.validate(caData, Validator.schemas.caCreate)
  if (!validation.valid) {
    throw new Errors.ValidationError(validation.error)
  }

  // Only process expiration if present (for self-signed)
  if (caData.expiration) {
    caData.expiration = processExpiration(caData.expiration)
  }
  // Validate CA type based on environment
  validateCertType(caData.type)

  try {
    const secretName = caData.type === 'self-signed' ? caData.name : caData.secretName
    const existingSecret = await SecretService.getSecretEndpoint(secretName)
    if (caData.type === 'self-signed') {
      if (existingSecret) {
        throw new Errors.ConflictError(`CA with name ${secretName} already exists`)
      }
    } else {
      if (!existingSecret) {
        throw new Errors.NotFoundError(`Secret with name ${secretName} does not exist. You must create the secret first.`)
      }
      // For direct/k8s-secret, check if CA record already exists
      const existingCA = await CertificateManager.findCertificateByName(secretName, transaction)
      if (existingCA && existingCA.isCA) {
        throw new Errors.ConflictError(`CA with name ${secretName} already exists`)
      }
    }
  } catch (error) {
    // Only proceed if the error is NotFoundError
    if (!(error instanceof Errors.NotFoundError)) {
      throw error
    }
    // For self-signed, NotFoundError is fine (secret doesn't exist yet)
    // For direct/k8s-secret, NotFoundError is handled above
  }

  let ca
  let certDetails

  if (caData.type === 'self-signed') {
    ca = await generateSelfSignedCA(caData.subject, caData.expiration)
    await storeCA(ca, caData.name)
    certDetails = parseCertificate(ca.cert)
  } else if (caData.type === 'k8s-secret') {
    // Import CA from Kubernetes secret
    ca = await require('../utils/cert').getCAFromK8sSecret(caData.secretName)
    certDetails = parseCertificate(ca.certificate)
    // Store the CA locally with the same name as the secret
    const checkedSecret = await SecretManager.findOne({ name: caData.secretName || caData.name }, transaction)
    if (!checkedSecret) {
      await storeCA({ cert: ca.certificate, key: ca.key }, caData.secretName)
    }
  } else if (caData.type === 'direct') {
    // Load from internal secret
    const caObj = await require('../utils/cert').loadCA(caData.secretName)
    ca = await require('../utils/cert').getCAFromDirect(caObj)
    certDetails = parseCertificate(ca.certificate)
  } else {
    throw new Errors.ValidationError('Unsupported CA type')
  }

  // Get the secret that was just created or referenced
  const secret = await SecretManager.findOne({ name: caData.secretName || caData.name }, transaction)

  if (caData.type !== 'k8s-secret') {
    // Create certificate record in database
    await CertificateManager.createCertificateRecord({
      name: caData.secretName || caData.name, // Use secretName if available, otherwise use provided name
      subject: certDetails.subject,
      isCA: true,
      validFrom: certDetails.validFrom,
      validTo: certDetails.validTo,
      serialNumber: certDetails.serialNumber,
      secretId: secret ? secret.id : null
    }, transaction)
  }

  return {
    name: caData.secretName || caData.name, // Use secretName if available, otherwise use provided name
    subject: certDetails.subject,
    type: caData.type,
    valid_from: certDetails.validFrom,
    valid_to: certDetails.validTo
  }
}

async function getCAEndpoint (name, transaction) {
  const certRecord = await CertificateManager.findCertificateByName(name, transaction)

  if (!certRecord || !certRecord.isCA) {
    throw new Errors.NotFoundError(`CA with name ${name} not found`)
  }

  // Get the actual cert data from the secret
  const secret = await SecretService.getSecretEndpoint(name)

  if (!secret || secret.type !== 'tls') {
    throw new Errors.NotFoundError(`CA with name ${name} not found`)
  }

  // Normalize line endings in the certificate and private key
  const certificate = normalizeLineEndings(Buffer.from(secret.data['tls.crt'], 'base64').toString())
  const privateKey = normalizeLineEndings(Buffer.from(secret.data['tls.key'], 'base64').toString())

  return {
    name: certRecord.name,
    subject: certRecord.subject,
    isCA: certRecord.isCA,
    validFrom: certRecord.validFrom,
    validTo: certRecord.validTo,
    serialNumber: certRecord.serialNumber,
    data: {
      certificate,
      privateKey: privateKey
    }
  }
}

async function listCAEndpoint (transaction) {
  const caRecords = await CertificateManager.findAllCAs(transaction)

  return {
    cas: caRecords.map(ca => ({
      name: ca.name,
      subject: ca.subject,
      valid_from: ca.validFrom,
      valid_to: ca.validTo,
      days_remaining: ca.getDaysUntilExpiration(),
      is_expired: ca.isExpired()
    }))
  }
}

async function deleteCAEndpoint (name, transaction) {
  const caRecord = await CertificateManager.findCertificateByName(name, transaction)

  if (!caRecord || !caRecord.isCA) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CA_NOT_FOUND, name))
  }

  // Check if this CA has signed certificates
  const signedCerts = await CertificateManager.findCertificatesByCA(caRecord.id, transaction)

  if (signedCerts.length > 0) {
    throw new Errors.ValidationError(`Cannot delete CA that has signed certificates. Please delete the following certificates first: ${signedCerts.map(cert => cert.name).join(', ')}`)
  }

  // Delete certificate record and the secret
  await CertificateManager.deleteCertificate(name, transaction)
  await SecretService.deleteSecretEndpoint(name, transaction)

  return {}
}

async function createCertificateEndpoint (certData, transaction) {
  // Validate input data
  const validation = await Validator.validate(certData, Validator.schemas.certificateCreate)
  if (!validation.valid) {
    throw new Errors.ValidationError(validation.error)
  }
  // Validate CA type based on environment
  validateCertType(certData.ca.type)
  // Process expiration in months if needed
  if (certData.expiration) {
    certData.expiration = processExpiration(certData.expiration)
  }

  // Check if certificate already exists
  try {
    const existingSecret = await SecretService.getSecretEndpoint(certData.name)
    if (existingSecret) {
      throw new Errors.ConflictError(`Certificate with name ${certData.name} already exists`)
    }
  } catch (error) {
    if (!(error instanceof Errors.NotFoundError)) {
      throw error
    }
  }

  // Find signing CA if one is specified
  let caRecord = null
  if (certData.ca && certData.ca.secretName) {
    // Skip CA lookup for self-signed type - it's meant to be self-signed, not signed by another CA
    if (certData.ca.type && certData.ca.type.toLowerCase() === 'self-signed') {
      // Modify the CA structure to properly indicate self-signed
      certData.ca = { type: 'self-signed' }
      // Continue with certificate generation
    } else {
      caRecord = await CertificateManager.findCertificateByName(certData.ca.secretName, transaction)
      if (!caRecord || !caRecord.isCA) {
        // Log if we're dealing with a k8s-secret type
        if (certData.ca.type === 'k8s-secret') {
          try {
            // Try to directly generate cert with k8s CA - this should invoke getCAFromInput
            await generateCertificate({
              name: certData.name,
              subject: certData.subject,
              hosts: certData.hosts,
              expiration: certData.expiration,
              ca: certData.ca
            })

            // Get certificate details from newly created secret
            const certSecret = await SecretService.getSecretEndpoint(certData.name)
            const certPem = Buffer.from(certSecret.data['tls.crt'], 'base64').toString()
            const certDetails = parseCertificate(certPem)

            // Find or create the CA record to get its ID
            let caId = null
            const caRecord = await CertificateManager.findCertificateByName(certData.ca.secretName, transaction)
            if (caRecord) {
              caId = caRecord.id
            }

            // Create certificate record in database
            await CertificateManager.createCertificateRecord({
              name: certData.name,
              subject: certDetails.subject,
              isCA: false,
              signedById: caId,
              hosts: certData.hosts,
              validFrom: certDetails.validFrom,
              validTo: certDetails.validTo,
              serialNumber: certDetails.serialNumber
            }, transaction)

            // Return response with CA name
            return {
              name: certData.name,
              subject: certData.subject,
              hosts: certData.hosts,
              valid_from: certDetails.validFrom,
              valid_to: certDetails.validTo,
              ca_name: certData.ca.secretName
            }
          } catch (error) {
            throw error
          }
        }
        throw new Errors.NotFoundError(`CA with name ${certData.ca.secretName} not found`)
      }
      // Check if CA is expired
      if (caRecord.isExpired()) {
        throw new Errors.ValidationError(`CA ${certData.ca.secretName} is expired and cannot be used to sign new certificates`)
      }
    }
  }

  // Generate certificate
  await generateCertificate({
    name: certData.name,
    subject: certData.subject,
    hosts: certData.hosts,
    expiration: certData.expiration,
    ca: certData.ca
  })

  // Get certificate from secret to parse details
  const certSecret = await SecretService.getSecretEndpoint(certData.name)
  const certPem = Buffer.from(certSecret.data['tls.crt'], 'base64').toString()
  const certDetails = parseCertificate(certPem)

  // Create certificate record in database
  await CertificateManager.createCertificateRecord({
    name: certData.name,
    subject: certDetails.subject,
    isCA: false,
    signedById: caRecord ? caRecord.id : null,
    hosts: certData.hosts,
    validFrom: certDetails.validFrom,
    validTo: certDetails.validTo,
    serialNumber: certDetails.serialNumber
  }, transaction)

  return {
    name: certData.name,
    subject: certData.subject,
    hosts: certData.hosts,
    valid_from: certDetails.validFrom,
    valid_to: certDetails.validTo,
    ca_name: caRecord ? caRecord.name : null
  }
}

async function getCertificateEndpoint (name, transaction) {
  const certRecord = await CertificateManager.findCertificateByName(name, transaction)

  if (!certRecord) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CERTIFICATE_NOT_FOUND, name))
  }

  // Get the actual cert data from the secret
  const secret = await SecretService.getSecretEndpoint(name)

  if (!secret || secret.type !== 'tls') {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CERTIFICATE_NOT_FOUND, name))
  }

  // Get the certificate chain if available
  const certChain = await CertificateManager.getCertificateChain(certRecord.id, transaction)
  const chainInfo = certChain.length > 1
    ? certChain.slice(1).map(c => ({ name: c.name, subject: c.subject }))
    : []

  // Normalize line endings in the certificate and private key
  const certificate = normalizeLineEndings(Buffer.from(secret.data['tls.crt'], 'base64').toString())
  const privateKey = normalizeLineEndings(Buffer.from(secret.data['tls.key'], 'base64').toString())

  return {
    name: certRecord.name,
    subject: certRecord.subject,
    hosts: certRecord.hosts,
    isCA: certRecord.isCA,
    validFrom: certRecord.validFrom,
    validTo: certRecord.validTo,
    serialNumber: certRecord.serialNumber,
    caName: certRecord.signingCA ? certRecord.signingCA.name : null,
    certificateChain: chainInfo,
    daysRemaining: certRecord.getDaysUntilExpiration(),
    isExpired: certRecord.isExpired(),
    data: {
      certificate,
      privateKey: privateKey
    }
  }
}

async function listCertificatesEndpoint (transaction) {
  const certRecords = await CertificateManager.findAllCertificates(transaction)

  return {
    certificates: certRecords.map(cert => ({
      name: cert.name,
      subject: cert.subject,
      hosts: cert.hosts,
      isCA: cert.isCA,
      validFrom: cert.validFrom,
      validTo: cert.validTo,
      daysRemaining: cert.getDaysUntilExpiration(),
      isExpired: cert.isExpired(),
      caName: cert.signingCA ? cert.signingCA.name : null
    }))
  }
}

async function deleteCertificateEndpoint (name, transaction) {
  const certRecord = await CertificateManager.findCertificateByName(name, transaction)

  if (!certRecord) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CERTIFICATE_NOT_FOUND, name))
  }

  // Check if this is a CA with signed certificates
  if (certRecord.isCA) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CERTIFICATE_NOT_FOUND, name))
  }

  // Delete certificate record and the secret
  await CertificateManager.deleteCertificate(name, transaction)
  await SecretService.deleteSecretEndpoint(name, transaction)

  return {}
}

// Phase 3: Renewal Implementation
async function renewCertificateEndpoint (name, transaction) {
  try {
    // First check if certificate exists in database
    let certRecord = await CertificateManager.findCertificateByName(name, transaction)
    let isNewRecord = false

    // If no certificate record but secret exists, we'll create a new record
    if (!certRecord) {
      try {
        const secret = await SecretManager.findOne({ name, type: 'tls' }, transaction)
        if (secret) {
          isNewRecord = true
          // console.log(`Certificate record not found for ${name}, but secret exists. Will create new record.`)
        } else {
          throw new Errors.NotFoundError(`Certificate with name ${name} not found`)
        }
      } catch (error) {
        if (error instanceof Errors.NotFoundError) {
          throw error
        }
        throw new Errors.NotFoundError(`Certificate with name ${name} not found: ${error.message}`)
      }
    }

    // Delete existing secret (if any) - we'll create a new one
    try {
      await SecretService.deleteSecretEndpoint(name)
    } catch (error) {
      // Ignore NotFoundError
      if (!(error instanceof Errors.NotFoundError)) {
        throw error
      }
    }

    // Prepare renewal data
    const renewalData = {
      name: name,
      subject: certRecord ? certRecord.subject : name,
      hosts: certRecord ? certRecord.hosts : null,
      isRenewal: true
    }

    // Handle signing CA if this certificate was signed by a CA
    if (certRecord && certRecord.signedById) {
      const signingCA = await CertificateManager.findOne({ id: certRecord.signedById }, transaction)

      if (!signingCA || !signingCA.isCA) {
        throw new Errors.NotFoundError(`Signing CA for certificate ${name} not found or is not a valid CA`)
      }

      if (signingCA.isExpired()) {
        throw new Errors.ValidationError(`CA ${signingCA.name} is expired and cannot be used to renew certificates. Please renew the CA first.`)
      }

      renewalData.ca = {
        type: 'direct',
        secretName: signingCA.name
      }
    } else {
      // Self-signed renewal
      renewalData.ca = {
        type: 'self-signed'
      }
    }

    // Generate new certificate
    await generateCertificate(renewalData)

    // Get the newly created secret
    const secretModel = await SecretManager.findOne({ name }, transaction)

    if (!secretModel) {
      throw new Errors.NotFoundError(`Failed to find renewed certificate secret: ${name}`)
    }

    // Current date and expiration date
    const nowDate = new Date()
    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + (certRecord && certRecord.isCA ? 36 : 12))

    // Use Sequelize transaction for both operations
    if (isNewRecord) {
      // Create new certificate record
      await CertificateManager.create({
        name: name,
        subject: renewalData.subject,
        hosts: renewalData.hosts,
        isCA: renewalData.ca.type === 'self-signed',
        validFrom: nowDate,
        validTo: expiryDate,
        serialNumber: `renewed-${Date.now()}`,
        secretId: secretModel.id
      }, transaction)
    } else {
      // Update the existing certificate record
      await CertificateManager.update(
        { id: certRecord.id },
        {
          validFrom: nowDate,
          validTo: expiryDate,
          secretId: secretModel.id
        },
        transaction
      )
    }

    // Get the updated certificate record
    const updatedCert = await CertificateManager.findCertificateByName(name, transaction)

    if (!updatedCert) {
      // If certificate record still doesn't exist, try to create it again with all fields
      await CertificateManager.create({
        name: name,
        subject: renewalData.subject,
        hosts: renewalData.hosts,
        isCA: renewalData.ca.type === 'self-signed',
        validFrom: nowDate,
        validTo: expiryDate,
        serialNumber: `renewed-${Date.now()}`,
        secretId: secretModel.id
      }, transaction)

      // Try to get it again
      const newCert = await CertificateManager.findCertificateByName(name, transaction)
      if (!newCert) {
        throw new Error(`Failed to retrieve or create certificate record for ${name}`)
      }

      return {
        name: newCert.name,
        subject: newCert.subject,
        hosts: newCert.hosts,
        valid_from: newCert.validFrom,
        valid_to: newCert.validTo,
        renewed: true
      }
    }

    return {
      name: updatedCert.name,
      subject: updatedCert.subject,
      hosts: updatedCert.hosts,
      valid_from: updatedCert.validFrom,
      valid_to: updatedCert.validTo,
      renewed: true
    }
  } catch (error) {
    console.error(`Certificate renewal error: ${error.message}`)
    throw error
  }
}

// Get certificates expiring soon
async function listExpiringCertificatesEndpoint (days = 30, transaction) {
  const expiringCerts = await CertificateManager.findCertificatesForRenewal(days, transaction)

  // Ensure we return an empty array, not null, if no certificates are expiring
  return {
    certificates: expiringCerts ? expiringCerts.map(cert => ({
      name: cert.name,
      subject: cert.subject,
      hosts: cert.hosts,
      is_ca: cert.isCA,
      valid_from: cert.validFrom,
      valid_to: cert.validTo,
      days_remaining: cert.getDaysUntilExpiration(),
      ca_name: cert.signingCA ? cert.signingCA.name : null
    })) : []
  }
}

/**
 * Normalizes line endings to Unix style (\n)
 * Handles both \r\n and \n cases to ensure consistent output
 * @param {string} str - String to normalize
 * @returns {string} - String with normalized line endings
 */
function normalizeLineEndings (str) {
  // First replace all \r\n with \n
  // Then replace any remaining \r with \n
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

module.exports = {
  createCAEndpoint: TransactionDecorator.generateTransaction(createCAEndpoint),
  getCAEndpoint: TransactionDecorator.generateTransaction(getCAEndpoint),
  listCAEndpoint: TransactionDecorator.generateTransaction(listCAEndpoint),
  deleteCAEndpoint: TransactionDecorator.generateTransaction(deleteCAEndpoint),
  createCertificateEndpoint: TransactionDecorator.generateTransaction(createCertificateEndpoint),
  getCertificateEndpoint: TransactionDecorator.generateTransaction(getCertificateEndpoint),
  listCertificatesEndpoint: TransactionDecorator.generateTransaction(listCertificatesEndpoint),
  deleteCertificateEndpoint: TransactionDecorator.generateTransaction(deleteCertificateEndpoint),
  renewCertificateEndpoint: TransactionDecorator.generateTransaction(renewCertificateEndpoint),
  listExpiringCertificatesEndpoint: TransactionDecorator.generateTransaction(listExpiringCertificatesEndpoint)
}
