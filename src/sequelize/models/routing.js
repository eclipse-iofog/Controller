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
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  Routing.associate = function(models) {
    // associations can be defined here
    Routing.belongsTo(models.Fog, {
      foreignKey: 'publishing_iofog_uuid',
      as: 'publishingIofogId',
      onDelete: 'cascade'
    });

    Routing.belongsTo(models.Fog, {
      foreignKey: 'destination_iofog_uuid',
      as: 'destinationIofogId',
      onDelete: 'cascade'
    });

    Routing.belongsTo(models.Microservice, {
      foreignKey: 'publishing_microservice_uuid',
      as: 'publishingMicroserviceUuid',
      onDelete: 'cascade'
    });

    Routing.belongsTo(models.Microservice, {
      foreignKey: 'destination_microservice_uuid',
      as: 'destinationMicroserviceUuid',
      onDelete: 'cascade'
    });
  };
  return Routing;
};