'use strict'
module.exports = (sequelize, DataTypes) => {
  const Connector = sequelize.define('Connector', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id',
    },
    name: {
      type: DataTypes.TEXT,
      field: 'name',
    },
    domain: {
      type: DataTypes.TEXT,
      field: 'domain',
    },
    publicIp: {
      type: DataTypes.TEXT,
      field: 'public_ip',
    },
    cert: {
      type: DataTypes.TEXT,
      field: 'cert',
    },
    isSelfSignedCert: {
      type: DataTypes.BOOLEAN,
      field: 'self_signed_certs',
    },
    devMode: {
      type: DataTypes.BOOLEAN,
      field: 'dev_mode',
    },
  }, {
    timestamps: true,
    underscored: true,
  })
  Connector.associate = function(models) {

  }
  return Connector
}
