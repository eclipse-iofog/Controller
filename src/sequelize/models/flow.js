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
 * @file flow.js
 * @author Zishan Iqbal
 * @description This file includes a data_tracks model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const User = require('./user');

module.exports = function (sequelize, DataTypes) {
    const Flow = sequelize.define('flow', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
        },
        name: {
            type: DataTypes.TEXT,
            field: 'name'
        },
        description: {
            type: DataTypes.TEXT,
            field: 'description'
        },
        isSelected: {
            type: DataTypes.INTEGER,
            field: 'is_selected'
        },
        isActivated: {
            type: DataTypes.INTEGER,
            field: 'is_activated'
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

     Flow.associate = function (models) {

         Flow.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'userId',
            onDelete: 'cascade'
        });

        Flow.belongsTo(models.User, {
            foreignKey: 'updated_by',
            as: 'updatedBy',
            onDelete: 'set null'
        });
      };


    return Flow;
};