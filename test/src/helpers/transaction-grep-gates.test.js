'use strict'

const { expect } = require('chai')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '../../..')

function grepSrc (pattern, extraArgs = [], searchPath = 'src/') {
  try {
    return execFileSync('grep', [
      '-R',
      '-n',
      '--include=*.js',
      ...extraArgs,
      pattern,
      searchPath
    ], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
  } catch (error) {
    if (error.status === 1) {
      return ''
    }
    throw error
  }
}

/**
 * Plan 19-I-C: K8s I/O must run outside runInTransaction callback bodies.
 * Allowed external helpers (called after tx commit / between phases):
 *   nats-service: _applyEnsureNatsK8sExternal, _patchK8sHubConfigMapClusterRoutesExternal,
 *                 _patchK8sJwtBundleExternal
 *   service-platform-service: applyK8sHubRouterPlan, reconcileK8sServiceExternal,
 *                             watchLoadBalancerWithTimeout, ServicesService._syncK8sServiceResource
 */
function assertNoK8sClientInLabeledTxBlocks (source, labels) {
  for (const label of labels) {
    const labelToken = `label: '${label}'`
    const labelIdx = source.indexOf(labelToken)
    expect(labelIdx, `expected runInTransaction block with label ${label}`).to.be.greaterThan(-1)
    const txStart = source.lastIndexOf('runInTransaction', labelIdx)
    expect(txStart, `expected runInTransaction before label ${label}`).to.be.greaterThan(-1)
    const block = source.slice(txStart, labelIdx + labelToken.length)
    expect(block).to.not.match(/K8sClient\./, `K8sClient must not appear inside tx block ${label}`)
  }
}

describe('grep gates', () => {
  it('has zero fakeTransaction hits in src/', () => {
    expect(grepSrc('fakeTransaction')).to.equal('')
  })

  it('has zero bypassQueue hits in src/', () => {
    expect(grepSrc('bypassQueue')).to.equal('')
  })

  it('has zero runInTransaction hits in src/data/managers/', () => {
    expect(grepSrc('runInTransaction', [], 'src/data/managers/')).to.equal('')
  })

  it('allows sequelize.transaction only in transaction-runner.js', () => {
    const hits = grepSrc('sequelize\\.transaction', ['--exclude=transaction-runner.js'])
    expect(hits).to.equal('')
  })

  it('passes transaction to SecretService reads inside certificate-service.js', () => {
    const hits = grepSrc('SecretService\\.getSecretEndpoint\\([^,)]+\\)', [
      '--include=certificate-service.js'
    ], 'src/services')
    expect(hits).to.equal('')
  })

  it('routes fog-token cleanup through runInTransaction', () => {
    const jobSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/jobs/fog-token-cleanup-job.js'),
      'utf8'
    )
    expect(jobSource).to.include('runInTransaction')
    expect(jobSource).to.not.match(/FogUsedTokenManager\.cleanupExpiredJtis\(\)/)
  })

  it('threads transaction through cert.js CA load paths without bare nested enqueue', () => {
    const certSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/utils/cert.js'),
      'utf8'
    )
    expect(certSource).to.match(/async function loadCA \(name, transaction\)/)
    expect(certSource).to.match(/async function getCAFromK8sSecret \(secretName, transaction\)/)
    expect(certSource).to.match(/async function getCAFromInput \(ca, transaction\)/)
    expect(certSource).to.match(/getCAFromInput\(ca, transaction\)/)
    expect(certSource).to.match(/loadCA\(ca\.secretName, transaction\)/)
    expect(certSource).to.match(/getCAFromK8sSecret\(ca\.secretName, transaction\)/)
    expect(certSource).to.match(/await storeCA\(\{ cert, key \}, secretName, transaction\)/)
    expect(certSource).to.not.match(/await loadCA\(ca\.secretName\)\s/)
    expect(certSource).to.not.match(/await getCAFromK8sSecret\(ca\.secretName\)\s/)
    // Branch on caller transaction before enqueueing nested runInTransaction (R126–R128)
    expect(certSource).to.match(/async function loadCA[\s\S]*?const secret = transaction[\s\S]*?\? await SecretManager\.getSecret\(name, transaction\)[\s\S]*?: await runInTransaction/)
    expect(certSource).to.match(/async function getCAFromK8sSecret[\s\S]*?const localSecret = transaction[\s\S]*?\? await SecretManager\.findOne\(\{ name: secretName \}, transaction\)[\s\S]*?: await runInTransaction/)
    expect(certSource).to.match(/async function getCAFromK8sSecret[\s\S]*?if \(transaction\) \{[\s\S]*?await CertificateManager\.createCertificateRecord\(caRecord, transaction\)[\s\S]*?\} else \{[\s\S]*?await runInTransaction/)
  })

  it('passes transaction to cert util calls inside certificate-service createCAEndpoint', () => {
    const serviceSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/services/certificate-service.js'),
      'utf8'
    )
    expect(serviceSource).to.match(/getCAFromK8sSecret\(caData\.secretName, transaction\)/)
    expect(serviceSource).to.match(/loadCA\(caData\.secretName, transaction\)/)
  })

  it('keeps K8sClient calls out of nats-service DB transaction bodies', () => {
    const natsSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/services/nats-service.js'),
      'utf8'
    )
    expect(natsSource).to.match(/async function ensureNatsForFogDb/)
    expect(natsSource).to.match(/async function ensureNatsForFogAuthPrepDb/)
    expect(natsSource).to.match(/async function ensureNatsForFogTopologyDb/)
    expect(natsSource).to.match(/async function ensureNatsForFogDbMutation/)
    expect(natsSource).to.match(/label: 'nats\.ensure\.certPrep'/)
    expect(natsSource).to.match(/label: 'nats\.ensure\.authPrep'/)
    expect(natsSource).to.match(/label: 'nats\.ensure\.topology'/)
    expect(natsSource).to.match(/async function cleanupNatsForFogDb/)
    expect(natsSource).to.match(/async function _reconcileResolverArtifactsOnceDb/)
    expect(natsSource).to.match(/_patchK8sHubConfigMapClusterRoutesExternal/)
    expect(natsSource).to.match(/_patchK8sJwtBundleExternal/)
    expect(natsSource).to.not.match(/ensureNatsForFogAuthPrepDb[\s\S]*?K8sClient\./)
    expect(natsSource).to.not.match(/ensureNatsForFogTopologyDb[\s\S]*?K8sClient\./)
    expect(natsSource).to.not.match(/ensureNatsForFogDbMutation[\s\S]*?K8sClient\./)
    expect(natsSource).to.not.match(/ensureNatsForFogDb[\s\S]*?K8sClient\./)
    expect(natsSource).to.not.match(/cleanupNatsForFogDb[\s\S]*?K8sClient\./)
    expect(natsSource).to.not.match(/_reconcileResolverArtifactsOnceDb[\s\S]*?K8sClient\./)
  })

  it('keeps K8sClient calls out of service-platform-service DB transaction bodies', () => {
    const platformSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/services/service-platform-service.js'),
      'utf8'
    )
    expect(platformSource).to.match(/async function reconcileK8sServiceExternal/)
    expect(platformSource).to.match(/async function applyK8sHubRouterPlan/)
    assertNoK8sClientInLabeledTxBlocks(platformSource, [
      'servicePlatform.hubLockAcquire',
      'servicePlatform.hubLockRelease',
      'servicePlatform.k8sLoadBalancerEndpoint',
      'servicePlatform.prepare',
      'servicePlatform.hubReconcile',
      'servicePlatform.hubDb',
      'servicePlatform.finalize'
    ])
  })

  it('passes Sequelize transaction inside options for volume-mount association calls', () => {
    const volumeMountSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/services/volume-mount-service.js'),
      'utf8'
    )
    expect(volumeMountSource).to.match(/getFogs\(\{ transaction \}\)/)
    expect(volumeMountSource).to.match(/addVolumeMount\(volumeMount, \{ transaction \}\)/)
    expect(volumeMountSource).to.match(/removeVolumeMount\(volumeMount, \{ transaction \}\)/)
    expect(volumeMountSource).to.not.match(/getFogs\(\{\}, transaction\)/)
    expect(volumeMountSource).to.not.match(/addVolumeMount\(volumeMount\.uuid, transaction\)/)
    expect(volumeMountSource).to.not.match(/removeVolumeMount\(volumeMount\.uuid, transaction\)/)
  })

  it('keeps vault HTTP out of secret/configmap/registry transaction bodies', () => {
    const secretSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/services/secret-service.js'),
      'utf8'
    )
    expect(secretSource).to.include('scheduleVaultDeleteAfterCommit')
    expect(secretSource).to.not.match(/deleteSecretEndpoint[\s\S]*?SecretHelper\.deleteSecret/)

    const configMapManagerSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/data/managers/config-map-manager.js'),
      'utf8'
    )
    expect(configMapManagerSource).to.include('scheduleVaultDeleteAfterCommit')
    expect(configMapManagerSource).to.not.match(/deleteConfigMap[\s\S]*?SecretHelper\.deleteSecret/)

    const registryServiceSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/services/registry-service.js'),
      'utf8'
    )
    expect(registryServiceSource).to.include('scheduleVaultPromoteAfterCommit')
    expect(registryServiceSource).to.include('scheduleVaultDeleteAfterCommit')
    expect(registryServiceSource).to.not.match(/createRegistry[\s\S]*?SecretHelper\.encryptSecret\(/)
  })

  it('splits fog platform reconcile into phased runInTransaction labels', () => {
    const fogSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/services/fog-platform-service.js'),
      'utf8'
    )
    expect(fogSource).to.match(/label: 'fogPlatform\.prepare'/)
    expect(fogSource).to.match(/label: 'fogPlatform\.certPrep'/)
    expect(fogSource).to.match(/ensureNatsForFogPhased/)
    expect(fogSource).to.match(/label: 'fogPlatform\.platform'/)
    expect(fogSource).to.match(/label: 'fogPlatform\.finalize'/)
    expect(fogSource).to.not.match(/label: 'fogPlatform\.natsEnsure'/)
    expect(fogSource).to.not.match(/reconcileFog: TransactionDecorator\.generateTransaction/)
  })

  it('passes transaction inside Sequelize options in nats-instance-manager.js', () => {
    const source = fs.readFileSync(
      path.join(REPO_ROOT, 'src/data/managers/nats-instance-manager.js'),
      'utf8'
    )
    expect(source).to.not.match(/findOne\(\{ where: \{ iofogUuid \} \}, \{ transaction \}\)/)
    expect(source).to.match(/transaction\s*\n\s*\}\)/)
  })

  it('does not export dead K8s-in-tx TCP bridge helpers from services-service.js', () => {
    const servicesSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/services/services-service.js'),
      'utf8'
    )
    expect(servicesSource).to.not.match(/function _addTcpConnector/)
    expect(servicesSource).to.not.match(/function _addTcpListener/)
    expect(servicesSource).to.not.match(/function _updateTcpConnector/)
    expect(servicesSource).to.not.match(/function _deleteTcpConnector/)
    expect(servicesSource).to.not.match(/function _deleteTcpListener/)
    expect(servicesSource).to.not.match(/_addTcpConnector,/)
  })

  it('routes OIDC provider adapter through runInTransaction', () => {
    const adapterSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/data/adapters/oidc-provider-adapter.js'),
      'utf8'
    )
    expect(adapterSource).to.include('runInTransaction')
    expect(adapterSource).to.match(/label: 'oidc\.adapter\.upsert'/)
    expect(adapterSource).to.match(/\{\s*transaction,/)
  })

  it('passes transaction inside Sequelize options in volume-mounting-manager.js', () => {
    const source = fs.readFileSync(
      path.join(REPO_ROOT, 'src/data/managers/volume-mounting-manager.js'),
      'utf8'
    )
    expect(source).to.not.match(/findOne\(\{[\s\S]*?\}, \{ transaction \}\)/)
    expect(source).to.not.match(/findAll\(\{[\s\S]*?\}, \{ transaction \}\)/)
  })
})
