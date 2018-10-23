const flowCreate = {
  "id": "/flowCreate",
  "type": "object",
  "properties": {
    "name": {"type": "string", "minLength": 1},
    "description": {"type": "string"},
    "isActivated": {"type": "boolean"}
  },
  "required": ["name"],
  "additionalProperties": false
};

const flowUpdate = {
  "id": "/flowUpdate",
  "type": "object",
  "properties": {
    "name": {"type": "string", "minLength": 1},
    "description": {"type": "string"},
    "isActivated": {"type": "boolean"}
  },
  "additionalProperties": false
};

module.exports = {
  mainSchemas: [flowCreate, flowUpdate],
  innerSchemas: []
};