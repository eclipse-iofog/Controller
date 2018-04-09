/**
 * @author elukashick
 */

import Sequelize from 'sequelize';
import sequelize from './../utils/sequelize';

const ElementInstanceCleanUp = sequelize.define('element_instance_clean_up', {
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

export default ElementInstanceCleanUp;