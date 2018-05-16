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
 * @file proxy.js
 * @author epankov
 * @description This file includes a proxy model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Fog from './fog';

const Proxy = sequelize.define('proxy', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID'
    },
    username: {
       type: Sequelize.TEXT,
       field: 'username'
    },
    password: {
        type: Sequelize.TEXT,
        field: 'password'
    },
    host: {
        type: Sequelize.TEXT,
        field: 'host'
    },
    rport: {
        type: Sequelize.INTEGER,
        field: 'remote_port'
    },
    lport: {
        type: Sequelize.INTEGER,
        defaultValue: 22,
        field: 'local_port'
    },
    rsakey: {
        type: Sequelize.TEXT,
        field: 'rsa_key'
    },
    close: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'close'
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

Proxy.belongsTo(Fog, {
    foreignKey: 'iofog_uuid'
});

export default Proxy;