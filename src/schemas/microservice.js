const microserviceCreate = {
  "id": "/microserviceCreate",
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "config": {"type": "string"},
    "catalogItemId": {"type": "integer"},
    "isNetwork" : {"type": "boolean"},
    "flowId": {"type": "integer"},
    "ioFogNodeId": {"type": "string"},
    "rootHostAccess": {"type": "boolean"},
    "logSize": {"type": "integer"},
    "imageSnapshot": {"type": "string"},
    "volumeMappings": {
      "type": "array",
      "items": {"$ref": "volumeMappings"}},
    "ports": {"$ref": "/ports"},
    "routes": {
       "type": "array",
       "items": {"type": "string"}}
    },
  "required": ["name"]
};

const microserviceUpdate = {
  "id": "/microserviceUpdate",
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "config": {"type": "string"},
    "isNetwork" : {"type": "boolean"},
    "needUpdate" : {"type": "boolean"},
    "rebuild": {"type": "boolean"},
    "ioFogNodeId": {"type": "string"},
    "rootHostAccess": {"type": "boolean"},
    "deleteWithCleanUp": {"type": "boolean"},
    "logSize": {"type": "integer"},
    "imageSnapshot": {"type": "string"},
    "volumeMappings": {
      "type": "array",
      "items": {"$ref": "volumeMappings"}},
    "ports": {"$ref": "/ports"},
    "routes": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
};

const ports = {
  "id": "/ports",
  "type": "object",
  "properties": {
    "internal": {"type": "integer"},
    "external": {"type": "integer"}
  }
};

const volumeMappings = {
  "id": "/volumeMappings",
  "type": "object",
  "properties": {
    "hostDestination": {"type": "string"},
    "containerDestination": {"type": "string"},
    "accessMode": {"type": "string"}
  }
};

module.exports = {
    mainSchemas: [microserviceCreate, microserviceUpdate],
    innerSchemas: [ports, volumeMappings]
};