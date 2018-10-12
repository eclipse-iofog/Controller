const flowCreate = {
  "id": "/flowCreate",
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "description": {"type": "string"},
    "isActive": {"type": "boolean"},
    "isSelected": {"type": "boolean"}
  },
  "required": ["name"]
};

module.exports = {
  mainSchemas: [flowCreate],
  innerSchemas: []
};