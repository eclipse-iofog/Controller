import BaseManager from "./baseManager";
import StraceDiagnostics from "../models/straceDiagnostics";
import sequelize from './../utils/sequelize';
import ElementInstance from "../models/elementInstance";
import Fog from "../models/fog";


class StraceDiagnosticsManager extends BaseManager {
    getEntity() {
        return StraceDiagnostics;
    }

    updateOrCreateStraceDiagnostics(data) {
        return StraceDiagnostics
            .findOne(
                {
                    attributes: ['element_instance_uuid', 'strace']
                },
                {
                    where: {
                        element_instance_uuid: data.element_instance_uuid,
                    }
                })
            .then(function (obj) {
                if (obj) { // update
                    return StraceDiagnostics.update(data, {
                        where: {
                            element_instance_uuid: data.element_instance_uuid,
                        },
                        returning: true,
                        plain: true
                    })
                }
                else { // insert
                    return StraceDiagnostics.create(data);
                }
            })
            .then(function () {
                return StraceDiagnostics
                    .findOne(
                        {
                            attributes: ['element_instance_uuid', 'strace']
                        },
                        {
                            where: {
                                element_instance_uuid: data.element_instance_uuid,
                            }
                        })
            })
    }

    findStraceDiagnosticsByElementId(uuid) {
        return StraceDiagnostics.findOne({
            where: {
                'element_instance_uuid': uuid
            }
        });
    }

    findStraceDiagnosticsStateByFogId(fogId) {
        const query = 'SELECT d.element_instance_uuid as elementId, ' +
            'd.strace as strace ' +
            'FROM strace_diagnostics d ' +
            'LEFT JOIN element_instance i ON d.element_instance_uuid = i.UUID ' +
            'LEFT JOIN iofogs f ON i.iofog_uuid = f.UUID ' +
            'WHERE f.UUID = (:fogId)';

        return sequelize.query(query, {
            replacements: {fogId: fogId},
            type: sequelize.QueryTypes.SELECT
        });

        /*return StraceDiagnostics.find(
            {
                attributes: ['element_instance_uuid', 'strace'],
                include: [
                    {model: ElementInstance,
                        through: {
                            where: {UUID: {$col: 'StraceDiagnostics.element_instance_uuid'},
                            include:[{model: Fog, where: {UUID: fogId}}]
                            }
                        }}]

            })*/
    }

    findStraceDiagnosticsAndPopBufferByElementId(uuid) {

        return StraceDiagnostics.sequelize.transaction(transaction => {
            return StraceDiagnostics
                .findOne({
                        where: {
                            element_instance_uuid: uuid
                        }
                    },
                    {transaction}
                )
                .then((data) => {
                    StraceDiagnostics.update({buffer: ''}, {
                            where: {
                                element_instance_uuid: uuid,
                            }
                        },
                        {transaction});
                    return data;
                })
                .then(function (data) {
                    return data
                })
        }).then((data) => {
            // Committed
            return data;

        }).catch(err => {
            // Rolled back
            console.error(err);
        });
    }

    pushBufferByElementId(uuid, buffer) {
        return StraceDiagnostics
            .findOne({
                where: {
                    element_instance_uuid: uuid,
                }
            })
            .then(function (el) {
                    let newBuffer = el.buffer + buffer;
                    return StraceDiagnostics.update({buffer: newBuffer}, {
                        where: {
                            element_instance_uuid: uuid,
                        }
                    })
                }
            )
    }

    deleteStraceDiagnosticsByelementId(uuid) {
        return StraceDiagnostics.destroy({
            where: {
                'element_instance_uuid': uuid
            }
        });
    }

}

const instance = new StraceDiagnosticsManager();
export default instance;