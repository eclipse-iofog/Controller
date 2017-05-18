import GeneratedIds from './../models/generatedIds';
import BaseManager from './baseManager';

class GeneratedIdsManager extends BaseManager {
	getEntity() {
		return GeneratedIds;
	}
	getGeneratedIdsByBBIDAndActivated(bbid) {
		return GeneratedIds.find({
			where: {
				bbid: bbid,
				activated: 0
			}
		});
	}

	updateGeneratedIdsByBBID(bbid, updatedObj){
		return GeneratedIds.update(updatedObj, {
			where: {
				bbid: bbid
			}
		});
	}
}

const instance = new GeneratedIdsManager();
export default instance;