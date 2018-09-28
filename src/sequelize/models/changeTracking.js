/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

/**
 * @file changeTracking.js
 * @author Zishan Iqbal
 * @description This file includes a iofog_change_tracking model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');

const Fog = require('./fog');

module.exports = function (sequelize, DataTypes) {
    const ChangeTracking = sequelize.define('iofog_change_tracking', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
        },
        containerConfig: {
            type: DataTypes.BOOLEAN,
            field: 'container_config'
        },
        reboot: {
            type: DataTypes.BOOLEAN,
            field: 'reboot'
        },
        deletenode: {
            type: DataTypes.BOOLEAN,
            field: 'deletenode'
        },
        version: {
            type: DataTypes.BOOLEAN,
            field: 'version'
        },
        containerList: {
            type: DataTypes.BOOLEAN,
            field: 'container_list'
        },
        config: {
            type: DataTypes.BOOLEAN,
            field: 'config'
        },
        routing: {
            type: DataTypes.BOOLEAN,
            field: 'routing'
        },
        registries: {
            type: DataTypes.BOOLEAN,
            field: 'registries'
        },
        proxy: {
            type: DataTypes.BOOLEAN,
            field: 'proxy'
        },
        diagnostics: {
            type: DataTypes.BOOLEAN,
            field: 'diagnostics'
        },
        isImageSnapshot: {
            type: DataTypes.BOOLEAN,
            field: 'image_snapshot'
        }
    }, {
      // don't add the timestamp attributes (updatedAt, createdAt)
      timestamps: false,
      // disable the modification of table names
      freezeTableName: true,
      // don't use camelcase for automatically added attributes but underscore style
      // so updatedAt will be updated_at
      underscored: true
    });

     ChangeTracking.associate = function (models) {

         ChangeTracking.belongsTo(models.Fog, {
          foreignKey: 'iofog_uuid',
          as: 'ioFogUUID',
          onDelete: 'cascade'
        });
      };

    return ChangeTracking;
};
