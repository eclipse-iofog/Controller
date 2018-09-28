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
 * @file networkPairing.js
 * @author Zishan Iqbal
 * @description This file includes a networkPairing model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const Fog = require('./fog');
const Microservice = require('./microservice');
const microservicePort = require('./microservicePort');
const SatellitePort = require('./satellitePort');

const NetworkPairing = sequelize.define('network_pairing', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    isPublicPort: {
        type: Sequelize.BOOLEAN,
        field: 'is_public_port'
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

NetworkPairing.belongsTo(Fog, {
    foreignKey: 'iofog_id_1',
    as: 'iofogId1'
});
NetworkPairing.belongsTo(Fog, {
    foreignKey: 'iofog_id_2',
    as: 'iofogId2'
});
NetworkPairing.belongsTo(Microservice, {
    foreignKey: 'microservice_uuid_1',
    as: 'microserviceUuid1',
});
NetworkPairing.belongsTo(Microservice, {
    foreignKey: 'microservice_uuid_2',
    as: 'microserviceUuid2',
});
NetworkPairing.belongsTo(Microservice, {
    foreignKey: 'network_catalog_item_id_1',
    as: 'networkcatalogItemId1',
});
NetworkPairing.belongsTo(Microservice, {
    foreignKey: 'network_catalog_item_id_2',
    as: 'networkcatalogItemId2',
});
NetworkPairing.belongsTo(microservicePort, {
    foreignKey: 'microservice_port_id_1',
    as: 'microsevicePortId1'
});
NetworkPairing.belongsTo(SatellitePort, {
    foreignKey: 'satellite_port_id',
    as: 'satellitePortId'
});

module.exports = NetworkPairing;