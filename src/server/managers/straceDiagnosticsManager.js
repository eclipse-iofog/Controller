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
                    attributes: ['element_instance_uuid', 'straceRun'],
                    where: {
                        element_instance_uuid: data.element_instance_uuid,
                    }
                }
            )
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
                            attributes: ['element_instance_uuid', 'straceRun'],
                            where: {
                                element_instance_uuid: data.element_instance_uuid,
                            }
                        })
            })
    }

    findStraceDiagnosticsByElementId(uuid) {
        return StraceDiagnostics.findOne({
            where: {
                element_instance_uuid: uuid
            }
        });
    }

    findStraceDiagnosticsStateByFogId(fogId) {
        const query = 'SELECT d.element_instance_uuid as elementId, ' +
            'd.straceRun as straceRun ' +
            'FROM strace_diagnostics d ' +
            'LEFT JOIN element_instance i ON d.element_instance_uuid = i.UUID ' +
            'LEFT JOIN iofogs f ON i.iofog_uuid = f.UUID ' +
            'WHERE f.UUID = (:fogId)';

        return sequelize.query(query, {
            replacements: {fogId: fogId},
            type: sequelize.QueryTypes.SELECT
        });
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
        }).then((data) => {
            // Committed
            return data;

        }).catch(err => {
            // Rolled back
            console.error(err);
        });
    }

    pushBufferByElementId(uuid, pushingData) {
        return StraceDiagnostics
            .findOne({
                where: {
                    element_instance_uuid: uuid,
                }
            })
            .then(function (el) {
                    let newBuffer = updateBuffer(el.buffer, pushingData);
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
                element_instance_uuid: uuid
            }
        });
    }

}

/********************************* Extra Functions *****************************************/
const updateBuffer = function (oldBuf, pushingData) {
    let newBuffer = oldBuf + pushingData;
    let delta = newBuffer.length - maxBufferSize;
    if (delta > 0) {
        newBuffer = '[FogController Info] Buffer size is limited, so some of previous data was lost \n'
            + newBuffer.substring(delta);
    }
    return newBuffer;
};

/********************************* Constants *****************************************/

const maxBufferSize = 1e8;

const instance = new StraceDiagnosticsManager();
export default instance;