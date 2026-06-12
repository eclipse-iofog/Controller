const { test } = require('./test')
const { cliTest } = require('./cli-tests')
const { coverage } = require('./coverage')

async function main () {
  switch (process.argv[2]) {
    case 'test': {
      const useReporter = process.argv[3] === 'junit'
      const extraArgs = process.argv.slice(useReporter ? 4 : 3).filter(Boolean)
      test(useReporter, extraArgs)
      break
    }
    case 'cli-tests':
      await cliTest()
      break
    case 'test-all': {
      const useReporter = process.argv[3] === 'junit'
      const extraArgs = process.argv.slice(useReporter ? 4 : 3).filter(Boolean)
      test(useReporter, extraArgs)
      await cliTest()
      break
    }
    case 'coverage':
      coverage()
      break
    default:
      console.log('no script for this command')
      process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
