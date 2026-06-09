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

const execSync = require('child_process').execSync

const { init } = require('./init')
const { restoreDBs, backupDBs, setDbEnvVars } = require('./util')

const FogService = require('../src/services/iofog-service')
const RouterService = require('../src/services/router-service')

const options = {
  env: {
    'NODE_ENV': 'production',
    'PATH': process.env.PATH
  },
  encoding: 'ascii'
}

options.env = setDbEnvVars(options.env)

/* eslint-disable no-unused-vars */
let testsCounter = 0
let testsFailed = 0

const controllerStatusFields = ['status', 'timestamp']
const controllerFogTypesFields = ['fogTypes']

const ioFogCreateFields = ['uuid']
const ioFogListFields = ['fogs']
const ioFogProvisioningFields = ['key', 'expirationTime']

const catalogCreateFields = ['id']
const catalogListFields = ['catalogItems']

const applicationCreateFields = ['id']
const applicationListFields = ['applications']

const microserviceCreateFields = ['uuid']
const microserviceListFields = ['microservices']

const volumeMappingCreateFields = ['id']

const registryCreateFields = ['id']
const registryListFields = ['registries']

const tunnelListFields = ['tunnels']

async function seedTestData () {
  // Create system agent which hosts default router
  console.log('\n=============================\nSeeding database..')
  console.log('\nCreating system fog')
  await FogService.createFogEndPoint({
    name: 'default-router',
    fogType: 1,
    isSystem: true,
    routerMode: 'interior',
    messagingPort: 5671,
    edgeRouterPort: 45671,
    interRouterPort: 55671,
    host: 'localhost'
  }, { }, false)
  const defaultRouter = await RouterService.findOne({ isDefault: true })
  if (!defaultRouter) {
    throw new Error('Failed to seed')
  }
}

function testControllerSection () {
  console.log('\n=============================\nStarting controller section..')

  responseHasFields(testCommand('controller status'), controllerStatusFields)
  responseHasFields(testCommand('controller fog-types'), controllerFogTypesFields)
  hasSomeResponse(testCommand('controller version'))
}

function testConfigSection () {
  console.log('\n=============================\nStarting config section..')

  // TODO backup config before this command
  // hasSomeResponse(testCommand("config add -p 1234 -c testPath -k testSslPath -i testIntermediateCertPath" +
  //   " -h testHomeUrl -a testEmailAddress -w testEmailPassword -s testEmailService -d testLogDir -z 555"));
  hasSomeResponse(testCommand('config list'))
  responseEquals(testCommand('config dev-mode -o'), 'Dev mode state updated successfully.')
}

function testTunnelSection () {
  console.log('\n=============================\nStarting tunnel section..')

  responseContains(testCommand('tunnel update -i testIoFogUuid -u testUsername -p testPassword -s 127.0.0.1 ' +
    '-k testRSAKeyPath -o 2048 -a open'), 'ENOENT: no such file or directory')
  responseHasFields(testCommand('tunnel list'), tunnelListFields)
}

function testIoFogSection () {
  console.log('\n=============================\nStarting iofog section..')

  try {
    const ioFogCreateResponse = responseHasFields(testCommand('iofog add -n ioFog1 -l testLocation -t 55 -g 65' +
      ' -d testDescription -D testDockerUrl -M 55 -T testDiskDirectoryString -m 65 -c 24 -G 1 -Y testLogDirectory ' +
      ' -s 25 -F 27 -Q 26 -B -W -A -y 1 -u '), ioFogCreateFields)
    const ioFogUuid = ioFogCreateResponse.uuid
    responseEquals(testCommand('iofog update -i ' + ioFogUuid + ' -n ioFog1 -l testLocation -t 55 -g 65 ' +
      '-d testDescription -D testDockerUrl -M 55 -T testDiskDirectoryString -m 65 -c 24 -G 1 -Y testLogDirectory ' +
      ' -s 25 -F 27 -Q 26 -B -W -A -y 1 -L INFO -p 65 -k 95 -u '), 'ioFog node has been updated successfully.')
    responseHasFields(testCommand('iofog list'), ioFogListFields)
    responseHasFields(testCommand('iofog info -i ' + ioFogUuid), ioFogCreateFields)
    responseHasFields(testCommand('iofog provisioning-key -i ' + ioFogUuid), ioFogProvisioningFields)
    responseEquals(testCommand('iofog reboot -i ' + ioFogUuid), 'ioFog reboot command has been set successfully')
    responseEquals(testCommand('iofog prune -i ' + ioFogUuid), 'ioFog prune command has been set successfully')
    responseEquals(testCommand('iofog version -i ' + ioFogUuid + ' -v upgrade'),
      'ioFog version command has been set successfully')
    hasSomeResponse(testCommand('iofog hal-hw -i ' + ioFogUuid))
    hasSomeResponse(testCommand('iofog hal-usb -i ' + ioFogUuid))
    responseEquals(testCommand('iofog remove -i ' + ioFogUuid + ' -u '), 'ioFog node has been removed successfully')
    executeCommand('user remove -e fogUser@domain.com')
  } catch (exception) {
    executeCommand('user remove -e fogUser@domain.com')
  }
}

function testCatalogSection () {
  console.log('\n=============================\nStarting catalog section..')

  const registryCreateResponse = responseHasFields(executeCommand('registry add -U testRegistryUri -b -l testUserName' +
    ' -p testPassword -e testEmail@gmail.com -u '), registryCreateFields)
  const registryId = registryCreateResponse.id

  try {
    const catalogCreateResponse = responseHasFields(testCommand('catalog add -n testCatalogItem1 -d testDescription' +
      ' -c testCategory -x testIntelImage -a testArmImage -p testPublisher -s 15 -r 15 -t testPicture -g ' +
      registryId + ' -I testInputType -F testInputFormat -O testOutputType -T testOutputFormat ' +
      '-X \'{}\' -u '), catalogCreateFields)
    const catalogId = catalogCreateResponse.id
    responseEquals(testCommand('catalog update -i ' + catalogId + ' -n testCatalogItem2 -d testDescription' +
      ' -c testCategory -x testIntelImage -a testArmImage -p testPublisher -s 15 -r 15 -t testPicture -g ' +
      registryId + ' -I testInputType -F testInputFormat -O testOutputType -T testOutputFormat -X \'{}\''),
    'Catalog item has been updated successfully.')
    responseHasFields(testCommand('catalog list | tr "\\0" "\\n"'), catalogListFields)
    responseHasFields(testCommand('catalog info -i ' + catalogId), catalogCreateFields)
    responseEquals(testCommand('catalog remove -i ' + catalogId), 'Catalog item has been removed successfully')
    executeCommand('registry remove -i ' + registryId)
    executeCommand('user remove -e catalogUser@domain.com')
  } catch (exception) {
    executeCommand('registry remove -i ' + registryId)
    executeCommand('user remove -e catalogUser@domain.com')
  }
}

function testApplicationSection () {
  console.log('\n=============================\nStarting application section..')

  try {
    const applicationCreateResponse = responseHasFields(testCommand('application add -n test-application-1 -d testDescription' +
      ' -a -u '), applicationCreateFields)
    const name = applicationCreateResponse.name
    responseEquals(testCommand('application update -n ' + name + ' -d testDescription -a' + ' -u '),
      'Application updated successfully.')
    responseHasFields(testCommand('application list'), applicationListFields)
    responseHasFields(testCommand('application info -n ' + name), applicationCreateFields)
    responseEquals(testCommand('application remove -n ' + name + ' -u '), 'Application removed successfully.')
    executeCommand('user remove -e applicationUser@domain.com')
  } catch (exception) {
    executeCommand('user remove -e applicationUser@domain.com')
  }
}

function testMicroserviceSection () {
  console.log('\n=============================\nStarting microservice section..')

  const registryCreateResponse = responseHasFields(executeCommand('registry add -U testRegistryUri -b -l testUserName' +
    ' -p testPassword -e testEmail@gmail.com -u '), registryCreateFields)
  const registryId = registryCreateResponse.id

  const catalogCreateResponse = responseHasFields(executeCommand('catalog add -n testCatalogItem1 -d testDescription' +
    ' -c testCategory -x testIntelImage -a testArmImage -p testPublisher -s 15 -r 15 -t testPicture -g ' +
    registryId + ' -I testInputType -F testInputFormat -O testOutputType -T testOutputFormat ' +
    '-X \'{}\' -u '), catalogCreateFields)
  const catalogId = catalogCreateResponse.id

  const applicationCreateResponse = responseHasFields(executeCommand('application add -n test-application1 -d testDescription' +
    ' -a -u '), applicationCreateFields)
  const applicationId = applicationCreateResponse.name

  const ioFogCreateResponse = responseHasFields(executeCommand('iofog add -n ioFog2 -l testLocation -t 55 -g 65 ' +
    '-d testDescription -D testDockerUrl -M 55 -T testDiskDirectoryString -m 65 -c 24 -G 1 -Y testLogDirectory ' +
    ' -s 25 -F 27 -Q 26 -B -W -A -y 1 -u '), ioFogCreateFields)
  const ioFogUuid = ioFogCreateResponse.uuid

  try {
    const microserviceCreateResponse = responseHasFields(testCommand('microservice add -n microservice-name-1' +
      ' -c ' + catalogId + ' -F ' + applicationId + ' -I ' + ioFogUuid + ' -g \'{}\' -v /host_src:/container_src:rw -l 15 -R' +
      ' -p 80:8080:false -u '), microserviceCreateFields)
    const microserviceUuid = microserviceCreateResponse.uuid
    responseEquals(testCommand('microservice update -i ' + microserviceUuid + ' -n microservice-name-2' +
      ' -I ' + ioFogUuid + ' -g \'{}\' -v /host_src:/container_src:rw -l 15 -R -w'),
    'Microservice has been updated successfully.')
    responseHasFields(testCommand('microservice list'), microserviceListFields)
    responseHasFields(testCommand('microservice info -i ' + microserviceUuid), microserviceCreateFields)
    responseContains(testCommand('microservice route-create -T ' + microserviceUuid + ':' + microserviceUuid),
      'has been created successfully')
    responseContains(testCommand('microservice route-remove -T ' + microserviceUuid + ':' + microserviceUuid),
      'has been removed successfully')
    responseContains(testCommand('microservice port-mapping-create -i ' + microserviceUuid + ' -P 90:9090:false'),
      'Port mapping has been created successfully.')
    responseIsArray(testCommand('microservice port-mapping-list -i ' + microserviceUuid))
    responseEquals(testCommand('microservice port-mapping-remove -i ' + microserviceUuid + ' -b 90'),
      'Port mapping has been removed successfully.')
    const volumeMappingCreateResponse = responseHasFields(testCommand('microservice volume-mapping-create' +
      ' -i ' + microserviceUuid + ' -P /test_path:/container_test_path:rw'), volumeMappingCreateFields)
    const volumeMappingId = volumeMappingCreateResponse.id
    responseIsArray(testCommand('microservice volume-mapping-list -i ' + microserviceUuid))
    responseContains(testCommand('microservice volume-mapping-remove -i ' + microserviceUuid + ' -m ' + volumeMappingId),
      'Volume mapping has been deleted successfully.')
    responseEquals(testCommand('microservice remove -i ' + microserviceUuid),
      'Microservice has been removed successfully.')
    executeCommand('iofog remove -i ' + ioFogUuid)
    executeCommand('application remove -i ' + applicationId)
    executeCommand('catalog remove -i ' + catalogId)
    executeCommand('user remove -e microserviceUser@domain.com')
  } catch (exception) {
    executeCommand('iofog remove -i ' + ioFogUuid)
    executeCommand('application remove -i ' + applicationId)
    executeCommand('catalog remove -i ' + catalogId)
    executeCommand('registry remove -i ' + registryId)
    executeCommand('user remove -e microserviceUser@domain.com')
  }
}

function testRegistrySection () {
  console.log('\n=============================\nStarting registry section..')

  try {
    const registryCreateResponse = responseHasFields(testCommand('registry add -U testRegistryUri -b -l testUserName' +
      ' -p testPassword -e testEmail@gmail.com -u '), registryCreateFields)
    const registryId = registryCreateResponse.id
    responseEquals(testCommand('registry update -i ' + registryId + ' -U testRegistryUri -b -l testUserName' +
      '    -p testPassword -e testEmail@gmail.com'), 'Registry has been updated successfully.')
    responseHasFields(testCommand('registry list'), registryListFields)
    responseEquals(testCommand('registry remove -i ' + registryId), 'Registry has been removed successfully.')
    executeCommand('user remove -e registryUser@domain.com')
  } catch (exception) {
    executeCommand('user remove -e registryUser@domain.com')
  }
}

function testDiagnosticsSection () {
  console.log('\n=============================\nStarting diagnostics section..')

  const registryCreateResponse = responseHasFields(executeCommand('registry add -U testRegistryUri -b -l testUserName' +
    ' -p testPassword -e testEmail@gmail.com -u '), registryCreateFields)
  const registryId = registryCreateResponse.id

  const catalogCreateResponse = responseHasFields(executeCommand('catalog add -n testCatalogItem1 -d testDescription' +
    ' -c testCategory -x testIntelImage -a testArmImage -p testPublisher -s 15 -r 15 -t testPicture -g ' +
    registryId + ' -I testInputType -F testInputFormat -O testOutputType -T testOutputFormat ' +
    '-X \'{}\' -u '), catalogCreateFields)
  const catalogId = catalogCreateResponse.id

  const applicationCreateResponse = responseHasFields(executeCommand('application add -n test-application1 -d testDescription' +
    ' -a -u '), applicationCreateFields)
  const applicationId = applicationCreateResponse.name

  const ioFogCreateResponse = responseHasFields(executeCommand('iofog add -n ioFog3 -l testLocation -t 55 -g 65' +
    ' -d testDescription -D testDockerUrl -M 55 -T testDiskDirectoryString -m 65 -c 24 -G 1 -Y testLogDirectory ' +
    ' -s 25 -F 27 -Q 26 -B -W -A -y 1 -u '), ioFogCreateFields)
  const ioFogUuid = ioFogCreateResponse.uuid

  const microserviceCreateResponse = responseHasFields(executeCommand('microservice add -n microservice-name-1' +
    ' -c ' + catalogId + ' -F ' + applicationId + ' -I ' + ioFogUuid + ' -g \'{}\' -v /host_src:/container_src:rw -l 15 -R' +
    ' -p 80:8080:false -u '), microserviceCreateFields)
  const microserviceUuid = microserviceCreateResponse.uuid

  try {
    responseEquals(testCommand('diagnostics strace-update -e -i ' + microserviceUuid),
      'Microservice strace has been enabled')
    responseContains(testCommand('diagnostics strace-info -f string -i ' + microserviceUuid),
      'Microservice strace data has been retrieved successfully.')
    responseContains(testCommand('diagnostics strace-ftp-post -i ' + microserviceUuid + ' -h ftpTestHost -p 2024' +
      ' -u testFtpUser -s testFtpPass -d ftpTestDestination'), 'FTP error')
    responseContains(testCommand('diagnostics image-snapshot-create -i ' + microserviceUuid),
      'Microservice image snapshot has been created successfully.')
    responseContains(testCommand('diagnostics image-snapshot-get -i ' + microserviceUuid),
      'Image snapshot is not available for this microservice.')
    executeCommand('microservice remove -i ' + microserviceUuid)
    executeCommand('iofog remove -i ' + ioFogUuid)
    executeCommand('application remove -i ' + applicationId)
    executeCommand('catalog remove -i ' + catalogId)
    executeCommand('registry remove -i ' + registryId)
    executeCommand('user remove -e diagnosticsUser@domain.com')
  } catch (exception) {
    executeCommand('microservice remove -i ' + microserviceUuid)
    executeCommand('iofog remove -i ' + ioFogUuid)
    executeCommand('application remove -i ' + applicationId)
    executeCommand('catalog remove -i ' + catalogId)
    executeCommand('registry remove -i ' + registryId)
    executeCommand('user remove -e diagnosticsUser@domain.com')
  }
}

function testCommand (command) {
  console.log('\n Testing command \'' + command + '\'')
  testsCounter++
  return executeCommand(command)
}

function executeCommand (command) {
  let response = execSync('node ./src/main.js ' + command, options)
  response = response.replace(/\r?\n?/g, '') // remove line breaks
  return response
}

function hasSomeResponse (response) {
  if (response === undefined || response === null) {
    testsFailed++
    console.log('\'hasSomeResponse\' test failed with response: ' + JSON.stringify(response))
  }
}

function responseIsArray (jsonResponse) {
  try {
    const response = JSON.parse(jsonResponse)
    if (!Array.isArray(response)) {
      testsFailed++
      console.log('\'responseIsArray\' test failed with response: ' + JSON.stringify(response))
    }
  } catch (exception) {
    testsFailed++
    console.log('\'responseIsArray\' test failed due to invalid JSON with response: ' + JSON.stringify(jsonResponse))
  }
}

function responseHasFields (jsonResponse, fields) {
  try {
    const response = JSON.parse(jsonResponse)
    for (const field of fields) {
      if (!response.hasOwnProperty(field)) {
        testsFailed++
        console.log('\'responseHasFields\' test failed with response: ' + JSON.stringify(response))
      }
    }

    return response
  } catch (exception) {
    testsFailed++
    console.log('\'responseHasFields\' test failed due to invalid JSON with response: ' + JSON.stringify(jsonResponse))
  }
}

function responseEquals (response, expectedResponse) {
  if (response !== expectedResponse) {
    testsFailed++
    console.log('\'responseEquals\' test failed with response: ' + JSON.stringify(response))
  }
}

function responseContains (response, expectedResponsePart) {
  if (!response.includes(expectedResponsePart)) {
    testsFailed++
    console.log('\'responseContains\' test failed with response: ' + JSON.stringify(response))
  }
}

async function cliTest () {
  try {
    backupDBs()
    // create new DBs
    init()
    await seedTestData()

    testControllerSection()
    testConfigSection()
    testTunnelSection()
    testIoFogSection()
    testCatalogSection()
    testApplicationSection()
    testMicroserviceSection()
    testRegistrySection()
    testDiagnosticsSection()

    restoreDBs()
  } catch (exception) {
    restoreDBs()

    console.log('\nException during execution: ')
    console.error(exception)
    process.exit(1)
  }

  if (testsFailed > 0) {
    console.log('\nFailed tests count: ' + testsFailed)
    process.exit(1)
  } else {
    console.log('\nCLI Tests passed successfully.')
  }
}

module.exports = {
  cliTest: cliTest
}
