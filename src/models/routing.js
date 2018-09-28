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
 * @file routing.js
 * @author Zishan Iqbal
 * @description This file includes a routing model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const Fog = require('./fog');
const Microservice = require('./microservice');

const Routing = sequelize.define('routing', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    isNetworkConnection: {
        type: Sequelize.BOOLEAN,
        field: 'is_network_connection'
    },
}, {
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
});

Routing.belongsTo(Fog, {
    foreignKey: 'publishing_iofog_id',
    as: 'publishingIofogId',
    onDelete: 'cascade'
});

Routing.belongsTo(Fog, {
    foreignKey: 'destination_iofog_id',
    as: 'destinationIofogId',
    onDelete: 'cascade'
});

Routing.belongsTo(Microservice, {
    foreignKey: 'publishing_microservice_uuid',
    as: 'publishingmicroserviceUuid',
    onDelete: 'cascade'
});

Routing.belongsTo(Microservice, {
    foreignKey: 'destination_microservice_uuid',
    as: 'destinationmicroserviceUuid',
    onDelete: 'cascade'
});

module.exports = Routing;