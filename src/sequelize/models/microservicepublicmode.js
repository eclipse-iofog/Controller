'use strict';
module.exports = (sequelize, DataTypes) => {
  const MicroservicePublicMode = sequelize.define('MicroservicePublicMode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    }
  }, {
    timestamps: false,
    underscored: true
  });
  MicroservicePublicMode.associate = function(models) {
    MicroservicePublicMode.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid',
        field: 'microservice_uuid'
      },
      as: 'microservice',
      onDelete: 'cascade'
    });

    MicroservicePublicMode.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'networkMicroserviceUuid',
        field: 'network_microservice_uuid'
      },
      as: 'networkMicroservice',
      onDelete: 'set null'
    });

    MicroservicePublicMode.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'set null'
    });

    MicroservicePublicMode.belongsTo(models.MicroservicePort, {
      foreignKey: {
        name: 'microservicePortId',
        field: 'microservice_port_id'
      },
      as: 'microservicePort',
      onDelete: 'set null'
    });

    MicroservicePublicMode.belongsTo(models.ConnectorPort, {
      foreignKey: {
        name: 'connectorPortId',
        field: 'connector_port_id'
      },
      as: 'connectorPort',
      onDelete: 'set null'
    });
  };
  return MicroservicePublicMode;
};