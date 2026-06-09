/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const nconf = require('nconf')
const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')

class Config {
  constructor () {
    this.envMapping = require('./env-mapping')
    this.configPath = process.env.CONFIG_PATH || path.join(__dirname, 'config.yaml')
    this.config = null
    this.load()
  }

  load () {
    // 1. Load YAML config file
    this.loadYamlConfig()

    // 2. Set OTEL environment variables from config
    this.setOtelEnvVars()
  }

  loadYamlConfig () {
    try {
      console.log('Loading config from:', this.configPath)
      const configContent = fs.readFileSync(this.configPath, 'utf8')
      this.config = yaml.load(configContent)

      // Clear any existing configuration
      nconf.reset()

      // First set environment variables
      nconf.env({
        separator: '_',
        parseValues: true,
        transform: (obj) => {
          // Skip OTEL environment variables as they are handled separately
          if (obj.key.startsWith('OTEL_') || obj.key === 'ENABLE_TELEMETRY') {
            return null
          }

          const mapping = this.envMapping[obj.key]
          if (!mapping) {
            return null
          }

          // Handle database configuration
          if (typeof mapping === 'object' && mapping.path) {
            const provider = this.get('database.provider', 'sqlite')
            return {
              key: mapping.path(provider),
              value: this.parseEnvValue(obj.value)
            }
          }

          return {
            key: mapping,
            value: this.parseEnvValue(obj.value)
          }
        }
      })

      // Get environment overrides first
      const envOverrides = nconf.get()

      // Create a deep copy of the base config
      const finalConfig = JSON.parse(JSON.stringify(this.config))

      // Merge environment overrides into the final config
      Object.entries(envOverrides).forEach(([key, value]) => {
        if (key.includes('.')) {
          const keys = key.split('.')
          let current = finalConfig
          for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
              current[keys[i]] = {}
            }
            current = current[keys[i]]
          }
          current[keys[keys.length - 1]] = value
        } else if (!key.includes(':') && key !== 'type') {
          finalConfig[key] = value
        }
      })

      // Reset nconf and set the final merged config
      nconf.reset()
      nconf.defaults(finalConfig)
      // Log the final merged config
    } catch (error) {
      console.error(`Error loading config file: ${error.message}`)
      throw error
    }
  }

  setOtelEnvVars () {
    console.log('Setting OTEL environment variables from config...')
    // Only set OTEL env vars if they're not already set
    for (const [envVar, configPath] of Object.entries(this.envMapping)) {
      if (envVar.startsWith('OTEL_') || envVar === 'ENABLE_TELEMETRY') {
        const value = this.get(configPath)
        if (value !== undefined && !process.env[envVar]) {
          const formattedValue = this.formatValue(value)
          process.env[envVar] = formattedValue
        }
      }
    }
  }

  parseEnvValue (value) {
    // Handle different types
    if (value === 'true') return true
    if (value === 'false') return false
    if (!isNaN(value) && value !== '') return Number(value)
    return value
  }

  formatValue (value) {
    if (typeof value === 'boolean') {
      return value.toString()
    }
    if (Array.isArray(value)) {
      return value.join(',')
    }
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, val]) => `${key}=${val}`)
        .join(',')
    }
    return value.toString()
  }

  get (key, defaultValue) {
    // Replace dots with colons for nconf compatibility
    const nconfKey = key.replace(/\./g, ':')
    let value = nconf.get(nconfKey)
    return value !== undefined ? value : defaultValue
  }

  set (key, value) {
    nconf.set(key, value)
  }

  getAll () {
    return nconf.get()
  }
}

module.exports = new Config()
