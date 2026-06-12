const { start } = require('./start')
const { startDev } = require('./start-dev')
const { init } = require('./init')
const { preuninstall } = require('./preuninstall')
const { postinstall } = require('./postinstall')

switch (process.argv[2]) {
  case 'start':
    start()
    break
  case 'start-dev':
    startDev()
    break
  case 'init':
    init()
    break
  case 'preuninstall':
    preuninstall()
    break
  case 'postinstall':
    postinstall()
    break
  default:
    console.log('no script for this command')
    break
}
