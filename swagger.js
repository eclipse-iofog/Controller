// swagger.js
const swaggerJsDoc = require('swagger-jsdoc')

// Import all schemas
const schemas = require('./src/schemas')

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Eclipse ioFog Controller REST API Documentation',
      version: '3.8.0',
      description: 'A cloud-native operations controller for managing edge computing workloads, edgelet nodes, and deployments across Eclipse IoFog and Datasance PoT.'
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
      schemas
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
