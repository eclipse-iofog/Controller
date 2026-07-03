const BaseManager = require('./base-manager')
const models = require('../models')
const FogPublicKey = models.FogPublicKey

class FogPublicKeyManager extends BaseManager {
  getEntity () {
    return FogPublicKey
  }

  findByFogUuid (fogUuid, transaction) {
    return FogPublicKey.findOne({
      where: {
        iofogUuid: fogUuid
      },
      transaction
    })
  }

  updateOrCreate (fogUuid, publicKey, transaction) {
    return FogPublicKey.findOne({
      where: {
        iofogUuid: fogUuid
      },
      transaction
    }).then((existingKey) => {
      if (existingKey) {
        return FogPublicKey.update({
          publicKey
        }, {
          where: {
            iofogUuid: fogUuid
          },
          transaction
        })
      }

      return FogPublicKey.create({
        iofogUuid: fogUuid,
        publicKey
      }, { transaction })
    })
  }

  deleteByFogUuid (fogUuid, transaction) {
    return this.delete({ iofogUuid: fogUuid }, transaction)
  }
}

const instance = new FogPublicKeyManager()
module.exports = instance
