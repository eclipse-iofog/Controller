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
 * @file fogType.js
 * @author Zishan Iqbal
 * @description This file includes a fog_type model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const CatalogItem = require('./catalogItem');

module.exports = function (sequelize, DataTypes) {
    const FogType = sequelize.define('iofog_type', {
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id'},
        name: {type: DataTypes.TEXT, field: 'name'},
        image: {type: DataTypes.TEXT, field: 'image'},
        description: {type: DataTypes.TEXT, field: 'description'}
    }, {
        // don't add the timestamp attributes (updatedAt, createdAt)
        timestamps: false,
        // disable the modification of table names
        freezeTableName: true,
        // don't use camelcase for automatically added attributes but underscore style
        // so updatedAt will be updated_at
        underscored: true
    });

    FogType.associate = function (models) {
        FogType.belongsTo(models.CatalogItem, {
            foreignKey: 'network_catalog_item_id',
            as: 'networkCatalogItemId'
        });

        FogType.belongsTo(models.CatalogItem, {
            foreignKey: 'hal_catalog_item_id',
            as: 'halCatalogItemId'
        });

        FogType.belongsTo(models.CatalogItem, {
            foreignKey: 'bluetooth_catalog_item_id',
            as: 'bluetoothCatalogItemId'
        });
    };

    return FogType;
};
