'use strict'
module.exports = (sequelize, DataTypes) => {
  const Router = sequelize.define('Router', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    name: {
      type: DataTypes.TEXT,
      field: 'name'
    },
    domain: {
      type: DataTypes.TEXT,
      field: 'host'
    }
  }, {
    tableName: 'Routers',
    timestamps: true,
    underscored: true
  })
  Router.associate = function (models) {

  }
  return Router
}
