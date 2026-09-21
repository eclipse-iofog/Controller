'use strict'

module.exports = (sequelize, DataTypes) => {
  const FleetKnowledge = sequelize.define('FleetKnowledge', {
    uuid: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false,
      field: 'uuid'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'name'
    },
    repo: {
      type: DataTypes.TEXT,
      field: 'repo'
    },
    revision: {
      type: DataTypes.TEXT,
      field: 'revision',
      defaultValue: ''
    },
    files: {
      type: DataTypes.TEXT,
      field: 'files',
      defaultValue: '[]',
      get () {
        const value = this.getDataValue('files')
        if (value == null || value === '') {
          return []
        }
        try {
          return JSON.parse(value)
        } catch (e) {
          return []
        }
      },
      set (value) {
        if (value == null) {
          this.setDataValue('files', '[]')
          return
        }
        this.setDataValue('files', typeof value === 'string' ? value : JSON.stringify(value))
      }
    },
    format: {
      type: DataTypes.STRING,
      field: 'format'
    }
  }, {
    tableName: 'Knowledge',
    timestamps: true,
    underscored: true
  })

  FleetKnowledge.associate = function (models) {
    FleetKnowledge.belongsTo(models.Registry, {
      foreignKey: {
        name: 'registryId',
        field: 'registry_id'
      },
      as: 'registry',
      onDelete: 'set null'
    })

    FleetKnowledge.belongsToMany(models.Fog, {
      through: models.FogKnowledge,
      as: 'fogs',
      foreignKey: 'knowledge_uuid',
      otherKey: 'fog_uuid'
    })
  }

  return FleetKnowledge
}
