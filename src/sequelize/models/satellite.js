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
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: true,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  Satellite.associate = function(models) {
    // associations can be defined here
  };
  return Satellite;
};