const microserviceCreate = {
  "id": "/microserviceCreate",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1
    },
    "config": {"type": "string"},
    "catalogItemId": {"type": "integer"},
    "flowId": {"type": "integer"},
    "iofogUuid": {"type": "string"},
    "rootHostAccess": {"type": "boolean"},
    "logSize": {"type": "integer"},
    "imageSnapshot": {"type": "string"},
    "volumeMappings": {
      "type": "array",
      "items": {"$ref": "/volumeMappings"}},
    "ports": {
      "type": "array",
      "items": {"$ref": "/ports"}},
    "routes": {
       "type": "array",
       "items": {"type": "string"}}
    },
  "required": ["name", "flowId", "catalogItemId"]
};

const microserviceUpdate = {
  "id": "/microserviceUpdate",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1
    },
    "config": {"type": "string"},
    "rebuild": {"type": "boolean"},
    "iofogUuid": {"type": "string"},
    "rootHostAccess": {"type": "boolean"},
    "logSize": {"type": "integer", "minimum" : 0},
    "volumeMappings": {
      "type": "array",
      "items": {"$ref": "/volumeMappings"}
    }
  }
};

const ports = {
  "id": "/ports",
  "type": "object",
  "properties": {
    "internal": {"type": "integer"},
    "external": {"type": "integer"},
    "publicMode": {"enum": [false]}
  },
  "required": ["internal", "external"]
};

const portsCreate = {
  "id": "/portsCreate",
  "type": "object",
  "properties": {
    "internal": {"type": "integer"},
    "external": {"type": "integer"},
    "publicMode": {"type": "boolean"}
  },
  "required": ["internal", "external"]
};

const volumeMappings = {
  "id": "/volumeMappings",
  "type": "object",
  "properties": {
    "hostDestination": {"type": "string"},
    "containerDestination": {"type": "string"},
    "accessMode": {"type": "string"}
  },
  "required": ["hostDestination", "containerDestination", "accessMode"]
};

module.exports = {
    mainSchemas: [microserviceCreate, microserviceUpdate, ports, portsCreate],
    innerSchemas: [volumeMappings, ports]
};