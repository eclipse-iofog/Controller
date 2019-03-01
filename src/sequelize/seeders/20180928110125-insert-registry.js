'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Registries', [
      {
        ID: 1,
        url: 'registry.hub.docker.com',
        is_public: 1,
        secure: 1,
        certificate: '',
        requires_cert: 0,
        user_name: '',
        password: '',
        user_email: '',
        user_id: null,
      },
      {
        ID: 2,
        url: 'from_cache',
        is_public: 1,
        secure: 1,
        certificate: '',
        requires_cert: 0,
        user_name: '',
        password: '',
        user_email: '',
        user_id: null,
      },
    ])
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Registries', null, {})
  },
}
