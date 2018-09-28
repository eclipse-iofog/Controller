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
 * @author elukashick
 * @description This file includes a usb_info model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const Fog = require('./fog');

module.exports = function (sequelize, DataTypes) {
    const USBInfo = sequelize.define('usb_info', {

        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
        },
        info: {
            type: DataTypes.TEXT,
            defaultValue: " ",
            field: 'info'
        }
    }, {
        // add the timestamp attributes (updatedAt, createdAt)
        timestamps: true,
        // disable the modification of table names
        freezeTableName: true,
        // don't use camelcase for automatically added attributes but underscore style
        // so updatedAt will be updated_at
        underscored: true
    });

    USBInfo.associate = function (models) {

        USBInfo.belongsTo(models.Fog, {
            foreignKey: 'iofog_uuid',
            as: 'iofogUuid',
            onDelete: 'cascade'
        });
    };


    return USBInfo;
};