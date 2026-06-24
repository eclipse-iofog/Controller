const BaseManager = require('./base-manager')
const models = require('../models')
const {
  validateFogPlatformSpec,
  parseSpecJson,
  serializeSpecJson
} = require('../../schemas/fog-platform-spec')

class FogPlatformSpecManager extends BaseManager {
  getEntity () {
    return models.FogPlatformSpec
  }

  async getParsedSpec (fogUuid, transaction) {
    const row = await this.findOne({ fogUuid }, transaction)
    if (!row) {
      return null
    }
    return {
      fogUuid: row.fogUuid,
      generation: row.generation,
      spec: parseSpecJson(row.specJson)
    }
  }

  async upsertSpec (fogUuid, specObject, transaction) {
    await validateFogPlatformSpec(specObject)
    const specJson = serializeSpecJson(specObject)

    const existing = await this.findOne({ fogUuid }, transaction)
    if (existing) {
      const generation = existing.generation + 1
      await this.update({ fogUuid }, { specJson, generation }, transaction)
      return { fogUuid, generation, specJson }
    }

    await this.create({ fogUuid, specJson, generation: 1 }, transaction)
    return { fogUuid, generation: 1, specJson }
  }
}

module.exports = new FogPlatformSpecManager()
