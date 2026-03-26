// swagger.js
const swaggerJsDoc = require('swagger-jsdoc')

// Import all schemas
const schemas = require('./src/schemas')

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Eclipse ioFog Controller REST API Documentation',
      version: '3.7.0',
      description: 'Eclipse ioFog Controller REST API Documentation'
    },
    servers: [
      {
        url: 'http://localhost:51121/api/v3'
      }
    ],
    components: {
      securitySchemes: {
        authToken: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication (user or agent)'
        }
      },
      schemas: schemas
    },
    security: [
      {
        authToken: []
      }
    ]
  },
  apis: ['./src/routes/*.js']
}

const swaggerDocs = swaggerJsDoc(swaggerOptions)
module.exports = swaggerDocs
