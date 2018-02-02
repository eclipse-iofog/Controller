/**
 * @file reboot.js
 * @author Alex Shpak
 * @description This file includes a reboot model used by sequalize for ORM;
 */
import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const Reboot = sequelize.define('reboot', {
    reboot: {type: Sequelize.BOOLEAN, field: 'reboot'},
}, {
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
});

export default Reboot;
