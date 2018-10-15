const microservice = {
    "id": "/microservice",
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "confog": {"type": "string"},
        "catalogItemId": {"type": "string"},
        "flowId": {"type": "integer"},
        "ioFogNodeId": {"type": "integer"},
        "volumeMappings": {"type": "string"},
        "rootHostAccess": {"type": "boolean"},
        "strace": {"type": "boolean"},
        "logLimit": {"type": "integer"},
        "ports": {
            "type": "array",
            "items": {"$ref": "/ports"}},
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