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
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
  });
  MicroserviceConnections.associate = function(models) {
    // associations can be defined here
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