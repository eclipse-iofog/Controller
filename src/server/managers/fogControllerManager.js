import FogControllers from './../models/fogControllers';
import BaseManager from './baseManager';

class FogControllerManager extends BaseManager {
	getEntity() {
		return FogControllers;
	}
	getByUUID(uuid) {
		return FogControllers.find({
			where: {
				uuid: uuid
			}
		});
	}
}

const instance = new FogControllerManager();
export default instance;