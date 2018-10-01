'use strict';
module.exports = (sequelize, DataTypes) => {
  const MicroservicePort = sequelize.define('MicroservicePort', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    portInternal: {
      type: DataTypes.INTEGER,
      field: 'port_internal'
    },
    portExternal: {
      type: DataTypes.INTEGER,
      field: 'port_external'
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
  MicroservicePort.associate = function(models) {
    // associations can be defined here
    MicroservicePort.belongsTo(models.Microservice, {
      foreignKey: 'microservice_uuid',
      as: 'microserviceUuid',
      onDelete: 'cascade'
    });

    MicroservicePort.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updatedBy',
      onDelete: 'cascade'
    });
  };
  return MicroservicePort;
};