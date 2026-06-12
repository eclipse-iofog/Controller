'use strict'
module.exports = (sequelize, DataTypes) => {
  const FogVersionCommand = sequelize.define('FogVersionCommand', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    versionCommand: {
      /* eslint-disable new-cap */
      type: DataTypes.STRING(100),
      field: 'version_command'
    },
    semver: {
      type: DataTypes.STRING(100),
      field: 'semver'
    }
  }, {
    tableName: 'FogVersionCommands',
    timestamps: false,
    underscored: true
  })
  FogVersionCommand.associate = function (models) {
    FogVersionCommand.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'cascade'
    })
  }
  return FogVersionCommand
}
