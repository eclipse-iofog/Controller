'use strict'

module.exports = (sequelize, DataTypes) => {
  const FogPublicKey = sequelize.define('FogPublicKey', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    publicKey: {
      type: DataTypes.TEXT,
      field: 'public_key'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'FogPublicKeys',
    timestamps: true,
    underscored: true
  })

  FogPublicKey.associate = function (models) {
    FogPublicKey.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'cascade'
    })
  }

  return FogPublicKey
}
