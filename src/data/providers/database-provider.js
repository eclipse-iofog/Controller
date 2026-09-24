const path = require('path')
const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()
const logger = require('../../logger')

function sqliteRun (db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err)
      else resolve()
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

const SCHEMA_VERSIONS = ['3.8.0', '3.9.0']
const BASELINE_VERSION = '3.9.0'

function compareVersions (left, right) {
  const leftParts = String(left || '0').split('.').map((part) => parseInt(part, 10) || 0)
  const rightParts = String(right || '0').split('.').map((part) => parseInt(part, 10) || 0)
  const length = Math.max(leftParts.length, rightParts.length)
  for (let i = 0; i < length; i++) {
    const delta = (leftParts[i] || 0) - (rightParts[i] || 0)
    if (delta !== 0) {
      return delta
    }
  }
  return 0
}

function isVersionLessThan (current, target) {
  return current == null || compareVersions(current, target) < 0
}

function versionsToApply (untilVersion) {
  if (!untilVersion) {
    return SCHEMA_VERSIONS.slice()
  }
  return SCHEMA_VERSIONS.filter((version) => compareVersions(version, untilVersion) <= 0)
}

function shouldApplyBaseline (currentSchemaVersion, untilVersion) {
  return currentSchemaVersion == null && untilVersion == null
}

function splitSqlStatements (sql) {
  return sql.split(';').map((query) => query.trim()).filter(Boolean)
}

function isTransactionControl (query) {
  const normalized = query.replace(/;$/, '').trim().toUpperCase()
  return normalized === 'START TRANSACTION' ||
    normalized === 'BEGIN' ||
    normalized === 'BEGIN TRANSACTION' ||
    normalized === 'COMMIT' ||
    normalized === 'ROLLBACK'
}

function migrationSqlPath (provider, version) {
  const relative = {
    sqlite: `sqlite/db_migration_sqlite_v${version}.sql`,
    mysql: `mysql/db_migration_mysql_v${version}.sql`,
    postgres: `postgres/db_migration_pg_v${version}.sql`
  }[provider]
  return path.resolve(__dirname, '../migrations', relative)
}

function seederSqlPath (provider, version) {
  const relative = {
    sqlite: `sqlite/db_seeder_sqlite_v${version}.sql`,
    mysql: `mysql/db_seeder_mysql_v${version}.sql`,
    postgres: `postgres/db_seeder_pg_v${version}.sql`
  }[provider]
  return path.resolve(__dirname, '../seeders', relative)
}

function baselineMigrationSqlPath (provider) {
  const relative = {
    sqlite: 'sqlite/db_migration_sqlite_baseline_v3.9.0.sql',
    mysql: 'mysql/db_migration_mysql_baseline_v3.9.0.sql',
    postgres: 'postgres/db_migration_pg_baseline_v3.9.0.sql'
  }[provider]
  return path.resolve(__dirname, '../migrations', relative)
}

function baselineSeederSqlPath (provider) {
  const relative = {
    sqlite: 'sqlite/db_seeder_sqlite_baseline_v3.9.0.sql',
    mysql: 'mysql/db_seeder_mysql_baseline_v3.9.0.sql',
    postgres: 'postgres/db_seeder_pg_baseline_v3.9.0.sql'
  }[provider]
  return path.resolve(__dirname, '../seeders', relative)
}

function readSqlFile (filePath) {
  if (!fs.existsSync(filePath)) {
    logger.error(`SQL file not found: ${filePath}`)
    throw new Error('SQL file not found')
  }
  return fs.readFileSync(filePath).toString()
}

function isIgnorableSqliteError (err) {
  const message = (err && err.message) || ''
  return message.includes('already exists') || message.includes('duplicate')
}

function isIgnorableMysqlError (err) {
  const errorToCheck = (err && err.parent) || err || {}
  return errorToCheck.code === 'ER_TABLE_EXISTS_ERROR' ||
    errorToCheck.code === 'ER_DUP_FIELDNAME' ||
    errorToCheck.code === 'ER_DUP_KEYNAME' ||
    errorToCheck.code === 'ER_BLOB_KEY_WITHOUT_LENGTH' ||
    errorToCheck.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
    errorToCheck.code === 'ER_DUP_ENTRY' ||
    errorToCheck.code === 'ER_DUP_KEY' ||
    errorToCheck.code === 'duplicate_key' ||
    errorToCheck.code === 'already_exists' ||
    errorToCheck.errno === 1091 ||
    errorToCheck.errno === 1061 ||
    errorToCheck.errno === 1170
}

function isIgnorablePostgresError (err) {
  const errorToCheck = (err && err.parent) || err || {}
  const message = errorToCheck.message || ''
  return errorToCheck.code === '42P07' ||
    errorToCheck.code === '42701' ||
    errorToCheck.code === '42P06' ||
    errorToCheck.code === '23505' ||
    errorToCheck.code === '23503' ||
    errorToCheck.code === '42P01' ||
    errorToCheck.code === '42703' ||
    errorToCheck.code === '42P16' ||
    errorToCheck.code === '42P17' ||
    errorToCheck.code === '42P18' ||
    message.includes('already exists') ||
    message.includes('duplicate key') ||
    message.includes('does not exist')
}

class DatabaseProvider {
  constructor () {
    this.basename = path.basename(__filename)
  }

  // Helper method to create database if it doesn't exist
  async createDatabaseIfNotExists (db, provider, dbName) {
    let checkQuery, createQuery
    switch (provider) {
      case 'mysql':
        checkQuery = `SHOW DATABASES LIKE '${dbName}'`
        createQuery = `CREATE DATABASE IF NOT EXISTS \`${dbName}\``
        break
      case 'postgres':
        checkQuery = `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`
        createQuery = `CREATE DATABASE "${dbName}"`
        break
      default:
        return // No need to create database for SQLite
    }

    try {
      // For MySQL, we need to connect without a database first
      if (provider === 'mysql') {
        const mysql = require('mysql2/promise')
        const config = { ...db.config }
        // Remove database from config for initial connection
        delete config.database

        const tempConnection = await mysql.createConnection(config)
        try {
          const [result] = await tempConnection.query(checkQuery)
          const databaseExists = result.length > 0

          if (!databaseExists) {
            logger.info(`Creating database ${dbName}...`)
            await tempConnection.query(createQuery)
            logger.info(`Database ${dbName} created successfully`)
          } else {
            logger.info(`Database ${dbName} already exists`)
          }
        } finally {
          await tempConnection.end()
        }
      } else if (provider === 'postgres') {
        const { Pool } = require('pg')
        const config = { ...db.config }
        // Remove database from config for initial connection
        delete config.database

        const pool = new Pool(config)
        try {
          const result = await pool.query(checkQuery)
          const databaseExists = result.rows && result.rows.length > 0

          if (!databaseExists) {
            logger.info(`Creating database ${dbName}...`)
            await pool.query(createQuery)
            logger.info(`Database ${dbName} created successfully`)
          } else {
            logger.info(`Database ${dbName} already exists`)
          }
        } finally {
          await pool.end()
        }
      }
    } catch (err) {
      logger.error(`Error checking/creating database ${dbName}:`, err)
      throw err
    }
  }

  // Common method to check if migration has been run
  async checkMigrationVersion (db, provider) {
    let query
    switch (provider) {
      case 'sqlite':
        query = 'SELECT migration_version FROM SchemaVersion WHERE migration_version IS NOT NULL ORDER BY id DESC LIMIT 1'
        return new Promise((resolve, reject) => {
          db.get(query, (err, row) => {
            if (err) {
              if (err.message.includes('no such table')) {
                resolve(null) // Table doesn't exist yet
              } else {
                reject(err)
              }
            } else {
              resolve(row ? row.migration_version : null)
            }
          })
        })
      case 'mysql':
        query = 'SELECT migration_version FROM SchemaVersion WHERE migration_version IS NOT NULL ORDER BY id DESC LIMIT 1'
        break
      case 'postgres':
        query = 'SELECT migration_version FROM "SchemaVersion" WHERE migration_version IS NOT NULL ORDER BY id DESC LIMIT 1'
        break
    }

    try {
      const [results] = await db.query(query)
      return results && results.length > 0 ? results[0].migration_version : null
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
        return null // Table doesn't exist yet
      }
      throw err
    }
  }

  // Common method to check if seeder has been run
  async checkSeederVersion (db, provider) {
    let query
    switch (provider) {
      case 'sqlite':
        query = 'SELECT seeder_version FROM SchemaVersion WHERE seeder_version IS NOT NULL ORDER BY id DESC LIMIT 1'
        return new Promise((resolve, reject) => {
          db.get(query, (err, row) => {
            if (err) {
              if (err.message.includes('no such table')) {
                resolve(null) // Table doesn't exist yet
              } else {
                reject(err)
              }
            } else {
              resolve(row ? row.seeder_version : null)
            }
          })
        })
      case 'mysql':
        query = 'SELECT seeder_version FROM SchemaVersion WHERE seeder_version IS NOT NULL ORDER BY id DESC LIMIT 1'
        break
      case 'postgres':
        query = 'SELECT seeder_version FROM "SchemaVersion" WHERE seeder_version IS NOT NULL ORDER BY id DESC LIMIT 1'
        break
    }

    try {
      const [results] = await db.query(query)
      return results && results.length > 0 ? results[0].seeder_version : null
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
        return null // Table doesn't exist yet
      }
      throw err
    }
  }

  // Common method to create SchemaVersion table
  async createSchemaVersionTable (db, provider) {
    let query
    switch (provider) {
      case 'sqlite':
        query = `
          CREATE TABLE IF NOT EXISTS SchemaVersion (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            migration_version TEXT NOT NULL,
            seeder_version TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
        return new Promise((resolve, reject) => {
          db.run(query, (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      case 'mysql':
        query = `
          CREATE TABLE IF NOT EXISTS SchemaVersion (
            id INT AUTO_INCREMENT PRIMARY KEY,
            migration_version VARCHAR(255) NOT NULL,
            seeder_version VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `
        break
      case 'postgres':
        query = `
          CREATE TABLE IF NOT EXISTS "SchemaVersion" (
            id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            migration_version VARCHAR(255) NOT NULL,
            seeder_version VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          )
        `
        break
    }

    try {
      await db.query(query)
    } catch (err) {
      logger.error(`Failed to create SchemaVersion table (${provider}):`, err)
      throw err
    }
  }

  // Common method to update migration version
  async updateMigrationVersion (db, version, provider) {
    let query
    switch (provider) {
      case 'sqlite':
        query = 'INSERT INTO SchemaVersion (migration_version) VALUES (?)'
        return new Promise((resolve, reject) => {
          db.run(query, [version], (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      case 'mysql':
        query = 'INSERT INTO SchemaVersion (migration_version) VALUES (?)'
        await db.query(query, { replacements: [version] })
        break
      case 'postgres':
        query = 'INSERT INTO "SchemaVersion" (migration_version) VALUES ($1)'
        await db.query(query, { bind: [version] })
        break
    }
  }

  // Common method to update seeder version
  async updateSeederVersion (db, version, provider) {
    switch (provider) {
      case 'sqlite': {
        const sqliteQuery = 'UPDATE SchemaVersion SET seeder_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT MAX(id) FROM SchemaVersion)'
        return new Promise((resolve, reject) => {
          db.run(sqliteQuery, [version], (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      }
      case 'mysql': {
        const [result] = await db.query('SELECT MAX(id) as maxId FROM SchemaVersion')
        const maxId = result[0].maxId
        const mysqlQuery = 'UPDATE SchemaVersion SET seeder_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        await db.query(mysqlQuery, { replacements: [version, maxId] })
        break
      }
      case 'postgres': {
        const postgresQuery = 'UPDATE "SchemaVersion" SET seeder_version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT MAX(id) FROM "SchemaVersion")'
        await db.query(postgresQuery, { bind: [version] })
        break
      }
    }
  }

  async applySqliteStatements (db, sql, { ignoreDuplicate } = { ignoreDuplicate: true }) {
    for (const raw of splitSqlStatements(sql)) {
      if (isTransactionControl(raw)) {
        continue
      }
      const query = raw + ';'
      try {
        await sqliteRun(db, query)
      } catch (err) {
        if (ignoreDuplicate && isIgnorableSqliteError(err)) {
          logger.warn(`Ignored error: ${err.message}`)
        } else {
          throw err
        }
      }
    }
  }

  async applySqliteMigrationIfNeeded (db, version) {
    const currentVersion = await this.checkMigrationVersion(db, 'sqlite')
    if (!isVersionLessThan(currentVersion, version)) {
      logger.info(`SQLite schema ${currentVersion || 'none'} already includes ${version}, skipping migration`)
      return
    }

    const sql = readSqlFile(migrationSqlPath('sqlite', version))
    await sqliteRun(db, 'BEGIN TRANSACTION')
    try {
      await this.applySqliteStatements(db, sql)
      await this.updateMigrationVersion(db, version, 'sqlite')
      await sqliteRun(db, 'COMMIT')
      logger.info(`SQLite migration ${version} completed successfully.`)
    } catch (err) {
      try {
        await sqliteRun(db, 'ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`SQLite migration ${version} failed:`, err)
      throw err
    }
  }

  async applySqliteSeederIfNeeded (db, version) {
    const currentVersion = await this.checkSeederVersion(db, 'sqlite')
    if (!isVersionLessThan(currentVersion, version)) {
      logger.info(`SQLite seeder ${currentVersion || 'none'} already includes ${version}, skipping seeder`)
      return
    }

    const sql = readSqlFile(seederSqlPath('sqlite', version))
    await sqliteRun(db, 'BEGIN TRANSACTION')
    try {
      await this.applySqliteStatements(db, sql)
      await this.updateSeederVersion(db, version, 'sqlite')
      await sqliteRun(db, 'COMMIT')
      logger.info(`SQLite seeder ${version} completed successfully.`)
    } catch (err) {
      try {
        await sqliteRun(db, 'ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`SQLite seeder ${version} failed:`, err)
      throw err
    }
  }

  async applySqliteBaseline (db) {
    logger.info(`Applying empty-database baseline schema ${BASELINE_VERSION}`)
    const migrationSql = readSqlFile(baselineMigrationSqlPath('sqlite'))
    await sqliteRun(db, 'BEGIN TRANSACTION')
    try {
      await this.applySqliteStatements(db, migrationSql)
      await this.updateMigrationVersion(db, BASELINE_VERSION, 'sqlite')
      await sqliteRun(db, 'COMMIT')
      logger.info(`SQLite baseline migration ${BASELINE_VERSION} completed successfully.`)
    } catch (err) {
      try {
        await sqliteRun(db, 'ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`SQLite baseline migration ${BASELINE_VERSION} failed:`, err)
      throw err
    }

    logger.info(`Applying empty-database baseline seed ${BASELINE_VERSION}`)
    const seederSql = readSqlFile(baselineSeederSqlPath('sqlite'))
    await sqliteRun(db, 'BEGIN TRANSACTION')
    try {
      await this.applySqliteStatements(db, seederSql)
      await this.updateSeederVersion(db, BASELINE_VERSION, 'sqlite')
      await sqliteRun(db, 'COMMIT')
      logger.info(`SQLite baseline seeder ${BASELINE_VERSION} completed successfully.`)
    } catch (err) {
      try {
        await sqliteRun(db, 'ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`SQLite baseline seeder ${BASELINE_VERSION} failed:`, err)
      throw err
    }
  }

  async runVersionChainSQLite (dbName, options = {}) {
    const db = new sqlite3.Database(dbName, (err) => {
      if (err) {
        logger.error(err.message)
        throw err
      }
      logger.info('Connected to the SQLite database for schema updates.')
    })

    try {
      await this.createSchemaVersionTable(db, 'sqlite')
      await sqliteRun(db, 'PRAGMA foreign_keys=OFF')
      const currentVersion = await this.checkMigrationVersion(db, 'sqlite')
      if (shouldApplyBaseline(currentVersion, options.untilVersion)) {
        await this.applySqliteBaseline(db)
        return
      }
      for (const version of versionsToApply(options.untilVersion)) {
        await this.applySqliteMigrationIfNeeded(db, version)
        await this.applySqliteSeederIfNeeded(db, version)
      }
    } finally {
      try {
        await sqliteClose(db)
        logger.info('Database connection closed after schema updates.')
      } catch (closeErr) {
        logger.error('Error closing database connection:', closeErr.message)
      }
    }
  }

  async applyMysqlStatements (db, sql) {
    for (const raw of splitSqlStatements(sql)) {
      if (isTransactionControl(raw)) {
        continue
      }
      const query = raw + ';'
      try {
        await db.query(query)
      } catch (err) {
        const errorToCheck = err.parent || err
        if (errorToCheck.code === '25P02') {
          throw err
        }
        if (isIgnorableMysqlError(err)) {
          logger.warn(`Ignored MySQL error: ${errorToCheck.message}`)
        } else {
          throw err
        }
      }
    }
  }

  async applyMysqlMigrationIfNeeded (db, version) {
    const currentVersion = await this.checkMigrationVersion(db, 'mysql')
    if (!isVersionLessThan(currentVersion, version)) {
      logger.info(`MySQL schema ${currentVersion || 'none'} already includes ${version}, skipping migration`)
      return
    }

    const sql = readSqlFile(migrationSqlPath('mysql', version))
    await db.query('START TRANSACTION')
    try {
      await this.applyMysqlStatements(db, sql)
      await this.updateMigrationVersion(db, version, 'mysql')
      await db.query('COMMIT')
      logger.info(`MySQL migration ${version} completed successfully.`)
    } catch (err) {
      try {
        await db.query('ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`MySQL migration ${version} failed:`, err)
      throw err
    }
  }

  async applyMysqlSeederIfNeeded (db, version) {
    const currentVersion = await this.checkSeederVersion(db, 'mysql')
    if (!isVersionLessThan(currentVersion, version)) {
      logger.info(`MySQL seeder ${currentVersion || 'none'} already includes ${version}, skipping seeder`)
      return
    }

    const sql = readSqlFile(seederSqlPath('mysql', version))
    await db.query('START TRANSACTION')
    try {
      await this.applyMysqlStatements(db, sql)
      await this.updateSeederVersion(db, version, 'mysql')
      await db.query('COMMIT')
      logger.info(`MySQL seeder ${version} completed successfully.`)
    } catch (err) {
      try {
        await db.query('ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`MySQL seeder ${version} failed:`, err)
      throw err
    }
  }

  async applyMysqlBaseline (db) {
    logger.info(`Applying empty-database baseline schema ${BASELINE_VERSION}`)
    const migrationSql = readSqlFile(baselineMigrationSqlPath('mysql'))
    await db.query('START TRANSACTION')
    try {
      await this.applyMysqlStatements(db, migrationSql)
      await this.updateMigrationVersion(db, BASELINE_VERSION, 'mysql')
      await db.query('COMMIT')
      logger.info(`MySQL baseline migration ${BASELINE_VERSION} completed successfully.`)
    } catch (err) {
      try {
        await db.query('ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`MySQL baseline migration ${BASELINE_VERSION} failed:`, err)
      throw err
    }

    logger.info(`Applying empty-database baseline seed ${BASELINE_VERSION}`)
    const seederSql = readSqlFile(baselineSeederSqlPath('mysql'))
    await db.query('START TRANSACTION')
    try {
      await this.applyMysqlStatements(db, seederSql)
      await this.updateSeederVersion(db, BASELINE_VERSION, 'mysql')
      await db.query('COMMIT')
      logger.info(`MySQL baseline seeder ${BASELINE_VERSION} completed successfully.`)
    } catch (err) {
      try {
        await db.query('ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`MySQL baseline seeder ${BASELINE_VERSION} failed:`, err)
      throw err
    }
  }

  async runVersionChainMySQL (db, options = {}) {
    await this.createSchemaVersionTable(db, 'mysql')
    const currentVersion = await this.checkMigrationVersion(db, 'mysql')
    if (shouldApplyBaseline(currentVersion, options.untilVersion)) {
      await this.applyMysqlBaseline(db)
      return
    }
    for (const version of versionsToApply(options.untilVersion)) {
      await this.applyMysqlMigrationIfNeeded(db, version)
      await this.applyMysqlSeederIfNeeded(db, version)
    }
  }

  async applyPostgresStatements (db, sql) {
    for (const raw of splitSqlStatements(sql)) {
      if (isTransactionControl(raw)) {
        continue
      }
      const query = raw + ';'
      try {
        await db.query(query)
      } catch (err) {
        const errorToCheck = err.parent || err
        if (errorToCheck.code === '25P02') {
          logger.warn('Transaction aborted, rolling back and starting new transaction...')
          await db.query('ROLLBACK')
          await db.query('BEGIN')
          continue
        }
        if (isIgnorablePostgresError(err)) {
          logger.warn(`Ignored PostgreSQL error: ${errorToCheck.message}`)
        } else {
          throw err
        }
      }
    }
  }

  async applyPostgresMigrationIfNeeded (db, version) {
    const currentVersion = await this.checkMigrationVersion(db, 'postgres')
    if (!isVersionLessThan(currentVersion, version)) {
      logger.info(`PostgreSQL schema ${currentVersion || 'none'} already includes ${version}, skipping migration`)
      return
    }

    const sql = readSqlFile(migrationSqlPath('postgres', version))
    await db.query('BEGIN')
    try {
      await this.applyPostgresStatements(db, sql)
      await this.updateMigrationVersion(db, version, 'postgres')
      await db.query('COMMIT')
      logger.info(`PostgreSQL migration ${version} completed successfully.`)
    } catch (err) {
      try {
        await db.query('ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`PostgreSQL migration ${version} failed:`, err)
      throw err
    }
  }

  async applyPostgresSeederIfNeeded (db, version) {
    const currentVersion = await this.checkSeederVersion(db, 'postgres')
    if (!isVersionLessThan(currentVersion, version)) {
      logger.info(`PostgreSQL seeder ${currentVersion || 'none'} already includes ${version}, skipping seeder`)
      return
    }

    const sql = readSqlFile(seederSqlPath('postgres', version))
    await db.query('BEGIN')
    try {
      await this.applyPostgresStatements(db, sql)
      await this.updateSeederVersion(db, version, 'postgres')
      await db.query('COMMIT')
      logger.info(`PostgreSQL seeder ${version} completed successfully.`)
    } catch (err) {
      try {
        await db.query('ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`PostgreSQL seeder ${version} failed:`, err)
      throw err
    }
  }

  async applyPostgresBaseline (db) {
    logger.info(`Applying empty-database baseline schema ${BASELINE_VERSION}`)
    const migrationSql = readSqlFile(baselineMigrationSqlPath('postgres'))
    await db.query('BEGIN')
    try {
      await this.applyPostgresStatements(db, migrationSql)
      await this.updateMigrationVersion(db, BASELINE_VERSION, 'postgres')
      await db.query('COMMIT')
      logger.info(`PostgreSQL baseline migration ${BASELINE_VERSION} completed successfully.`)
    } catch (err) {
      try {
        await db.query('ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`PostgreSQL baseline migration ${BASELINE_VERSION} failed:`, err)
      throw err
    }

    logger.info(`Applying empty-database baseline seed ${BASELINE_VERSION}`)
    const seederSql = readSqlFile(baselineSeederSqlPath('postgres'))
    await db.query('BEGIN')
    try {
      await this.applyPostgresStatements(db, seederSql)
      await this.updateSeederVersion(db, BASELINE_VERSION, 'postgres')
      await db.query('COMMIT')
      logger.info(`PostgreSQL baseline seeder ${BASELINE_VERSION} completed successfully.`)
    } catch (err) {
      try {
        await db.query('ROLLBACK')
      } catch (rollbackErr) {
        // No active transaction to roll back.
      }
      logger.error(`PostgreSQL baseline seeder ${BASELINE_VERSION} failed:`, err)
      throw err
    }
  }

  async runVersionChainPostgres (db, options = {}) {
    await this.createSchemaVersionTable(db, 'postgres')
    const currentVersion = await this.checkMigrationVersion(db, 'postgres')
    if (shouldApplyBaseline(currentVersion, options.untilVersion)) {
      await this.applyPostgresBaseline(db)
      return
    }
    for (const version of versionsToApply(options.untilVersion)) {
      await this.applyPostgresMigrationIfNeeded(db, version)
      await this.applyPostgresSeederIfNeeded(db, version)
    }
  }

  async runMigrationSQLite (dbName, options) {
    return this.runVersionChainSQLite(dbName, options)
  }

  async runMigrationMySQL (db, options) {
    return this.runVersionChainMySQL(db, options)
  }

  async runMigrationPostgres (db, options) {
    return this.runVersionChainPostgres(db, options)
  }

  async runSeederSQLite (dbName, options) {
    return this.runVersionChainSQLite(dbName, options)
  }

  async runSeederMySQL (db, options) {
    return this.runVersionChainMySQL(db, options)
  }

  async runSeederPostgres (db, options) {
    return this.runVersionChainPostgres(db, options)
  }
}

DatabaseProvider.SCHEMA_VERSIONS = SCHEMA_VERSIONS
DatabaseProvider.BASELINE_VERSION = BASELINE_VERSION

module.exports = DatabaseProvider
