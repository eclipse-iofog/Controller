const BaseManager = require('./base-manager')
const models = require('../models')
const Tags = models.Tags

class TagsManager extends BaseManager {
  getEntity () {
    return Tags
  }
}

const instance = new TagsManager()
module.exports = instance
