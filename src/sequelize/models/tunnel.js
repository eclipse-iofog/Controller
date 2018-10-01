'use strict';
module.exports = (sequelize, DataTypes) => {
  const Tunnel = sequelize.define('Tunnel', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    username: {
      type: DataTypes.TEXT,
      field: 'username'
    },
    password: {
      type: DataTypes.TEXT,
      field: 'password'
    },
    host: {
      type: DataTypes.TEXT,
      field: 'host'
    },
    rport: {
      type: DataTypes.INTEGER,
      field: 'remote_port'
    },
    lport: {
      type: DataTypes.INTEGER,
      defaultValue: 22,
      field: 'local_port'
    },
    rsakey: {
      type: DataTypes.TEXT,
      field: 'rsa_key'
    },
    closed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'closed'
    }
  }, {
    timestamps: false,
    underscored: true
  });
  Tunnel.associate = function(models) {

    Tunnel.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid',
      as: 'iofogUuid',
      onDelete: 'cascade'
    });
  };
  return Tunnel;
};