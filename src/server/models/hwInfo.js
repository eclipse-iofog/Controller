/**
 * @author elukashick
 * @description This file includes a hw_info model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Fog from './fog'

const HWInfo = sequelize.define('hw_info', {

    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID'
    },
    iofog_uuid: {
        type: Sequelize.TEXT,
        field: 'iofog_uuid'
    },
    info: {
        type: Sequelize.TEXT,
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

HWInfo.belongsTo(Fog, {
    foreignKey: 'iofog_uuid'
});

export default HWInfo;