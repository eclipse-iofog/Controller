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
const sequelize = require('./../utils/sequelize');

const Fog = require('./fog');
const Registry = require('./registry');

const ChangeTracking = sequelize.define('iofog_change_tracking', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID'
    },
    containerConfig: {
        type: Sequelize.BIGINT,
        field: 'container_config'
    },
    reboot: {
        type: Sequelize.BOOLEAN,
        field: 'reboot'
    },
    deletenode: {
        type: Sequelize.BOOLEAN,
        field: 'deletenode'
    },
    version: {
        type: Sequelize.BIGINT,
        field: 'version'
    },
    containerList: {
        type: Sequelize.BIGINT,
        field: 'container_list'
    },
    config: {
        type: Sequelize.BIGINT,
        field: 'config'
    },
    routing: {
        type: Sequelize.BIGINT,
        field: 'routing'
    },
    registries: {
        type: Sequelize.BIGINT,
        field: 'registries'
    },
    proxy: {
        type: Sequelize.BIGINT,
        field: 'proxy'
    },
    diagnostics: {
        type: Sequelize.BIGINT,
        field: 'diagnostics'
    },
    isImageSnapshot: {
        type: Sequelize.BIGINT,
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

ChangeTracking.belongsTo(Fog, {
  foreignKey: 'iofog_uuid'
});
module.exports =  ChangeTracking;