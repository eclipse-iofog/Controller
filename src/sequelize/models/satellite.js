'use strict';
module.exports = (sequelize, DataTypes) => {
  const Satellite = sequelize.define('Satellite', {
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
      field: 'domain'
    },
    publicIP: {
      type: DataTypes.TEXT,
      field: 'public_ip'
    },
    cert: {
      type: DataTypes.TEXT,
      field: 'cert'
    },
    selfSignedCerts: {
      type: DataTypes.BOOLEAN,
      field: 'self_signed_certs'
    }
  }, {
    timestamps: true,
    underscored: true
  });
  Satellite.associate = function(models) {

  };
  return Satellite;
};