import BaseManager from './../managers/baseManager';
import ElementInstanceConnections from './../models/elementInstanceConnections';
import sequelize from './../utils/sequelize';

class ElementInstanceConnectionsManager extends BaseManager {

	getEntity() {
		return ElementInstanceConnections;
		}
    
	findBySourceElementInstance(instanceId) {
		return ElementInstanceConnections.findAll({
      where: {
        source_element_instance: instanceId
			}
		});
	}

  findBySourceAndDestinationElementInstance(sourceElementInstanceId, destinationElementInstanceId) {
    return ElementInstanceConnections.findAll({
      where: {
          sourceElementInstance: sourceElementInstanceId,
          destinationElementInstance: destinationElementInstanceId
      }
    });
  }

	deleteElementInstanceConnection(elementId) {
	  return ElementInstanceConnections.destroy({
      where: {
        $or: [{
    			sourceElementInstance: elementId
        }, {
          destinationElementInstance: elementId
        }]
      }
    });
  }
}

const instance = new ElementInstanceConnectionsManager();
export default instance;