'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Registry', [
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
        iofog_uuid: null,
        user_id: null
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
        iofog_uuid: null,
        user_id: null
      }
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Registry', null, {});
  }
};