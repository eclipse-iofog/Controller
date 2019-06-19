'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Registries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'id',
      },
      url: {
        type: Sequelize.TEXT,
        field: 'url',
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        field: 'is_public',
      },
      secure: {
        type: Sequelize.BOOLEAN,
        field: 'secure',
      },
      certificate: {
        type: Sequelize.TEXT,
        field: 'certificate',
      },
      requiresCert: {
        type: Sequelize.BOOLEAN,
        field: 'requires_cert',
      },
      username: {
        type: Sequelize.TEXT,
        field: 'user_name',
      },
      password: {
        type: Sequelize.TEXT,
        field: 'password',
      },
      userEmail: {
        type: Sequelize.TEXT,
        field: 'user_email',
      },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: { model: 'Users', key: 'id' },
        onDelete: 'cascade',
      },
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Registries')
  },
}
