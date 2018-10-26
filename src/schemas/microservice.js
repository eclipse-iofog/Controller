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
    "ioFogNodeId": {"type": "string"},
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
  "required": ["name"]
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
    "needUpdate" : {"type": "boolean"},
    "rebuild": {"type": "boolean"},
    "ioFogNodeId": {"type": "string"},
    "rootHostAccess": {"type": "boolean"},
    "deleteWithCleanUp": {"type": "boolean"},
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
  }
};

module.exports = {
    mainSchemas: [microserviceCreate, microserviceUpdate, ports, portsCreate],
    innerSchemas: [volumeMappings, ports]
};