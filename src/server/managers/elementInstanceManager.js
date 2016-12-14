/**
 * @file elementInstanceManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the elementInstance Model.
 */

import BaseManager from './../managers/baseManager';
import Element from './../models/element';
import ElementInstance from './../models/elementInstance';
import DataTracks from './../models/dataTracks';
import sequelize from './../utils/sequelize';
import AppUtils from '../utils/appUtils';

class ElementInstanceManager extends BaseManager {

	getEntity() {
		return ElementInstance;
	}

	/**
	 * @desc - updates the elementInstance which has the coresponding uuid
	 * @param Integer, JSON object - uuid, data
	 * @return Integer - returns the number of rows updated
	 */
	updateByUUID(uuid, data) {
			return ElementInstance.update(data, {
				where: {
					uuid: uuid
				}
			});
		}
		/**
		 * @desc - uses a raw-query to join element_instance and data_tracks
		 * @param Integer - instanceId
		 * @return JSON - returns a Array of JSON objects with elementInstance and its related dataTracks
		 */
	findByInstanceId(instanceId) {
		var instanceConfigQuery = "SELECT i.*, t.is_activated FROM element_instance i LEFT JOIN data_tracks t ON (i.track_id = t.ID) WHERE i.iofabric_uuid = " + instanceId + " AND (i.track_id = 0 OR t.is_activated = 1)";
		return sequelize.query(instanceConfigQuery);
	}

	findByUuId(uuid) {
		return ElementInstance.find({
			where: {
				uuid: uuid
			}
		});
	}

	findByTrackId(trackId) {
		return ElementInstance.findAll({
			where: {
				trackId: trackId
			}
		});
	}

	createElementInstance(element) {
		return ElementInstance.create(element);
	}

	createElementInstance(element, userId, trackId, config, elementName, logSize, fogInstanceId) {
		var elementInstance = {
			uuid: AppUtils.generateInstanceId(32),
			trackId: trackId,
			element_key: element.id,
			config: config,
			name: elementName,
			last_updated: new Date().getTime(),
			updatedBy: userId,
			configLastUpdated: new Date().getTime(),
			isStreamViewer: false,
			isDebugConsole: false,
			isManager: false,
			isNetwork: false,
			registryId: element.registry_id,
			rebuild: false,
			RootHostAccess: false,
			logSize: logSize,
			iofabric_uuid: fogInstanceId
		};

		return ElementInstance.create(elementInstance);
	}

	createStreamViewerInstance(streamViewerElementKey, userId, fabricInstanceId) {
		var elementInstance = {
			uuid: AppUtils.generateInstanceId(32),
			trackId: 0,
			elementKey: streamViewerElementKey,
			config: '{"accesstoken":"' + AppUtils.generateInstanceId(32) + '","foldersizelimit":200.0}',
			name: 'Stream Viewer',
			last_updated: new Date().getTime(),
			updatedBy: userId,
			configLastUpdated: new Date().getTime(),
			isStreamViewer: true,
			isDebugConsole: false,
			isManager: false,
			isNetwork: false,
			registryId: null,
			rebuild: false,
			RootHostAccess: false,
			logSize: 50,
			iofabric_uuid: fabricInstanceId
		};

		return ElementInstance.create(elementInstance);
	}

	createNetworkInstance(element, userId, fabricInstanceId, satelliteDomain, satellitePort1, name, localPort, isPublic, trackId) {
		var netConfig = {
				'mode': isPublic ? 'public' : 'private',
				'host': satelliteDomain,
				'port': satellitePort1,
				'connectioncount': 60,
				'passcode': AppUtils.generateRandomString(32),
				'localhost': 'iofabric',
				'localport': localPort,
				'heartbeatfrequency': 20000,
				'heartbeatabsencethreshold': 60000
			},
			elementInstance = {
				uuid: AppUtils.generateInstanceId(32),
				trackId: trackId,
				elementKey: element.id,
				config: JSON.stringify(netConfig),
				name: name,
				last_updated: new Date().getTime(),
				updatedBy: userId,
				configLastUpdated: new Date().getTime(),
				isStreamViewer: false,
				isDebugConsole: false,
				isManager: false,
				isNetwork: true,
				registryId: element.registry_id,
				rebuild: false,
				RootHostAccess: false,
				logSize: 50,
				iofabric_uuid: fabricInstanceId
			};

		return ElementInstance.create(elementInstance);
	}

	createDebugConsoleInstance(consoleElementKey, userId, fabricInstanceId) {
		var config = {
				'accesstoken': AppUtils.generateRandomString(32),
				'filesizelimit': 200.0
			},
			elementInstance = {
				uuid: AppUtils.generateInstanceId(32),
				trackId: 0,
				elementKey: consoleElementKey,
				config: JSON.stringify(config),
				name: 'Debug Console',
				last_updated: new Date().getTime(),
				updatedBy: userId,
				configLastUpdated: new Date().getTime(),
				isStreamViewer: false,
				isDebugConsole: true,
				isManager: false,
				isNetwork: false,
				registryId: null,
				rebuild: false,
				RootHostAccess: false,
				logSize: 50,
				iofabric_uuid: fabricInstanceId
			};

		return ElementInstance.create(elementInstance);
	}

	deleteNetworkElement(elementId) {
		var deleteQuery = ' \
			DELETE FROM element_instance \
			WHERE UUID IN( \
				SELECT networkElementId1 \
				FROM network_pairing \
				WHERE elementId1 = "' + elementId + '" \
			) \
			OR UUID IN( \
				SELECT networkElementId2 \
				FROM network_pairing \
				WHERE elementId1 = "' + elementId + '" \
			) \
		';

		return sequelize.query(deleteQuery);
	}

	deleteByElementUUID(instanceId) {
		return ElementInstance.destroy({
			where: {
				uuid: instanceId
			}
		});
	}

	findRealElementInstanceByTrackId(trackId) {
		return ElementInstance.findAll({
			where: {
				trackId: trackId,
				isStreamViewer: false,
				isDebugConsole: false,
				isManager: false,
				isNetwork: false
			},

			include: [{
				model: Element,  as: 'element',
				attributes: ['id', 'name', 'category', 'containerImage', 'publisher']
			}]
		});
	}

	findByUuids(uuids) {
		return ElementInstance.findAll({
			where: {
				uuid:  uuids	
			}
		});
	}

	findIntraTrackByUuids(uuids) {
		const query = 'select DISTINCT(ei.uuid) as elementid, ei.name as elementname, e.name elementtypename from element_instance ' +
			' ei join element e on e.id = ei.element_key where ei.uuid in (:uuids)';
		return sequelize.query(query, {
			replacements: {
				uuids: uuids
			},
			type: sequelize.QueryTypes.SELECT
		});
	}

	findExtraTrackByUuids(uuids) {
		const query = 'select DISTINCT(ei.uuid) as elementid, ei.name as elementname, e.name elementtypename, ei.track_id as trackid, t.name as trackname ' +
			' from element_instance ei join element e on e.id = ei.element_key join data_tracks t on t.id = ei.track_id where ei.uuid in (:uuids)';
		return sequelize.query(query, {
			replacements: {
				uuids: uuids
			},
			type: sequelize.QueryTypes.SELECT
		});
	}

	findOtherTrackDetailByUuids(uuids) {
		const query = 'select DISTINCT(ei.uuid) as elementid, ei.name as elementname, e.name elementtypename, ei.track_id as trackid, t.name as trackname, ' +
			' ei.iofabric_uuid as instanceId, f.name as instanceName from element_instance ei join element e on e.id = ei.element_key join data_tracks t ' +
			' on t.id = ei.track_id  join iofabrics f on ei.iofabric_uuid = f.uuid where ei.UUID in (:uuids)';
		return sequelize.query(query, {
			replacements: {
				uuids: uuids
			},
			type: sequelize.QueryTypes.SELECT
		});
	}
}

const instance = new ElementInstanceManager();
export default instance;