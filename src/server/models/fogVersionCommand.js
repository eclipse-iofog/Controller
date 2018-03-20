/**
 * @file fogVersionCommand.js
 * @author Maksim Chepelev
 * @description This file includes a iofog_version_commands model used by sequalize for ORM;
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';
import Fog from "./fog";
import FogProvisionKey from "./fogProvisionKey";

const FogVersionCommand = sequelize.define('iofog_version_commands', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, field: 'ID'},
    versionCommand: {type: Sequelize.STRING(100), field: 'version_command'},
}, {
    // don't add the timestamp attributes (updatedAt, createdAt)
    timestamps: false,
    // disable the modification of table names
    freezeTableName: true,
    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true
});

FogVersionCommand.belongsTo(Fog, {
    foreignKey: 'iofog_uuid'
});

export default FogVersionCommand;