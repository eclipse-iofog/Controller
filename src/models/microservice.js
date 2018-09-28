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

const Microservice = sequelize.define('microservice', {
    uuid: {
        type: Sequelize.TEXT,
        primaryKey: true,
        field: 'uuid'
    },
    config: {
        type: Sequelize.TEXT,
        field: 'config'
    },
    name: {
        type: Sequelize.TEXT,
        field: 'name'
    },
    configLastUpdated: {
        type: Sequelize.BIGINT,
        field: 'config_last_updated'
    },
    isNetwork: {
        type: Sequelize.BOOLEAN,
        field: 'is_network'
    },
    needUpdate: {
        type: Sequelize.BOOLEAN,
        field: 'need_update'
    },
    rebuild: {
        type: Sequelize.BOOLEAN,
        field: 'rebuild'
    },
    rootHostAccess: {
        type: Sequelize.BOOLEAN,
        field: 'root_host_access'
    },
    logSize: {
        type: Sequelize.BIGINT,
        field: 'log_size'
    },
    volumeMappings: {
        type: Sequelize.TEXT,
        field: 'volume_mappings'
    },
    imageSnapshot: {
        type: Sequelize.TEXT,
        field: 'image_snapshot'
    },
    deleteWithCleanUp: {
        type: Sequelize.BOOLEAN,
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

Microservice.belongsTo(CatalogItem, {
    foreignKey: 'catalog_item_id',
    as: 'catalogItemId',

});

Microservice.belongsTo(Fog, {
    foreignKey: 'iofog_uuid',
    as: 'iofoguuid',
    onDelete: 'set null'
});

Microservice.belongsTo(Registry, {
    foreignKey: 'registry_id',
    as: 'registryId',
    onDelete: 'cascade'
});

Microservice.belongsTo(Flow, {
    foreignKey: 'flow_id',
    as: 'flowId',
    onDelete: 'cascade'
});

Microservice.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'UpdatedBy',
    onDelete: 'cascade'
});

module.exports = Microservice;