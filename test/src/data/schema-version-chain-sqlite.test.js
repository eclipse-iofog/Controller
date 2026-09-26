'use strict'

const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const DatabaseProvider = require('../../../src/data/providers/database-provider')

function sqliteGet (db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

function sqliteAll (db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

function sqliteClose (db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function openSqlite (dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err)
      else resolve(db)
    })
  })
}

function cleanupSqlite (dbPath) {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(dbPath + suffix)
    } catch (_) { /* ignore */ }
  }
}

function normalizeDefault (value) {
  if (value == null) {
    return null
  }
  const text = String(value).trim().replace(/^['"]|['"]$/g, '').toLowerCase()
  if (text === 'false' || text === '0') {
    return '0'
  }
  if (text === 'true' || text === '1') {
    return '1'
  }
  return text
}

function normalizeIndexSql (sql) {
  if (!sql) {
    return ''
  }
  return sql
    .replace(/\s+/g, ' ')
    .replace(/IF NOT EXISTS /ig, '')
    .replace(/"/g, '')
    .trim()
    .toLowerCase()
}

async function dumpNormalizedSchema (db) {
  const tables = await sqliteAll(db, `
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'SchemaVersion'
    ORDER BY name
  `)

  const tableDump = []
  for (const { name } of tables) {
    const cols = await sqliteAll(db, `PRAGMA table_info("${name}")`)
    const fks = await sqliteAll(db, `PRAGMA foreign_key_list("${name}")`)
    tableDump.push({
      table: name,
      columns: cols
        .map((col) => ({
          name: col.name,
          type: String(col.type || '').toUpperCase(),
          notnull: col.notnull,
          dflt_value: normalizeDefault(col.dflt_value),
          pk: col.pk
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      foreignKeys: fks
        .map((fk) => ({
          table: fk.table,
          from: fk.from,
          to: fk.to,
          on_delete: String(fk.on_delete || '').toUpperCase()
        }))
        .sort((left, right) => {
          const key = (row) => `${row.table}|${row.from}|${row.to}|${row.on_delete}`
          return key(left).localeCompare(key(right))
        })
    })
  }

  const indexes = await sqliteAll(db, `
    SELECT name, tbl_name, sql FROM sqlite_master
    WHERE type = 'index'
      AND name NOT LIKE 'sqlite_%'
      AND tbl_name != 'SchemaVersion'
    ORDER BY name
  `)

  return JSON.stringify({
    tables: tableDump,
    indexes: indexes.map((index) => ({
      name: index.name,
      table: index.tbl_name,
      sql: normalizeIndexSql(index.sql)
    }))
  }, null, 2)
}

describe('schema version chain (sqlite)', function () {
  this.timeout(60000)

  let dbPath
  const provider = new DatabaseProvider()

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `controller-schema-chain-${Date.now()}-${Math.random()}.sqlite`)
  })

  afterEach(() => {
    cleanupSqlite(dbPath)
  })

  it('fresh install reaches 3.9.0 with Hub registry and system catalog only', async () => {
    await provider.runVersionChainSQLite(dbPath)

    const db = await openSqlite(dbPath)
    try {
      const versions = await sqliteAll(db, 'SELECT migration_version, seeder_version FROM SchemaVersion ORDER BY id')
      expect(versions).to.have.length(1)
      expect(versions[0].migration_version).to.equal('3.9.0')
      expect(versions[0].seeder_version).to.equal('3.9.0')

      const authGroups = await sqliteAll(db, 'SELECT name FROM AuthGroups ORDER BY name')
      expect(authGroups.map((row) => row.name)).to.deep.equal(['admin', 'developer', 'sre', 'viewer'])
      const authPolicy = await sqliteGet(db, 'SELECT id FROM AuthPolicy WHERE id = 1')
      expect(authPolicy).to.not.equal(undefined)
      const authBootstrap = await sqliteGet(db, 'SELECT id FROM AuthBootstrapMeta WHERE id = 1')
      expect(authBootstrap).to.not.equal(undefined)

      const hub = await sqliteGet(db, "SELECT id, url, type FROM Registries WHERE url = 'https://huggingface.co' AND type = 'hf'")
      expect(hub).to.not.equal(undefined)
      expect(hub.id).to.equal(3)
      expect(hub.type).to.equal('hf')

      const catalog = await sqliteAll(db, "SELECT name FROM CatalogItems WHERE category = 'SYSTEM' ORDER BY name")
      expect(catalog.map((row) => row.name)).to.deep.equal(['Debug', 'NATS', 'Router'])

      const tables = await sqliteAll(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('Models', 'RuntimeClasses', 'FogModels', 'FogRuntimeClasses', 'MicroserviceTemplates', 'MicroserviceTemplateVariables', 'MicroserviceEntrypoints', 'MicroserviceDevices', 'MicroserviceTmpfs', 'MicroserviceUlimits', 'MicroserviceModels', 'MicroserviceModelItems', 'HWInfos', 'USBInfos')")
      const tableNames = tables.map((row) => row.name).sort()
      expect(tableNames).to.deep.equal([
        'FogModels',
        'FogRuntimeClasses',
        'MicroserviceDevices',
        'MicroserviceEntrypoints',
        'MicroserviceModelItems',
        'MicroserviceModels',
        'MicroserviceTemplateVariables',
        'MicroserviceTemplates',
        'MicroserviceTmpfs',
        'MicroserviceUlimits',
        'Models',
        'RuntimeClasses'
      ])

      const templateCols = await sqliteAll(db, 'PRAGMA table_info(MicroserviceTemplates)')
      expect(templateCols.map((col) => col.name)).to.not.include('variables_json')
      expect(templateCols.map((col) => col.name)).to.include('microservice_json')

      const archInfo = await sqliteGet(db, 'PRAGMA table_info(Architectures)')
      const archCols = await sqliteAll(db, 'PRAGMA table_info(Architectures)')
      expect(archInfo).to.not.equal(undefined)
      expect(archCols.map((col) => col.name)).to.not.include('hal_catalog_item_id')
      expect(archCols.map((col) => col.name)).to.not.include('bluetooth_catalog_item_id')
      expect(archCols.map((col) => col.name)).to.include('network_catalog_item_id')

      const runtimeClasses = await sqliteAll(db, 'SELECT name FROM RuntimeClasses')
      expect(runtimeClasses).to.deep.equal([])
    } finally {
      await sqliteClose(db)
    }
  })

  it('loads sequelize models against the migrated schema', async () => {
    await provider.runVersionChainSQLite(dbPath)

    const Sequelize = require('sequelize')
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false
    })
    const modelsDir = path.join(__dirname, '../../../src/data/models')
    const db = {}
    fs.readdirSync(modelsDir)
      .filter((file) => file.endsWith('.js') && file !== 'index.js')
      .forEach((file) => {
        const model = require(path.join(modelsDir, file))(sequelize, Sequelize.DataTypes)
        db[model.name] = model
      })
    Object.keys(db).forEach((name) => {
      if (db[name].associate) {
        db[name].associate(db)
      }
    })

    try {
      const architectures = await db.Architecture.findAll({ order: [['id', 'ASC']] })
      expect(architectures).to.have.length(5)
      expect(architectures[0].networkCatalogItemId).to.not.equal(undefined)
      expect(architectures[0].halCatalogItemId).to.equal(undefined)

      const hub = await db.Registry.findOne({ where: { url: 'https://huggingface.co', type: 'hf' } })
      expect(hub).to.not.equal(null)
      expect(hub.type).to.equal('hf')
      expect(hub.insecure).to.equal(false)

      const fleetModels = await db.FleetModel.findAll()
      expect(fleetModels).to.have.length(0)
      const runtimeClasses = await db.RuntimeClass.findAll()
      expect(runtimeClasses).to.have.length(0)
      const microserviceTemplates = await db.MicroserviceTemplate.findAll()
      expect(microserviceTemplates).to.have.length(0)
      const microserviceTemplateVariables = await db.MicroserviceTemplateVariable.findAll()
      expect(microserviceTemplateVariables).to.have.length(0)

      const fogs = await db.Fog.findAll()
      expect(fogs).to.have.length(0)
    } finally {
      await sequelize.close()
    }
  })

  it('upgrade from 3.8.0 applies 3.9.0 without dropping architecture rows', async () => {
    await provider.runVersionChainSQLite(dbPath, { untilVersion: '3.8.0' })

    const before = await openSqlite(dbPath)
    let architectureNames
    try {
      const schema = await sqliteGet(before, 'SELECT migration_version, seeder_version FROM SchemaVersion ORDER BY id DESC LIMIT 1')
      expect(schema.migration_version).to.equal('3.8.0')
      expect(schema.seeder_version).to.equal('3.8.0')

      const catalog = await sqliteAll(before, "SELECT name FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue') ORDER BY name")
      expect(catalog.map((row) => row.name)).to.deep.equal(['HAL', 'RESTBlue'])

      const natsCatalog = await sqliteGet(before, "SELECT name FROM CatalogItems WHERE name = 'NATs'")
      expect(natsCatalog).to.not.equal(undefined)

      const hub = await sqliteGet(before, "SELECT id FROM Registries WHERE url = 'https://huggingface.co'")
      expect(hub).to.equal(undefined)

      const architectures = await sqliteAll(before, 'SELECT id, name FROM Architectures ORDER BY id')
      expect(architectures).to.have.length(5)
      architectureNames = architectures.map((row) => row.name)
    } finally {
      await sqliteClose(before)
    }

    await provider.runVersionChainSQLite(dbPath)

    const after = await openSqlite(dbPath)
    try {
      const versions = await sqliteAll(after, 'SELECT migration_version, seeder_version FROM SchemaVersion ORDER BY id')
      expect(versions).to.have.length(2)
      expect(versions[0].migration_version).to.equal('3.8.0')
      expect(versions[0].seeder_version).to.equal('3.8.0')
      expect(versions[1].migration_version).to.equal('3.9.0')
      expect(versions[1].seeder_version).to.equal('3.9.0')

      const architectures = await sqliteAll(after, 'SELECT id, name FROM Architectures ORDER BY id')
      expect(architectures).to.have.length(5)
      expect(architectures.map((row) => row.name)).to.deep.equal(architectureNames)

      const catalog = await sqliteAll(after, "SELECT name FROM CatalogItems WHERE name IN ('HAL', 'RESTBlue')")
      expect(catalog).to.deep.equal([])

      const systemCatalog = await sqliteAll(after, "SELECT name FROM CatalogItems WHERE category = 'SYSTEM' ORDER BY name")
      expect(systemCatalog.map((row) => row.name)).to.deep.equal(['Debug', 'NATS', 'Router'])

      const hub = await sqliteGet(after, "SELECT id, url, type FROM Registries WHERE url = 'https://huggingface.co' AND type = 'hf'")
      expect(hub).to.not.equal(undefined)
      expect(hub.type).to.equal('hf')
      expect(hub.id).to.not.equal(1)
      expect(hub.id).to.not.equal(2)

      const fogCols = await sqliteAll(after, 'PRAGMA table_info(Fogs)')
      const fogColNames = fogCols.map((col) => col.name)
      expect(fogColNames).to.not.include('device_scan_frequency')
      expect(fogColNames).to.not.include('bluetooth')
      expect(fogColNames).to.not.include('hal')
      expect(fogColNames).to.include('model_status')
      expect(fogColNames).to.include('runtime_classes')
      expect(fogColNames).to.include('available_cdi_devices')

      const msCols = await sqliteAll(after, 'PRAGMA table_info(Microservices)')
      const msColNames = msCols.map((col) => col.name)
      expect(msColNames).to.include('sysctls')
      expect(msColNames).to.include('run_as_group')
      expect(msColNames).to.not.include('entrypoint')
      expect(msColNames).to.not.include('commands')
      expect(msColNames).to.not.include('ulimits')
      expect(msColNames).to.not.include('devices')
      expect(msColNames).to.not.include('tmpfs')
      expect(msColNames).to.not.include('models')

      const tables = await sqliteAll(after, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      const tableNames = tables.map((row) => row.name)
      expect(tableNames).to.include.members([
        'MicroserviceEntrypoints',
        'MicroserviceDevices',
        'MicroserviceTmpfs',
        'MicroserviceUlimits',
        'MicroserviceModels',
        'MicroserviceModelItems'
      ])
    } finally {
      await sqliteClose(after)
    }
  })

  it('fresh baseline schema matches upgrade from 3.8.0', async () => {
    const freshPath = dbPath
    const upgradePath = dbPath + '.upgrade'
    cleanupSqlite(upgradePath)
    try {
      await provider.runVersionChainSQLite(freshPath)
      await provider.runVersionChainSQLite(upgradePath, { untilVersion: '3.8.0' })
      await provider.runVersionChainSQLite(upgradePath)

      const freshDb = await openSqlite(freshPath)
      const upgradeDb = await openSqlite(upgradePath)
      try {
        const freshDump = await dumpNormalizedSchema(freshDb)
        const upgradeDump = await dumpNormalizedSchema(upgradeDb)
        expect(freshDump).to.equal(upgradeDump)
      } finally {
        await sqliteClose(freshDb)
        await sqliteClose(upgradeDb)
      }
    } finally {
      cleanupSqlite(upgradePath)
    }
  })

  it('is idempotent when the version chain runs twice on a baseline database', async () => {
    await provider.runVersionChainSQLite(dbPath)
    await provider.runVersionChainSQLite(dbPath)

    const db = await openSqlite(dbPath)
    try {
      const versions = await sqliteAll(db, 'SELECT migration_version, seeder_version FROM SchemaVersion ORDER BY id')
      expect(versions).to.have.length(1)
      expect(versions[0].migration_version).to.equal('3.9.0')
      expect(versions[0].seeder_version).to.equal('3.9.0')

      const catalog = await sqliteAll(db, "SELECT name FROM CatalogItems WHERE category = 'SYSTEM' ORDER BY name")
      expect(catalog.map((row) => row.name)).to.deep.equal(['Debug', 'NATS', 'Router'])
    } finally {
      await sqliteClose(db)
    }
  })
})
