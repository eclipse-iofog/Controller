const daemonize = require('daemonize2')
const Cli = require('./cli')

function main() {
  const daemon = daemonize.setup({
    main: "server.js",
    name: "fog-controller",
    pidfile: "fog-controller.pid",
    silent: true,
  })

  const cli = new Cli()

  daemon
    .on("starting", () => {
      console.log("Starting fog-controller...")
    })
    .on("stopping", () => {
      console.log("Stopping fog-controller...")
    })
    .on("stopped", (pid) => {
      console.log("fog-controller stopped.")
    })
    .on("running", (pid) => {
      console.log("fog-controller already running. PID: " + pid)
    })
    .on("notrunning", () => {
      console.log("fog-controller is not running")
    })
    .on("error", (err) => {
      console.log("fog-controller failed to start:  " + err.message)
    })

  cli.run(daemon)
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

main()