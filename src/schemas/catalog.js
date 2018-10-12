const catalogItemCreate = {
  "id": "/catalogItemCreate",
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "description": {"type": "string"},
    "category": {"type": "string"},
    "publisher": {"type": "string"},
    "diskRequired": {"type": "integer"},
    "ramRequired": {"type": "integer"},
    "picture": {"type": "string"},
    "isPublic": {"type": "boolean"},
    "registryId": {"type": "integer"},
    "configExample": {"type": "string"},
    "images": {
      "type": "array",
      "maxItems": 2,
      "items": {"$ref": "/image"}
    },
    "inputType": {"$ref": "/type"},
    "outputType": {"$ref": "/type"}
  },
  "required": ["name"]
};

const catalogItemUpdate = {
  "id": "/catalogItemUpdate",
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "description": {"type": "string"},
    "category": {"type": "string"},
    "publisher": {"type": "string"},
    "diskRequired": {"type": "integer"},
    "ramRequired": {"type": "integer"},
    "picture": {"type": "string"},
    "isPublic": {"type": "boolean"},
    "configExample": {"type": "string"},
    "images": {
      "type": "array",
      "maxItems": 2,
      "items": {"$ref": "/image"}
    },
    "inputType": {"$ref": "/type"},
    "outputType": {"$ref": "/type"}
  }
};

const image = {
  "id": "/image",
  "type": "object",
  "properties": {
    "containerImage": {"type": "string"},
    "fogTypeId":
      {
        "type": "integer",
        "minimum": 0,
        "maximum": 2
      }
  },
  "required": ["containerImage", "fogTypeId"]
};

const type = {
  "id": "/type",
  "type": "object",
  "properties": {
    "infoType": {"type": "string"},
    "infoFormat": {"type": "string"}
  },
  "required": ["infoType", "infoFormat"]
};

module.exports = {
  mainSchemas: [catalogItemCreate, catalogItemUpdate],
  innerSchemas: [image, type]
};