'use strict'
module.exports = (sequelize, DataTypes) => {
  const Tags = sequelize.define('Tags', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    name: {
      type: DataTypes.TEXT,
      unique: true,
      allowNull: false,
      field: 'name'
    }
  }, {
    tableName: 'Tags',
    timestamps: false,
    underscored: true
  })
  Tags.associate = function (models) {
    Tags.belongsToMany(models.Fog, { through: 'IofogTags', as: 'iofogs' })
  }
  return Tags
}
