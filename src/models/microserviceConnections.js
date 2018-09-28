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
 * @description This file includes a microservice_connections model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const Microservice = require('./microservice');

const MicroserviceConnections = sequelize.define('microservice_connections', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
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

MicroserviceConnections.belongsTo(Microservice, {
    foreignKey: 'destination_microservice',
    as: 'destinationmicroservice',
    onDelete: 'cascade'
});

MicroserviceConnections.belongsTo(Microservice, {
    foreignKey: 'source_microservice',
    as: 'sourcemicroservice',
    onDelete: 'cascade'
});

module.exports = MicroserviceConnections;