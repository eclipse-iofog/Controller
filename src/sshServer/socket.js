// socket.js
const logger = require('../server/utils/winstonLogs');

const debugWebSSH2 = (text) => logger.info('WebSSH2: ' + text);
const SSH = require('ssh2').Client
var termCols, termRows

// public
const socket = function (socket) {
  // if websocket connection arrives without an express session, kill it
  if (!socket.handshake.session) {
    socket.emit('401 UNAUTHORIZED')
    debugWebSSH2('SOCKET: No Express Session / REJECTED')
    socket.disconnect(true)
    return
  }
  var conn = new SSH()
  socket.on('geometry', function socketOnGeometry (cols, rows) {
    termCols = cols
    termRows = rows
  })
  conn.on('banner', function connOnBanner (data) {
    // need to convert to cr/lf for proper formatting
    data = data.replace(/\r?\n/g, '\r\n')
    socket.emit('data', data.toString('utf-8'))
  })

  conn.on('ready', function connOnReady () {
    console.log('WebSSH2 Login: user=' + socket.handshake.session.username + ' from=' + socket.handshake.address + ' host=' + socket.handshake.session.ssh.host + ' port=' + socket.handshake.session.ssh.port + ' sessionID=' + socket.handshake.sessionID + '/' + socket.id + ' mrhsession=' + socket.handshake.session.ssh.mrhsession + ' allowreplay=' + socket.handshake.session.ssh.allowreplay + ' term=' + socket.handshake.session.ssh.term)
    socket.emit('setTerminalOpts', socket.handshake.session.ssh.terminal)
    socket.emit('title', 'ssh://' + socket.handshake.session.ssh.host)
    if (socket.handshake.session.ssh.header.background) socket.emit('headerBackground', socket.handshake.session.ssh.header.background)
    if (socket.handshake.session.ssh.header.name) socket.emit('header', socket.handshake.session.ssh.header.name)
    socket.emit('footer', 'ssh://' + socket.handshake.session.username + '@' + socket.handshake.session.ssh.host + ':' + socket.handshake.session.ssh.port)
    socket.emit('status', 'SSH CONNECTION ESTABLISHED')
    socket.emit('statusBackground', 'green')
    conn.shell({
      term: socket.handshake.session.ssh.term,
      cols: termCols,
      rows: termRows
    }, function connShell (err, stream) {
      if (err) {
        SSHerror('EXEC ERROR' + err)
        conn.end()
        return
      }
      socket.on('data', function socketOnData (data) {
        stream.write(data)
      })
      socket.on('resize', function socketOnResize (data) {
        stream.setWindow(data.rows, data.cols)
      })
      socket.on('disconnecting', function socketOnDisconnecting (reason) { debugWebSSH2('SOCKET DISCONNECTING: ' + reason) })
      socket.on('disconnect', function socketOnDisconnect (reason) {
        debugWebSSH2('SOCKET DISCONNECT: ' + reason)
        err = { message: reason }
        SSHerror('CLIENT SOCKET DISCONNECT', err)
        conn.end()
        // socket.handshake.session.destroy()
      })
      socket.on('error', function socketOnError (err) {
        SSHerror('SOCKET ERROR', err)
        conn.end()
      })

      stream.on('data', function streamOnData (data) { socket.emit('data', data.toString('utf-8')) })
      stream.on('close', function streamOnClose (code, signal) {
        err = { message: ((code || signal) ? (((code) ? 'CODE: ' + code : '') + ((code && signal) ? ' ' : '') + ((signal) ? 'SIGNAL: ' + signal : '')) : undefined) }
        SSHerror('STREAM CLOSE', err)
        conn.end()
      })
      stream.stderr.on('data', function streamStderrOnData (data) {
        console.log('STDERR: ' + data)
      })
    })
  })

  conn.on('end', function connOnEnd (err) { SSHerror('CONN END BY HOST', err) })
  conn.on('close', function connOnClose (err) { SSHerror('CONN CLOSE', err) })
  conn.on('error', function connOnError (err) { SSHerror('CONN ERROR', err) })
  conn.on('keyboard-interactive', function connOnKeyboardInteractive (name, instructions, instructionsLang, prompts, finish) {
    debugWebSSH2('conn.on(\'keyboard-interactive\')')
    finish([socket.handshake.session.userpassword])
  })
  if (socket.handshake.session.username && socket.handshake.session.userpassword && socket.handshake.session.ssh) {
    // console.log('hostkeys: ' + hostkeys[0].[0])
    conn.connect({
      host: socket.handshake.session.ssh.host,
      port: socket.handshake.session.ssh.port,
      username: socket.handshake.session.username,
      password: socket.handshake.session.userpassword,
      tryKeyboard: true,
      algorithms: socket.handshake.session.ssh.algorithms,
      readyTimeout: socket.handshake.session.ssh.readyTimeout,
      keepaliveInterval: socket.handshake.session.ssh.keepaliveInterval,
      keepaliveCountMax: socket.handshake.session.ssh.keepaliveCountMax,
      debug: (text) => logger.debug("ssh2: " + text)
    })
  } else {
    debugWebSSH2('Attempt to connect without session.username/password or session varialbles defined, potentially previously abandoned client session. disconnecting websocket client.\r\nHandshake information: \r\n  ' + JSON.stringify(socket.handshake))
    socket.emit('ssherror', 'WEBSOCKET ERROR - Refresh the browser and try again')
    socket.handshake.session.destroy()
    socket.disconnect(true)
  }

  /**
  * Error handling for various events. Outputs error to client, logs to
  * server, destroys session and disconnects socket.
  * @param {string} myFunc Function calling this function
  * @param {object} err    error object or error message
  */
  function SSHerror (myFunc, err) {
    var theError
    if (socket.handshake.session) {
      // we just want the first error of the session to pass to the client
      socket.handshake.session.error = (socket.handshake.session.error) || ((err) ? err.message : undefined)
      theError = (socket.handshake.session.error) ? ': ' + socket.handshake.session.error : ''
      // log unsuccessful login attempt
      if (err && (err.level === 'client-authentication')) {
        console.log('WebSSH2 ' + 'error: Authentication failure' +
          ' user=' + socket.handshake.session.username +
          ' from=' + socket.handshake.address)
	      theError = ': invalid credentials'
          socket.handshake.session.isLastLoginUnsuccessful = true;
          socket.handshake.session.save();
      } else {
        console.log('WebSSH2 Logout: user=' + socket.handshake.session.username + ' from=' + socket.handshake.address
            + ' host=' + socket.handshake.session.ssh.host + ' port=' + socket.handshake.session.ssh.port
            + ' sessionID=' + socket.handshake.sessionID + '/' + socket.id + ' term=' + socket.handshake.session.ssh.term)
        if (err) {
          theError = (err) ? ': ' + err.message : ''
          console.log('WebSSH2 error' + theError)
        }
      }
      socket.emit('ssherror', 'SSH ' + myFunc + theError)
      // socket.handshake.session.destroy()
      socket.disconnect(true)
    } else {
      theError = (err) ? ': ' + err.message : ''
      socket.disconnect(true)
    }
    debugWebSSH2('SSHerror ' + myFunc + theError)
  }
}

module.exports = {
  socket: socket
}
