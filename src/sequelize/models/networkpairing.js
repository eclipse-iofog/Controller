'use strict';
module.exports = (sequelize, DataTypes) => {
  const NetworkPairing = sequelize.define('NetworkPairing', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    isPublicPort: {
      type: DataTypes.BOOLEAN,
      field: 'is_public_port'
    }
  }, {
    timestamps: false,
    underscored: true
  });
  NetworkPairing.associate = function (models) {

    NetworkPairing.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid1',
        field: 'iofog_uuid_1'
      },
      as: 'iofog1'
    });
    NetworkPairing.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid2',
        field: 'iofog_uuid_2'
      },
      as: 'iofog2'
    });
    NetworkPairing.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'microserviceUuid1',
        field: 'microservice_uuid_1'
      },
      as: 'microservice1'
    });
    NetworkPairing.belongsTo(models.Microservice, {
      fforeignKey: {
        name: 'microserviceUuid2',
        field: 'microservice_uuid_2'
      },
      as: 'microservice2'
    });
    NetworkPairing.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'networkMicroserviceUuid1',
        field: 'network_microservice_uuid_1'
      },
      as: 'networkMicroservice1'
    });
    NetworkPairing.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'networkMicroserviceUuid2',
        field: 'network_microservice_uuid_2'
      },
      as: 'networkMicroservice2'
    });
    NetworkPairing.belongsTo(models.MicroservicePort, {
      foreignKey: {
        name: 'microservicePortId1',
        field: 'microservice_port_id_1'
      },
      as: 'microservicePort1'
    });
    NetworkPairing.belongsTo(models.ConnectorPort, {
      foreignKey: {
        name: 'connectorPortId',
        field: 'connector_port_id'
      },
      as: 'connectorPort'
    });
  };
  return NetworkPairing;
};