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
 * @file satellitejs
 * @author Zishan Iqbal
 * @description
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');

const Satellite = sequelize.define('satellite', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    name: {
        type: Sequelize.TEXT,
        field: 'name'
    },
    domain: {
        type: Sequelize.TEXT,
        field: 'domain'
    },
    publicIP: {
        type: Sequelize.TEXT,
        field: 'public_ip'
    },
    cert: {
        type: Sequelize.TEXT,
        field: 'cert'
    },
    selfSignedCerts: {
        type: Sequelize.BOOLEAN,
        field: 'self_signed_certs'
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

module.exports = Satellite;