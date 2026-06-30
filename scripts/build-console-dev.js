const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DEV_DIR = path.join(ROOT, 'dev')
const CLONE_DIR = path.join(DEV_DIR, 'edgeops-console')
const CONSOLE_DIR = path.join(DEV_DIR, 'console')
const BUILD_OUT = path.join(CONSOLE_DIR, 'build')

const REPO = process.env.EDGEOPS_CONSOLE_REPO || 'https://github.com/Datasance/edgeops-console'
const VERSION = process.env.EDGEOPS_CONSOLE_VERSION || 'v1.0.5'
const FLAVOR = process.env.EDGEOPS_CONSOLE_FLAVOR || 'datasance'

function normalizeTag (version) {
  return version.startsWith('v') ? version : `v${version}`
}

function run (command, options = {}) {
  execSync(command, {
    stdio: 'inherit',
    cwd: options.cwd || ROOT,
    env: options.env || process.env
  })
}

function ensureConsoleSource () {
  const tag = normalizeTag(VERSION)

  if (fs.existsSync(path.join(CLONE_DIR, '.git'))) {
    try {
      run(`git fetch origin --depth 1 tag ${tag}`, { cwd: CLONE_DIR })
      run(`git checkout ${tag}`, { cwd: CLONE_DIR })
      return
    } catch (_) {
      fs.rmSync(CLONE_DIR, { recursive: true, force: true })
    }
  }

  fs.mkdirSync(DEV_DIR, { recursive: true })
  run(`git clone --depth 1 --branch ${tag} ${REPO} ${CLONE_DIR}`)
}

function copyBuildOutput () {
  const srcBuild = path.join(CLONE_DIR, 'build')
  if (!fs.existsSync(path.join(srcBuild, 'index.html'))) {
    throw new Error('Console build failed: build/index.html missing')
  }
  if (!fs.existsSync(path.join(srcBuild, 'assets'))) {
    throw new Error('Console build failed: build/assets missing')
  }

  fs.rmSync(BUILD_OUT, { recursive: true, force: true })
  fs.mkdirSync(CONSOLE_DIR, { recursive: true })
  fs.cpSync(srcBuild, BUILD_OUT, { recursive: true })
  fs.writeFileSync(path.join(CONSOLE_DIR, 'VERSION'), `${VERSION.replace(/^v/, '')}\n`)
}

function buildConsoleDev () {
  ensureConsoleSource()
  run('npm ci --legacy-peer-deps', { cwd: CLONE_DIR })
  run('sh package.sh', {
    cwd: CLONE_DIR,
    env: { ...process.env, VITE_DISTRIBUTION: FLAVOR }
  })
  copyBuildOutput()
  console.log(`EdgeOps Console built at ${BUILD_OUT}`)
}

buildConsoleDev()
