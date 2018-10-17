const microservice = {
    "id": "/microservice",
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "config": {"type": "string"},
        "catalogItemId": {"type": "integer"},
        "flowId": {"type": "integer"},
        "ioFogNodeId": {"type": "string"},
        "volumeMappings": {"type": "string"},
        "rootHostAccess": {"type": "boolean"},
        "strace": {"type": "boolean"},
        "logLimit": {"type": "integer"},
        "ports": {"$ref": "/ports"},
        "routes": {
            "type": "array",
            "items": {"type": "string"}}
    },
    "required": ["name"]
};

const ports = {
    "id": "/ports",
    "type": "object",
    "properties": {
        "internal": {"type": "integer"},
        "external": {"type": "integer"},
        "tunnel": {"type": "boolean"}
    }
};

module.exports = {
    mainSchemas: [microservice],
    innerSchemas: [ports]
};