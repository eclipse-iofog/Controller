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
 * @file emailActivationCodes.js
 * @author Zishan Iqbal
 * @description This file includes a email_activation_codes model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');
const User = require('./user');

module.exports = function (sequelize, DataTypes) {
    const EmailActivationCode = sequelize.define('email_activation_code', {
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id'},
        activationCode: {type: DataTypes.TEXT, field: 'activation_code'},
        expirationTime: {type: DataTypes.BIGINT, field: 'expiration_time'},
    }, {
        // don't add the timestamp attributes (updatedAt, createdAt)
        timestamps: false,
        // disable the modification of table names
        freezeTableName: true,
        // don't use camelcase for automatically added attributes but underscore style
        // so updatedAt will be updated_at
        underscored: true
    });

     EmailActivationCode.associate = function (models) {

         EmailActivationCode.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'userId',
            onDelete: 'cascade'
        });
      };

    return EmailActivationCode;
};

