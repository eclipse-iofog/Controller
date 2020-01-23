'use strict'

const constants = require('../constants')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Registries', [
      {
        id: constants.DOCKER_REGISTRY_ID,
        url: 'registry.hub.docker.com',
        is_public: true,
        secure: true,
        certificate: '',
        requires_cert: false,
        user_name: '',
        password: '',
        user_email: '',
        user_id: null
      },
      {
        id: constants.CACHE_REGISTRY_ID,
        url: 'from_cache',
        is_public: true,
        secure: true,
        certificate: '',
        requires_cert: false,
        user_name: '',
        password: '',
        user_email: '',
        user_id: null
      }
    ])
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Registries', null, {})
  }
}
