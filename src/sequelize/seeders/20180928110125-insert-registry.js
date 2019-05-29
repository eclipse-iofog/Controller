'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Registries', [
      {
        id: 1,
        url: 'registry.hub.docker.com',
        is_public: true,
        secure: true,
        certificate: '',
        requires_cert: false,
        user_name: '',
        password: '',
        user_email: '',
        user_id: null,
      },
      {
        id: 2,
        url: 'from_cache',
        is_public: true,
        secure: true,
        certificate: '',
        requires_cert: false,
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
