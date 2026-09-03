const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DEV_DIR = path.join(ROOT, 'dev')
const CLONE_DIR = path.join(DEV_DIR, 'edgeops-console')
const CONSOLE_DIR = path.join(DEV_DIR, 'console')
const BUILD_OUT = path.join(CONSOLE_DIR, 'build')

const REPO = process.env.EDGEOPS_CONSOLE_REPO || 'https://github.com/Datasance/edgeops-console'
const VERSION = process.env.EDGEOPS_CONSOLE_VERSION || 'v1.0.13'
const FLAVOR = process.env.EDGEOPS_CONSOLE_FLAVOR || 'datasance'

if (!/^https?:\/\/[a-zA-Z0-9.\-/_:@]+$/.test(REPO)) {
  throw new Error(`Invalid EDGEOPS_CONSOLE_REPO value: ${REPO}`)
}
if (!/^v?[\d]+\.[\d]+\.[\d]+([\-+][\w.\-+]*)?$/.test(VERSION)) {
  throw new Error(`Invalid EDGEOPS_CONSOLE_VERSION value: ${VERSION}`)
}

function normalizeTag (version) {
  return version.startsWith('v') ? version : `v${version}`
}

function ensureConsoleSource () {
  const tag = normalizeTag(VERSION)

  if (fs.existsSync(path.join(CLONE_DIR, '.git'))) {
    try {
      const r1 = spawnSync('git', ['fetch', 'origin', '--depth', '1', 'tag', tag], { stdio: 'inherit', cwd: CLONE_DIR })
      if (r1.status !== 0) throw new Error('git fetch failed')
      const r2 = spawnSync('git', ['checkout', tag], { stdio: 'inherit', cwd: CLONE_DIR })
      if (r2.status !== 0) throw new Error('git checkout failed')
      return
    } catch (_) {
      fs.rmSync(CLONE_DIR, { recursive: true, force: true })
    }
  }

  fs.mkdirSync(DEV_DIR, { recursive: true })
  const r3 = spawnSync('git', ['clone', '--depth', '1', '--branch', tag, REPO, CLONE_DIR], { stdio: 'inherit', cwd: ROOT })
  if (r3.status !== 0) throw new Error('git clone failed')
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
  const r4 = spawnSync('npm', ['ci', '--legacy-peer-deps'], { stdio: 'inherit', cwd: CLONE_DIR })
  if (r4.status !== 0) throw new Error('npm ci failed')
  const r5 = spawnSync('sh', ['package.sh'], { stdio: 'inherit', cwd: CLONE_DIR, env: { ...process.env, VITE_DISTRIBUTION: FLAVOR } })
  if (r5.status !== 0) throw new Error('package.sh failed')
  copyBuildOutput()
  console.log(`EdgeOps Console built at ${BUILD_OUT}`)
}

buildConsoleDev()
