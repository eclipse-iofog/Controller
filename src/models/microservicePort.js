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
 * @file microservicePort.js
 * @author Zishan Iqbal
 * @description This file includes a microservice_port model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const Microservice = require('./microservice');
const User = require('./user');

const MicroservicePort = sequelize.define('microservice_port', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    portInternal: {
        type: Sequelize.INTEGER,
        field: 'port_internal'
    },
    portExternal: {
        type: Sequelize.INTEGER,
        field: 'port_external'
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

MicroservicePort.belongsTo(Microservice, {
    foreignKey: 'catalog_item_id',
    as: 'catalogItemId',
    onDelete: 'cascade'
});

MicroservicePort.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updatedBy',
    onDelete: 'cascade'
});

module.exports = MicroservicePort;