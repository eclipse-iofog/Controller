const BaseManager = require('./base-manager')
const models = require('../models')
const FogPublicKey = models.FogPublicKey

class FogPublicKeyManager extends BaseManager {
  getEntity () {
    return FogPublicKey
  }

  // Find public key by fog UUID
  findByFogUuid (fogUuid, transaction) {
    const options = transaction.fakeTransaction
      ? {
          where: {
            iofogUuid: fogUuid
          }
        }
      : {
          where: {
            iofogUuid: fogUuid
          },
          transaction
        }

    return FogPublicKey.findOne(options)
  }

  // Update or create public key for a fog
  updateOrCreate (fogUuid, publicKey, transaction) {
    const options = transaction.fakeTransaction
      ? {
          where: {
            iofogUuid: fogUuid
          }
        }
      : {
          where: {
            iofogUuid: fogUuid
          },
          transaction
        }

    return FogPublicKey.findOne(options).then((existingKey) => {
      if (existingKey) {
        const updateOptions = transaction.fakeTransaction
          ? {
              where: {
                iofogUuid: fogUuid
              }
            }
          : {
              where: {
                iofogUuid: fogUuid
              },
              transaction
            }

        return FogPublicKey.update({
          publicKey
        }, updateOptions)
      } else {
        const createOptions = transaction.fakeTransaction
          ? {}
          : { transaction }

        return FogPublicKey.create({
          iofogUuid: fogUuid,
          publicKey
        }, createOptions)
      }
    })
  }

  // Delete public key by fog UUID
  deleteByFogUuid (fogUuid, transaction) {
    return this.delete({ iofogUuid: fogUuid }, transaction)
  }
}

const instance = new FogPublicKeyManager()
module.exports = instance
