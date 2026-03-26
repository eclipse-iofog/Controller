'use strict'
module.exports = (sequelize, DataTypes) => {
  const Config = sequelize.define('Config', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
      field: 'key'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'value'
    }
  }, {
    tableName: 'Config',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['key']
      }
    ]
  })
  return Config
}
