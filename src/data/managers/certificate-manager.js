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
    const secret = await SecretManager.findOne({ name: certData.name }, transaction)

    if (secret) {
      certData.secretId = secret.id
    }

    return this.create(certData, transaction)
  }

  async findCertificatesByCA (caId, transaction) {
    AppHelper.checkTransaction(transaction)

    return this.getEntity().findAll({
      where: { signedById: caId },
      include: ['secret'],
      transaction
    })
  }

  async findExpiringCertificates (days = 30, transaction) {
    AppHelper.checkTransaction(transaction)

    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + days)

    return this.getEntity().findAll({
      where: {
        validTo: { [Op.lt]: expirationDate }
      },
      include: ['signingCA'],
      transaction
    })
  }

  async findCertificateByName (name, transaction) {
    AppHelper.checkTransaction(transaction)

    return this.getEntity().findOne({
      where: { name },
      include: ['signingCA', 'secret'],
      transaction
    })
  }

  async findAllCAs (transaction) {
    AppHelper.checkTransaction(transaction)

    return this.getEntity().findAll({
      where: { isCA: true },
      include: ['secret'],
      transaction
    })
  }

  async findAllCertificates (transaction) {
    AppHelper.checkTransaction(transaction)

    return this.getEntity().findAll({
      include: ['signingCA', 'secret'],
      transaction
    })
  }

  async deleteCertificate (name, transaction) {
    return this.delete({ name }, transaction)
  }

  async updateCertificate (id, updates, transaction) {
    AppHelper.checkTransaction(transaction)

    const cert = await this.getEntity().findOne({
      where: { id },
      transaction
    })

    if (!cert) {
      throw new Error(`Certificate with id ${id} not found`)
    }

    return this.update({ id }, updates, transaction)
  }

  async findExpiredCertificates (transaction) {
    AppHelper.checkTransaction(transaction)

    const currentDate = new Date()

    return this.getEntity().findAll({
      where: {
        validTo: { [Op.lt]: currentDate }
      },
      include: ['signingCA', 'secret'],
      transaction
    })
  }

  async getCertificateChain (certId, transaction) {
    AppHelper.checkTransaction(transaction)
    const chain = []

    let currentCert = await this.getEntity().findOne({
      where: { id: certId },
      include: ['signingCA', 'secret'],
      transaction
    })

    if (!currentCert) {
      return chain
    }

    chain.push(currentCert)

    while (currentCert.signingCA) {
      currentCert = await this.getEntity().findOne({
        where: { id: currentCert.signedById },
        include: ['signingCA', 'secret'],
        transaction
      })

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

    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    return this.getEntity().findAll({
      where: {
        validTo: {
          [Op.gt]: now,
          [Op.lt]: futureDate
        }
      },
      include: ['signingCA', 'secret'],
      transaction
    })
  }

  async getCertificateChildren (caId, transaction) {
    AppHelper.checkTransaction(transaction)

    return this.getEntity().findAll({
      where: { signedById: caId },
      include: ['secret'],
      transaction
    })
  }
}

module.exports = new CertificateManager()
