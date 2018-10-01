'use strict';
module.exports = (sequelize, DataTypes) => {
  const FogVersionCommand = sequelize.define('FogVersionCommand', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    versionCommand: {
      type: DataTypes.STRING(100),
      field: 'version_command'
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
  FogVersionCommand.associate = function(models) {
    // associations can be defined here
    FogVersionCommand.belongsTo(models.Fog, {
      foreignKey: 'iofog_uuid',
      as: 'iofogUuid',
      onDelete: 'cascade'
    });
  };
  return FogVersionCommand;
};