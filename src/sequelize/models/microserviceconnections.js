'use strict';
module.exports = (sequelize, DataTypes) => {
  const MicroserviceConnections = sequelize.define('MicroserviceConnections', {
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
  MicroserviceConnections.associate = function (models) {

    MicroserviceConnections.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'destinationMicroserviceUuid',
        field: 'destination_microservice_uuid'
      },
      as: 'destinationMicroservice',
      onDelete: 'cascade'
    });

    MicroserviceConnections.belongsTo(models.Microservice, {
      foreignKey: {
        name: 'sourceMicroserviceUuid',
        field: 'source_microservice_uuid'
      },
      as: 'sourceMicroservice',
      onDelete: 'cascade'
    });
  };
  return MicroserviceConnections;
};