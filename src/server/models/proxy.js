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
       field: 'Username'
    },
    password: {
        type: Sequelize.TEXT,
        field: 'Password'
    },
    host: {
        type: Sequelize.TEXT,
        field: 'Host'
    },
    rport: {
        type: Sequelize.INTEGER,
        field: 'RemotePort'
    },
    lport: {
        type: Sequelize.INTEGER,
        defaultValue: 22,
        field: 'LocalPort'
    },
    rsakey: {
        type: Sequelize.TEXT,
        field: 'RsaKey'
    },
    status: {
        type: Sequelize.TEXT,
        field: 'Status'
    },
    errormessage: {
        type: Sequelize.TEXT,
        field: 'ErrorMessage'
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

Proxy.belongsTo(Fog, {
    foreignKey: 'iofog_uuid'
});

export default Proxy;