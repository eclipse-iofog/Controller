'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('FogAccessTokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id'
      },
      expirationTime: {
        type: Sequelize.BIGINT,
        field: 'expiration_time'
      },
      token: {
        type: Sequelize.TEXT,
        field: 'token'
      },
      iofogUuid: {
        type: Sequelize.TEXT,
        field: 'iofog_uuid',
        references: { model: 'Fog', key: 'uuid' },
        onDelete: 'cascade'
      },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: { model: 'User', key: 'id' },
        onDelete: 'cascade'
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('FogAccessTokens');
  }
};