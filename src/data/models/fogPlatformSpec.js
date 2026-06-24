'use strict'

module.exports = (sequelize, DataTypes) => {
  const FogPlatformSpec = sequelize.define('FogPlatformSpec', {
    fogUuid: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false,
      field: 'fog_uuid'
    },
    specJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'spec_json'
    },
    generation: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'generation'
    }
  }, {
    tableName: 'FogPlatformSpecs',
    timestamps: true,
    underscored: true
  })

  FogPlatformSpec.associate = (models) => {
    FogPlatformSpec.belongsTo(models.Fog, {
      foreignKey: 'fog_uuid',
      as: 'fog'
    })
  }

  return FogPlatformSpec
}
