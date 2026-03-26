'use strict'

module.exports = (sequelize, DataTypes) => {
  const Certificate = sequelize.define('Certificate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'name',
      unique: true
    },
    subject: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'subject'
    },
    isCA: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_ca'
    },
    signedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'signed_by_id',
      references: {
        model: 'Certificates',
        key: 'id'
      }
    },
    hosts: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'hosts'
    },
    validFrom: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'valid_from'
    },
    validTo: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'valid_to'
    },
    serialNumber: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'serial_number'
    },
    secretId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'secret_id',
      references: {
        model: 'Secrets',
        key: 'id'
      }
    }
  }, {
    tableName: 'Certificates',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        fields: ['valid_to']
      },
      {
        fields: ['is_ca']
      },
      {
        fields: ['signed_by_id']
      },
      {
        fields: ['secret_id']
      }
    ]
  })

  Certificate.associate = (models) => {
    Certificate.belongsTo(Certificate, {
      as: 'signingCA',
      foreignKey: 'signed_by_id'
    })
    Certificate.hasMany(Certificate, {
      as: 'signedCertificates',
      foreignKey: 'signed_by_id'
    })

    Certificate.belongsTo(models.Secret, {
      foreignKey: 'secret_id',
      as: 'secret'
    })
  }

  // Add a getter for days remaining until expiration
  Certificate.prototype.getDaysUntilExpiration = function () {
    const today = new Date()
    const expiryDate = new Date(this.validTo)
    const diffTime = expiryDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  // Add a method to check if certificate is expired
  Certificate.prototype.isExpired = function () {
    const today = new Date()
    const expiryDate = new Date(this.validTo)
    return today > expiryDate
  }

  // Add a method to check if certificate is expiring soon
  Certificate.prototype.isExpiringSoon = function (days = 30) {
    const daysRemaining = this.getDaysUntilExpiration()
    return daysRemaining > 0 && daysRemaining <= days
  }

  return Certificate
}
