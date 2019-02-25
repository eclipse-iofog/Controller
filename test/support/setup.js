const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const chaiHttp = require('chai-http')
const sinonChai = require('sinon-chai')

process.env.NODE_ENV = 'test'
process.on('unhandledRejection', () => {})
process.on('rejectionHandled', () => {})

MAIN: {
  chai.should()
  chai.use(chaiAsPromised)
  chai.use(chaiHttp)
  chai.use(sinonChai)
}
