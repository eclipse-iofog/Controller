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

import Sequelize from "sequelize";
import ElementInstance from "./elementInstance";
import sequelize from "../utils/sequelize";

const StraceDiagnostics = sequelize.define('strace_diagnostics', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID'
    },
    straceRun: {
        type: Sequelize.BOOLEAN,
        field: 'straceRun'
    },
    buffer: {
        type: Sequelize.BIGINT,
        field: 'buffer',
        defaultValue: '',
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

StraceDiagnostics.belongsTo(ElementInstance, {
    foreignKey: 'element_instance_uuid'
});
export default StraceDiagnostics;