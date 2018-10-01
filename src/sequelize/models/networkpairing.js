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
  NetworkPairing.associate = function(models) {

    NetworkPairing.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid_1',
      as: 'iofogUuid1'
    });
    NetworkPairing.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid_2',
      as: 'iofogUuid2'
    });
    NetworkPairing.belongsTo(models.Microservice, {
      foreignKey: 'microservice_uuid_1',
      as: 'microserviceUuid1',
    });
    NetworkPairing.belongsTo(models.Microservice, {
      foreignKey: 'microservice_uuid_2',
      as: 'microserviceUuid2',
    });
    NetworkPairing.belongsTo(models.Microservice, {
      foreignKey: 'network_microservice_uuid_1',
      as: 'networkMicroserviceUuid1',
    });
    NetworkPairing.belongsTo(models.Microservice, {
      foreignKey: 'network_microservice_uuid_2',
      as: 'networkMicroserviceUuid2',
    });
    NetworkPairing.belongsTo(models.MicroservicePort, {
      foreignKey: 'microservice_port_id_1',
      as: 'microsevicePortId1'
    });
    NetworkPairing.belongsTo(models.SatellitePort, {
      foreignKey: 'satellite_port_id',
      as: 'satellitePortId'
    });
  };
  return NetworkPairing;
};