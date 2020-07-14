/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

'use strict'
module.exports = (sequelize, DataTypes) => {
  const ChangeTracking = sequelize.define('ChangeTracking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    microserviceConfig: {
      type: DataTypes.BOOLEAN,
      field: 'microservice_config',
      defaultValue: false
    },
    reboot: {
      type: DataTypes.BOOLEAN,
      field: 'reboot',
      defaultValue: false
    },
    deleteNode: {
      type: DataTypes.BOOLEAN,
      field: 'deletenode',
      defaultValue: false
    },
    version: {
      type: DataTypes.BOOLEAN,
      field: 'version',
      defaultValue: false
    },
    microserviceList: {
      type: DataTypes.BOOLEAN,
      field: 'microservice_list',
      defaultValue: false
    },
    config: {
      type: DataTypes.BOOLEAN,
      field: 'config',
      defaultValue: false
    },
    routing: {
      type: DataTypes.BOOLEAN,
      field: 'routing',
      defaultValue: false
    },
    registries: {
      type: DataTypes.BOOLEAN,
      field: 'registries',
      defaultValue: false
    },
    tunnel: {
      type: DataTypes.BOOLEAN,
      field: 'tunnel',
      defaultValue: false
    },
    diagnostics: {
      type: DataTypes.BOOLEAN,
      field: 'diagnostics',
      defaultValue: false
    },
    routerChanged: {
      type: DataTypes.BOOLEAN,
      field: 'router_changed',
      defaultValue: false
    },
    isImageSnapshot: {
      type: DataTypes.BOOLEAN,
      field: 'image_snapshot',
      defaultValue: false
    },
    prune: {
      type: DataTypes.BOOLEAN,
      field: 'prune',
      defaultValue: false
    },
    lastUpdated: {
      type: DataTypes.STRING,
      field: 'last_updated',
      defaultValue: false
    }
  }, {
    tableName: 'ChangeTrackings',
    timestamps: false,
    underscored: true
  })
  ChangeTracking.associate = function (models) {
    ChangeTracking.belongsTo(models.Fog, {
      foreignKey: {
        name: 'iofogUuid',
        field: 'iofog_uuid'
      },
      as: 'iofog',
      onDelete: 'cascade'
    })
  }
  return ChangeTracking
}
