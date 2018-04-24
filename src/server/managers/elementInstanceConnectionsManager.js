import BaseManager from './../managers/baseManager';
import ElementInstanceConnections from './../models/elementInstanceConnections';

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
  
  deleteBySourceAndDestinationElementInstance(sourceElementInstanceId, destinationElementInstanceId) {
    return ElementInstanceConnections.destroy({
      where: {
          sourceElementInstance: sourceElementInstanceId,
          destinationElementInstance: destinationElementInstanceId
      }
    });
  }
}

const instance = new ElementInstanceConnectionsManager();
export default instance;
