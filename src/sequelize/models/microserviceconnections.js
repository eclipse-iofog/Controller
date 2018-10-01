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
    freezeTableName: true,
    underscored: true
  });
  MicroserviceConnections.associate = function(models) {

    MicroserviceConnections.belongsTo(models.Microservice, {
      foreignKey: 'destination_microservice',
      as: 'destinationMicroservice',
      onDelete: 'cascade'
    });

    MicroserviceConnections.belongsTo(models.Microservice, {
      foreignKey: 'source_microservice',
      as: 'sourceMicroservice',
      onDelete: 'cascade'
    });
  };
  return MicroserviceConnections;
};