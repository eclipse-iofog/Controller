'use strict'

module.exports = (sequelize, DataTypes) => {
  const RuntimeClass = sequelize.define('RuntimeClass', {
    name: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      field: 'name'
    },
    handler: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'handler'
    }
  }, {
    tableName: 'RuntimeClasses',
    timestamps: false,
    underscored: true
  })

  RuntimeClass.associate = function (models) {
    RuntimeClass.belongsToMany(models.Fog, {
      through: models.FogRuntimeClasses,
      as: 'fogs',
      foreignKey: 'runtime_class_name',
      otherKey: 'fog_uuid'
    })
  }

  return RuntimeClass
}
