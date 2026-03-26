const path = require('path')
const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()
const logger = require('../../logger')

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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
        break
    }

    try {
      await db.query(query)
    } catch (err) {
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
      case 'sqlite':
        const sqliteQuery = 'UPDATE SchemaVersion SET seeder_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT MAX(id) FROM SchemaVersion)'
        return new Promise((resolve, reject) => {
          db.run(sqliteQuery, [version], (err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      case 'mysql':
        const [result] = await db.query('SELECT MAX(id) as maxId FROM SchemaVersion')
        const maxId = result[0].maxId
        const mysqlQuery = 'UPDATE SchemaVersion SET seeder_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        await db.query(mysqlQuery, { replacements: [version, maxId] })
        break
      case 'postgres':
        const postgresQuery = 'UPDATE "SchemaVersion" SET seeder_version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT MAX(id) FROM "SchemaVersion")'
        await db.query(postgresQuery, { bind: [version] })
        break
    }
  }

  // SQLite migration
  async runMigrationSQLite (dbName) {
    const migrationSqlPath = path.resolve(__dirname, '../migrations/sqlite/db_migration_sqlite_v1.1.0.sql')
    const migrationVersion = '1.1.0'

    if (!fs.existsSync(migrationSqlPath)) {
      logger.error(`Migration file not found: ${migrationSqlPath}`)
      throw new Error('Migration file not found')
    }

    const migrationSql = fs.readFileSync(migrationSqlPath).toString()
    const dataArr = migrationSql.split(';')

    let db = new sqlite3.Database(dbName, (err) => {
      if (err) {
        logger.error(err.message)
        throw err
      }
      logger.info('Connected to the SQLite database for migration.')
    })

    try {
      await this.createSchemaVersionTable(db, 'sqlite')
      const currentVersion = await this.checkMigrationVersion(db, 'sqlite')

      if (currentVersion === migrationVersion) {
        logger.info('Migration already up to date, skipping...')
        return
      }

      db.serialize(() => {
        db.run('PRAGMA foreign_keys=OFF;')
        db.run('BEGIN TRANSACTION;')
      })

      for (let query of dataArr) {
        if (query.trim()) {
          query = query.trim() + ';'
          await new Promise((resolve, reject) => {
            db.run(query, (err) => {
              if (err) {
                if (err.message.includes('already exists') || err.message.includes('duplicate')) {
                  logger.warn(`Ignored error: ${err.message}`)
                  resolve()
                } else {
                  db.run('ROLLBACK;')
                  reject(err)
                }
              } else {
                resolve()
              }
            })
          })
        }
      }

      await this.updateMigrationVersion(db, migrationVersion, 'sqlite')
      db.run('COMMIT;')
      logger.info('Migration completed successfully.')
    } catch (err) {
      logger.error('Migration failed:', err)
      throw err
    } finally {
      db.close((err) => {
        if (err) {
          logger.error('Error closing database connection:', err.message)
        } else {
          logger.info('Database connection closed after migration.')
        }
      })
    }
  }

  // MySQL migration
  async runMigrationMySQL (db) {
    const migrationSqlPath = path.resolve(__dirname, '../migrations/mysql/db_migration_mysql_v1.1.0.sql')
    const migrationVersion = '1.1.0'

    if (!fs.existsSync(migrationSqlPath)) {
      logger.error(`Migration file not found: ${migrationSqlPath}`)
      throw new Error('Migration file not found')
    }

    const migrationSql = fs.readFileSync(migrationSqlPath).toString()
    const dataArr = migrationSql.split(';')

    try {
      await this.createSchemaVersionTable(db, 'mysql')
      const currentVersion = await this.checkMigrationVersion(db, 'mysql')

      if (currentVersion === migrationVersion) {
        logger.info('Migration already up to date, skipping...')
        return
      }

      await db.query('START TRANSACTION')

      for (let query of dataArr) {
        if (query.trim()) {
          query = query.trim() + ';'
          try {
            await db.query(query)
          } catch (err) {
            // Check both the error and its parent (for Sequelize errors)
            const errorToCheck = err.parent || err
            if (errorToCheck.code === 'ER_TABLE_EXISTS_ERROR' ||
                errorToCheck.code === 'ER_DUP_FIELDNAME' ||
                errorToCheck.code === 'ER_DUP_KEYNAME' ||
                errorToCheck.code === 'ER_BLOB_KEY_WITHOUT_LENGTH' ||
                errorToCheck.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
                errorToCheck.code === 'duplicate_key' ||
                errorToCheck.code === 'already_exists' ||
                errorToCheck.errno === 1091 ||
                errorToCheck.errno === 1061 ||
                errorToCheck.errno === 1170) {
              logger.warn(`Ignored MySQL error: ${errorToCheck.message}`)
            } else {
              await db.query('ROLLBACK')
              throw err
            }
          }
        }
      }

      await this.updateMigrationVersion(db, migrationVersion, 'mysql')
      await db.query('COMMIT')
      logger.info('Migration completed successfully.')
    } catch (err) {
      await db.query('ROLLBACK')
      logger.error('Migration failed:', err)
      throw err
    }
  }

  // PostgreSQL migration
  async runMigrationPostgres (db) {
    const migrationSqlPath = path.resolve(__dirname, '../migrations/postgres/db_migration_pg_v1.1.0.sql')
    const migrationVersion = '1.1.0'

    if (!fs.existsSync(migrationSqlPath)) {
      logger.error(`Migration file not found: ${migrationSqlPath}`)
      throw new Error('Migration file not found')
    }

    const migrationSql = fs.readFileSync(migrationSqlPath).toString()
    const dataArr = migrationSql.split(';')

    try {
      await this.createSchemaVersionTable(db, 'postgres')
      const currentVersion = await this.checkMigrationVersion(db, 'postgres')

      if (currentVersion === migrationVersion) {
        logger.info('Migration already up to date, skipping...')
        return
      }

      await db.query('BEGIN')

      for (let query of dataArr) {
        if (query.trim()) {
          query = query.trim() + ';'
          try {
            await db.query(query)
          } catch (err) {
            // Check both the error and its parent (for Sequelize errors)
            const errorToCheck = err.parent || err

            // If transaction is aborted, rollback and start new transaction
            if (errorToCheck.code === '25P02') {
              logger.warn('Transaction aborted, rolling back and starting new transaction...')
              await db.query('ROLLBACK')
              await db.query('BEGIN')
              continue
            }

            if (errorToCheck.code === '42P07' || // duplicate_table
                errorToCheck.code === '42701' || // duplicate_column
                errorToCheck.code === '42P06' || // duplicate_schema
                errorToCheck.code === '23505' || // unique_violation
                errorToCheck.code === '23503' || // foreign_key_violation
                errorToCheck.code === '42P01' || // undefined_table
                errorToCheck.code === '42703' || // undefined_column
                errorToCheck.code === '42P16' || // invalid_table_definition
                errorToCheck.code === '42P17' || // invalid_table_definition
                errorToCheck.code === '42P18' || // invalid_table_definition
                (errorToCheck.message && (
                  errorToCheck.message.includes('already exists') ||
                  errorToCheck.message.includes('duplicate key') ||
                  errorToCheck.message.includes('relation')
                ))) {
              logger.warn(`Ignored PostgreSQL error: ${errorToCheck.message}`)
            } else {
              await db.query('ROLLBACK')
              throw err
            }
          }
        }
      }

      await this.updateMigrationVersion(db, migrationVersion, 'postgres')
      await db.query('COMMIT')
      logger.info('Migration completed successfully.')
    } catch (err) {
      await db.query('ROLLBACK')
      logger.error('Migration failed:', err)
      throw err
    }
  }

  // SQLite seeder
  async runSeederSQLite (dbName) {
    const seederSqlPath = path.resolve(__dirname, '../seeders/sqlite/db_seeder_sqlite_v1.0.2.sql')
    const seederVersion = '1.0.2'

    if (!fs.existsSync(seederSqlPath)) {
      logger.error(`Seeder file not found: ${seederSqlPath}`)
      throw new Error('Seeder file not found')
    }

    const seederSql = fs.readFileSync(seederSqlPath).toString()
    const dataArr = seederSql.split(';')

    let db = new sqlite3.Database(dbName, (err) => {
      if (err) {
        logger.error(err.message)
        throw err
      }
      logger.info('Connected to the SQLite database for seeding.')
    })

    try {
      const currentVersion = await this.checkSeederVersion(db, 'sqlite')

      if (currentVersion === seederVersion) {
        logger.info('Seeder already up to date, skipping...')
        return
      }

      db.serialize(() => {
        db.run('PRAGMA foreign_keys=OFF;')
        db.run('BEGIN TRANSACTION;')
      })

      for (let query of dataArr) {
        if (query.trim()) {
          query = query.trim() + ';'
          await new Promise((resolve, reject) => {
            db.run(query, (err) => {
              if (err) {
                if (err.message.includes('already exists') || err.message.includes('duplicate')) {
                  logger.warn(`Ignored error: ${err.message}`)
                  resolve()
                } else {
                  db.run('ROLLBACK;')
                  reject(err)
                }
              } else {
                resolve()
              }
            })
          })
        }
      }

      await this.updateSeederVersion(db, seederVersion, 'sqlite')
      db.run('COMMIT;')
      logger.info('Seeding completed successfully.')
    } catch (err) {
      logger.error('Seeding failed:', err)
      throw err
    } finally {
      db.close((err) => {
        if (err) {
          logger.error('Error closing database connection:', err.message)
        } else {
          logger.info('Database connection closed after seeding.')
        }
      })
    }
  }

  // MySQL seeder
  async runSeederMySQL (db) {
    const seederSqlPath = path.resolve(__dirname, '../seeders/mysql/db_seeder_mysql_v1.0.2.sql')
    const seederVersion = '1.0.2'

    if (!fs.existsSync(seederSqlPath)) {
      logger.error(`Seeder file not found: ${seederSqlPath}`)
      throw new Error('Seeder file not found')
    }

    const seederSql = fs.readFileSync(seederSqlPath).toString()
    const dataArr = seederSql.split(';')

    try {
      const currentVersion = await this.checkSeederVersion(db, 'mysql')

      if (currentVersion === seederVersion) {
        logger.info('Seeder already up to date, skipping...')
        return
      }

      await db.query('START TRANSACTION')

      for (let query of dataArr) {
        if (query.trim()) {
          query = query.trim() + ';'
          try {
            await db.query(query)
          } catch (err) {
            if (err.code === 'ER_DUP_ENTRY' ||
                err.code === 'ER_DUP_KEY') {
              logger.warn(`Ignored MySQL error: ${err.message}`)
            } else {
              await db.query('ROLLBACK')
              throw err
            }
          }
        }
      }

      await this.updateSeederVersion(db, seederVersion, 'mysql')
      await db.query('COMMIT')
      logger.info('Seeding completed successfully.')
    } catch (err) {
      await db.query('ROLLBACK')
      logger.error('Seeding failed:', err)
      throw err
    }
  }

  // PostgreSQL seeder
  async runSeederPostgres (db) {
    const seederSqlPath = path.resolve(__dirname, '../seeders/postgres/db_seeder_pg_v1.0.2.sql')
    const seederVersion = '1.0.2'

    if (!fs.existsSync(seederSqlPath)) {
      logger.error(`Seeder file not found: ${seederSqlPath}`)
      throw new Error('Seeder file not found')
    }

    const seederSql = fs.readFileSync(seederSqlPath).toString()
    const dataArr = seederSql.split(';')

    try {
      const currentVersion = await this.checkSeederVersion(db, 'postgres')

      if (currentVersion === seederVersion) {
        logger.info('Seeder already up to date, skipping...')
        return
      }

      await db.query('BEGIN')

      for (let query of dataArr) {
        if (query.trim()) {
          query = query.trim() + ';'
          try {
            await db.query(query)
          } catch (err) {
            if (err.code === '23505' || // unique_violation
                err.code === '23503') { // foreign_key_violation
              logger.warn(`Ignored PostgreSQL error: ${err.message}`)
            } else {
              await db.query('ROLLBACK')
              throw err
            }
          }
        }
      }

      await this.updateSeederVersion(db, seederVersion, 'postgres')
      await db.query('COMMIT')
      logger.info('Seeding completed successfully.')
    } catch (err) {
      await db.query('ROLLBACK')
      logger.error('Seeding failed:', err)
      throw err
    }
  }
}

module.exports = DatabaseProvider
