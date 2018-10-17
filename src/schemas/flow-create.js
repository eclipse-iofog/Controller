const flowCreate = {
  "id": "/flowCreate",
  "type": "object",
  "properties": {
     "name": {"type": "string", "minLength": 1},
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