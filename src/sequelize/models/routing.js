'use strict';
module.exports = (sequelize, DataTypes) => {
  const Routing = sequelize.define('Routing', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    isNetworkConnection: {
      type: DataTypes.BOOLEAN,
      field: 'is_network_connection'
    }
  }, {
    timestamps: false,
    underscored: true
  });
  Routing.associate = function (models) {

    Routing.belongsTo(models.Fog, {
      foreignKey: {
        name: 'publishingIofogUuid',
        field: 'publishing_iofog_uuid'
      },
      as: 'publishingIofog',
      onDelete: 'cascade'
    });

    Routing.belongsTo(models.Fog, {
      foreignKey: {
        name: 'destinationIofogUuid',
        field: 'destination_iofog_uuid'
      },
      as: 'destinationIofog',
      onDelete: 'cascade'
    });

    Routing.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'publishingMicroserviceUuid',
        field: 'publishing_microservice_uuid'
      },
      as: 'publishingMicroservice',
      onDelete: 'cascade'
    });

    Routing.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'destinationMicroserviceUuid',
        field: 'destination_microservice_uuid'
      },
      as: 'destinationMicroservice',
      onDelete: 'cascade'
    });
  };
  return Routing;
};