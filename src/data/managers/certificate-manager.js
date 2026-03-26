const BaseManager = require('./base-manager')
const models = require('../models')
const Certificate = models.Certificate
const { Op } = require('sequelize')
const SecretManager = require('./secret-manager')
const AppHelper = require('../../helpers/app-helper')

class CertificateManager extends BaseManager {
  getEntity () {
    return Certificate
  }

  async createCertificateRecord (certData, transaction) {
    // First find the secret by name to get its ID
    const secret = await SecretManager.findOne({ name: certData.name }, transaction)

    if (secret) {
      // Link the certificate to the secret
      certData.secretId = secret.id
    }

    return this.create(certData, transaction)
  }

  async findCertificatesByCA (caId, transaction) {
    AppHelper.checkTransaction(transaction)

    const options = transaction.fakeTransaction
      ? {
        where: { signedById: caId },
        include: ['secret'] }
      : {
        where: { signedById: caId },
        include: ['secret'],
        transaction: transaction }
    return this.getEntity().findAll(options)
  }

  async findExpiringCertificates (days = 30, transaction) {
    AppHelper.checkTransaction(transaction)

    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + days)

    const options = transaction.fakeTransaction
      ? {
        where: { validTo: { [Op.lt]: expirationDate
        }
        },
        include: ['signingCA'] }
      : {
        where: { validTo: { [Op.lt]: expirationDate
        }
        },
        include: ['signingCA'],
        transaction: transaction }
    return this.getEntity().findAll(options)
  }

  async findCertificateByName (name, transaction) {
    AppHelper.checkTransaction(transaction)

    const options = transaction.fakeTransaction
      ? {
        where: { name },
        include: ['signingCA', 'secret'] }
      : {
        where: { name },
        include: ['signingCA', 'secret'],
        transaction: transaction }
    return this.getEntity().findOne(options)
  }

  async findAllCAs (transaction) {
    AppHelper.checkTransaction(transaction)

    const options = transaction.fakeTransaction
      ? {
        where: { isCA: true },
        include: ['secret'] }
      : {
        where: { isCA: true },
        include: ['secret'],
        transaction: transaction }
    return this.getEntity().findAll(options)
  }

  async findAllCertificates (transaction) {
    AppHelper.checkTransaction(transaction)

    const options = transaction.fakeTransaction
      ? {
        include: ['signingCA', 'secret'] }
      : {
        include: ['signingCA', 'secret'],
        transaction: transaction }
    return this.getEntity().findAll(options)
  }

  async deleteCertificate (name, transaction) {
    return this.delete({ name }, transaction)
  }

  async updateCertificate (id, updates, transaction) {
    AppHelper.checkTransaction(transaction)

    // Find existing certificate
    const options = transaction.fakeTransaction
      ? {
        where: { id } }
      : {
        where: { id },
        transaction: transaction }
    const cert = await this.getEntity().findOne(options)

    if (!cert) {
      throw new Error(`Certificate with id ${id} not found`)
    }

    // Update certificate
    return this.update({ id }, updates, transaction)
  }

  async findExpiredCertificates (transaction) {
    AppHelper.checkTransaction(transaction)

    const currentDate = new Date()

    const options = transaction.fakeTransaction
      ? {
        where: { validTo: { [Op.lt]: currentDate
        }
        },
        include: ['signingCA', 'secret'] }
      : {
        where: { validTo: { [Op.lt]: currentDate
        }
        },
        include: ['signingCA', 'secret'],
        transaction: transaction }
    return this.getEntity().findAll(options)
  }

  async getCertificateChain (certId, transaction) {
    AppHelper.checkTransaction(transaction)
    const chain = []

    const options = transaction.fakeTransaction
      ? {
        where: { id: certId },
        include: ['signingCA', 'secret'] }
      : {
        where: { id: certId },
        include: ['signingCA', 'secret'],
        transaction: transaction }
    let currentCert = await this.getEntity().findOne(options)

    if (!currentCert) {
      return chain
    }

    chain.push(currentCert)

    // Traverse up the chain of signing CAs
    while (currentCert.signingCA) {
      const parentOptions = transaction.fakeTransaction
        ? { where: { id: currentCert.signedById }, include: ['signingCA', 'secret']
        }
        : { where: { id: currentCert.signedById }, include: ['signingCA', 'secret'], transaction: transaction
        }
      currentCert = await this.getEntity().findOne(parentOptions)

      if (currentCert) {
        chain.push(currentCert)
      } else {
        break
      }
    }

    return chain
  }

  async findCertificatesForRenewal (days = 30, transaction) {
    AppHelper.checkTransaction(transaction)

    // Calculate the date range - we want certificates that expire between now and (now + days)
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const options = transaction.fakeTransaction
      ? {
        where: {
          validTo: {
            [Op.gt]: now,
            [Op.lt]: futureDate
          }
        },
        include: ['signingCA', 'secret'] }
      : {
        where: {
          validTo: {
            [Op.gt]: now,
            [Op.lt]: futureDate
          }
        },
        include: ['signingCA', 'secret'],
        transaction: transaction }
    return this.getEntity().findAll(options)
  }

  async getCertificateChildren (caId, transaction) {
    AppHelper.checkTransaction(transaction)

    const options = transaction.fakeTransaction
      ? {
        where: { signedById: caId },
        include: ['secret'] }
      : {
        where: { signedById: caId },
        include: ['secret'],
        transaction: transaction }
    return this.getEntity().findAll(options)
  }
}

module.exports = new CertificateManager()
