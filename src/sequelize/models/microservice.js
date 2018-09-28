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
 * @file microservice.js
 * @author Zishan Iqbal
 * @description This file includes a microservice model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const Fog = require('./fog');
const CatalogItem = require('./catalogItem');
const Flow = require('./flow');
const User = require('./user');
const Registry = require('./registry');

module.exports = function (sequelize, DataTypes) {
    const Microservice = sequelize.define('microservice', {
        uuid: {
            type: DataTypes.TEXT,
            primaryKey: true,
            field: 'uuid'
        },
        config: {
            type: DataTypes.TEXT,
            field: 'config'
        },
        name: {
            type: DataTypes.TEXT,
            field: 'name'
        },
        configLastUpdated: {
            type: DataTypes.BIGINT,
            field: 'config_last_updated'
        },
        isNetwork: {
            type: DataTypes.BOOLEAN,
            field: 'is_network'
        },
        needUpdate: {
            type: DataTypes.BOOLEAN,
            field: 'need_update'
        },
        rebuild: {
            type: DataTypes.BOOLEAN,
            field: 'rebuild'
        },
        rootHostAccess: {
            type: DataTypes.BOOLEAN,
            field: 'root_host_access'
        },
        logSize: {
            type: DataTypes.BIGINT,
            field: 'log_size'
        },
        volumeMappings: {
            type: DataTypes.TEXT,
            field: 'volume_mappings'
        },
        imageSnapshot: {
            type: DataTypes.TEXT,
            field: 'image_snapshot'
        },
        deleteWithCleanUp: {
            type: DataTypes.BOOLEAN,
            field: 'delete_with_cleanup'
        }
    }, {
        // don't add the timestamp attributes (updatedAt, createdAt)
        timestamps: true,
        // disable the modification of table names
        freezeTableName: true,
        // don't use camelcase for automatically added attributes but underscore style
        // so updatedAt will be updated_at
        underscored: true
    });

    Microservice.associate = function (models) {

        Microservice.belongsTo(models.CatalogItem, {
            foreignKey: 'catalog_item_id',
            as: 'catalogItemId',

        });

        Microservice.belongsTo(models.Fog, {
            foreignKey: 'iofog_uuid',
            as: 'iofoguuid',
            onDelete: 'set null'
        });

        Microservice.belongsTo(models.Registry, {
            foreignKey: 'registry_id',
            as: 'registryId',
            onDelete: 'cascade'
        });

        Microservice.belongsTo(models.Flow, {
            foreignKey: 'flow_id',
            as: 'flowId',
            onDelete: 'cascade'
        });

        Microservice.belongsTo(models.User, {
            foreignKey: 'updated_by',
            as: 'UpdatedBy',
            onDelete: 'cascade'
        });
    };


    return Microservice;
};