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
    strace: {
        type: Sequelize.BOOLEAN,
        field: 'strace'
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