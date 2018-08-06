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
 */

const Sequelize = require('sequelize');
const sequelize = require('./../utils/sequelize');

const ElementInstanceToCleanUp = sequelize.define('element_instance_to_clean_up', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID'
    },
    elementInstanceUUID: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        field: 'element_instance_uuid'
    },
    iofogUUID: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        field: 'iofog_uuid'
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

module.exports =  ElementInstanceToCleanUp;