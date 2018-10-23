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
      defaultValue: false,
      field: 'is_network_connection'
    }
  }, {
    timestamps: false,
    underscored: true
  });
  Routing.associate = function(models) {

    Routing.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'sourceMicroserviceUuid',
        field: 'source_microservice_uuid'
      },
      as: 'sourceMicroservice',
      onDelete: 'cascade'
    });

    Routing.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'destMicroserviceUuid',
        field: 'dest_microservice_uuid'
      },
      as: 'destMicroservice',
      onDelete: 'cascade'
    });

    Routing.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'sourceNetworkMicroserviceUuid',
        field: 'source_network_microservice_uuid'
      },
      as: 'sourceNetworkMicroservice',
      onDelete: 'set null'
    });

    Routing.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'destNetworkMicroserviceUuid',
        field: 'dest_network_microservice_uuid'
      },
      as: 'destNetworkMicroservice',
      onDelete: 'set null'
    });

    Routing.belongsTo(models.Fog, {
      foreignKey: {
        name: 'sourceIofogUuid',
        field: 'source_iofog_uuid'
      },
      as: 'sourceIofog',
      onDelete: 'set null'
    });

    Routing.belongsTo(models.Fog, {
      foreignKey: {
        name: 'destIofogUuid',
        field: 'dest_iofog_uuid'
      },
      as: 'destIofog',
      onDelete: 'set null'
    });

    Routing.belongsTo(models.ConnectorPort, {
      foreignKey: {
        name: 'connectorPortId',
        field: 'connector_port_id'
      },
      as: 'connectorPort',
      onDelete: 'set null'
    });
  };
  return Routing;
};