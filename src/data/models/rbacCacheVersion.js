'use strict'

module.exports = (sequelize, DataTypes) => {
  const RbacCacheVersion = sequelize.define('RbacCacheVersion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      defaultValue: 1,
      field: 'id'
    },
    version: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 1,
      field: 'version'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updated_at'
    }
  }, {
    tableName: 'RbacCacheVersion',
    timestamps: true,
    underscored: true,
    freezeTableName: true
  })

  return RbacCacheVersion
}
