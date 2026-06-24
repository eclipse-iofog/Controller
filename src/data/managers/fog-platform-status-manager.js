const BaseManager = require('./base-manager')
const models = require('../models')
const {
  FOG_PLATFORM_PHASES,
  parseConditionsJson,
  serializeConditionsJson
} = require('../../schemas/fog-platform-spec')

class FogPlatformStatusManager extends BaseManager {
  getEntity () {
    return models.FogPlatformStatus
  }

  async getParsedStatus (fogUuid, transaction) {
    const row = await this.findOne({ fogUuid }, transaction)
    if (!row) {
      return null
    }
    return {
      fogUuid: row.fogUuid,
      observedGeneration: row.observedGeneration,
      phase: row.phase,
      lastError: row.lastError,
      lastTransitionAt: row.lastTransitionAt,
      conditions: row.conditionsJson ? parseConditionsJson(row.conditionsJson) : []
    }
  }

  async ensurePending (fogUuid, transaction) {
    const existing = await this.findOne({ fogUuid }, transaction)
    const now = new Date()
    if (existing) {
      await this.update({
        fogUuid
      }, {
        phase: existing.phase === 'Deleting' ? 'Deleting' : 'Pending',
        lastTransitionAt: now
      }, transaction)
      return this.findOne({ fogUuid }, transaction)
    }

    return this.create({
      fogUuid,
      observedGeneration: 0,
      phase: 'Pending',
      lastTransitionAt: now
    }, transaction)
  }

  async setPhase (fogUuid, phase, options = {}, transaction) {
    if (!FOG_PLATFORM_PHASES.includes(phase)) {
      throw new Error(`Invalid fog platform phase '${phase}'`)
    }

    const update = {
      phase,
      lastTransitionAt: new Date()
    }
    if (Object.hasOwn(options, 'lastError')) {
      update.lastError = options.lastError
    }
    if (Object.hasOwn(options, 'observedGeneration')) {
      update.observedGeneration = options.observedGeneration
    }
    if (Object.hasOwn(options, 'conditions')) {
      update.conditionsJson = serializeConditionsJson(options.conditions)
    }

    const existing = await this.findOne({ fogUuid }, transaction)
    if (existing) {
      await this.update({ fogUuid }, update, transaction)
      return this.findOne({ fogUuid }, transaction)
    }

    return this.create({
      fogUuid,
      observedGeneration: update.observedGeneration || 0,
      ...update
    }, transaction)
  }
}

module.exports = new FogPlatformStatusManager()
