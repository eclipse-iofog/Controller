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
 * @file user.js
 * @author Zishan Iqbal
 * @description This file includes a users model used by sequalize for ORM;
 */

const Sequelize = require('sequelize');
const sequelize = require('../utils/sequelize');

module.exports = function (sequelize, DataTypes) {
    const User = sequelize.define('user', {
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id'},
        firstName: {type: DataTypes.STRING(100), field: 'first_name'},
        lastName: {type: DataTypes.STRING(100), field: 'last_name'},
        email: DataTypes.STRING(100),
        password: DataTypes.STRING(100),
        tempPassword: {type: DataTypes.STRING(100), field: 'temp_password'},
        emailActivated: {type: DataTypes.BOOLEAN, field: 'email_activated'},
        userAccessToken: {type: DataTypes.TEXT, field: 'user_access_token'},
    }, {
        // don't add the timestamp attributes (updatedAt, createdAt)
        timestamps: false,
        // disable the modification of table names
        freezeTableName: true,
        // don't use camelcase for automatically added attributes but underscore style
        // so updatedAt will be updated_at
        underscored: true
    });

    return User;
};
