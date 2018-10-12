const flow = {
  "id": "/flow",
  "type": "object",
  "properties": {
     "name": {"type": "string", "required": true},
     "description": {"type": "string"},
     "isActive": {"type": "boolean"},
     "isSelected": {"type": "boolean"}
  },
  "required": ["name"]
};


module.exports = {
  mainSchemas: [flow],
    innerSchemas: []
};