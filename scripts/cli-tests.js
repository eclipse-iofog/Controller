/*
 *  *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
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
const controllerEmailActivationFields = ['isEmailActivationEnabled']
const controllerFogTypesFields = ['fogTypes']

const userCreateFields = ['id']
const userAccessTokenFields = ['accessToken']

const ioFogCreateFields = ['uuid']
const ioFogListFields = ['fogs']
const ioFogProvisioningFields = ['key', 'expirationTime']

const catalogCreateFields = ['id']
const catalogListFields = ['catalogItems']

const flowCreateFields = ['id']
const flowListFields = ['flows']

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
    messagingPort: 5672,
    edgeRouterPort: 56722,
    interRouterPort: 56721,
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
  responseHasFields(testCommand('controller email-activation'), controllerEmailActivationFields)
  responseHasFields(testCommand('controller fog-types'), controllerFogTypesFields)
  hasSomeResponse(testCommand('controller version'))
}

function testUserSection () {
  console.log('\n=============================\nStarting user section..')

  responseHasFields(testCommand('user add -f John -l Doe -e user@domain.com -p \'#Bugs4Fun\''), userCreateFields)
  responseEquals(testCommand('user update -f John2 -l Doe2 -e user@domain.com -p \'#Bugs4Fun34\''),
    'User updated successfully.')
  responseIsArray(testCommand('user list'))
  responseHasFields(testCommand('user generate-token -e user@domain.com'), userAccessTokenFields)
  responseEquals(testCommand('user suspend -e user@domain.com'), 'User suspended successfully.')
  responseEquals(testCommand('user activate -e user@domain.com'), 'User activated successfully.')
  responseEquals(testCommand('user remove -e user@domain.com'), 'User removed successfully.')
}

function testConfigSection () {
  console.log('\n=============================\nStarting config section..')

  // TODO backup config before this command
  // hasSomeResponse(testCommand("config add -p 1234 -c testPath -k testSslPath -i testIntermediateCertPath" +
  //   " -h testHomeUrl -a testEmailAddress -w testEmailPassword -s testEmailService -d testLogDir -z 555"));
  hasSomeResponse(testCommand('config list'))
  responseEquals(testCommand('config dev-mode -o'), 'Dev mode state updated successfully.')
  responseEquals(testCommand('config email-activation -f'), 'Email activation state updated successfully.')
}

function testTunnelSection () {
  console.log('\n=============================\nStarting tunnel section..')

  responseContains(testCommand('tunnel update -i testIoFogUuid -u testUsername -p testPassword -s 127.0.0.1 ' +
    '-k testRSAKeyPath -o 2048 -a open'), 'ENOENT: no such file or directory')
  responseHasFields(testCommand('tunnel list'), tunnelListFields)
}

function testIoFogSection () {
  console.log('\n=============================\nStarting iofog section..')

  const userCreateResponse = responseHasFields(executeCommand('user add -f John -l Doe -e fogUser@domain.com' +
    ' -p \'#Bugs4Fun\''), userCreateFields)
  const userId = userCreateResponse.id

  try {
    const ioFogCreateResponse = responseHasFields(testCommand('iofog add -n ioFog1 -l testLocation -t 55 -g 65' +
      ' -d testDescription -D testDockerUrl -M 55 -T testDiskDirectoryString -m 65 -c 24 -G 1 -Y testLogDirectory ' +
      '-C 15 -s 25 -F 27 -Q 26 -B -W -A -y 1 -u ' + userId), ioFogCreateFields)
    const ioFogUuid = ioFogCreateResponse.uuid
    responseEquals(testCommand('iofog update -i ' + ioFogUuid + ' -n ioFog1 -l testLocation -t 55 -g 65 ' +
      '-d testDescription -D testDockerUrl -M 55 -T testDiskDirectoryString -m 65 -c 24 -G 1 -Y testLogDirectory ' +
      '-C 15 -s 25 -F 27 -Q 26 -B -W -A -y 1 -L INFO -p 65 -k 95 -u ' + userId), 'ioFog node has been updated successfully.')
    responseHasFields(testCommand('iofog list'), ioFogListFields)
    responseHasFields(testCommand('iofog info -i ' + ioFogUuid), ioFogCreateFields)
    responseHasFields(testCommand('iofog provisioning-key -i ' + ioFogUuid), ioFogProvisioningFields)
    responseEquals(testCommand('iofog reboot -i ' + ioFogUuid), 'ioFog reboot command has been set successfully')
    responseEquals(testCommand('iofog prune -i ' + ioFogUuid), 'ioFog prune command has been set successfully')
    responseEquals(testCommand('iofog version -i ' + ioFogUuid + ' -v upgrade'),
      'ioFog version command has been set successfully')
    hasSomeResponse(testCommand('iofog hal-hw -i ' + ioFogUuid))
    hasSomeResponse(testCommand('iofog hal-usb -i ' + ioFogUuid))
    responseEquals(testCommand('iofog remove -i ' + ioFogUuid + ' -u ' + userId), 'ioFog node has been removed successfully')
    executeCommand('user remove -e fogUser@domain.com')
  } catch (exception) {
    executeCommand('user remove -e fogUser@domain.com')
  }
}

function testCatalogSection () {
  console.log('\n=============================\nStarting catalog section..')

  const userCreateResponse = responseHasFields(executeCommand('user add -f John -l Doe -e catalogUser@domain.com' +
    ' -p \'#Bugs4Fun\''), userCreateFields)
  const userId = userCreateResponse.id
  const registryCreateResponse = responseHasFields(executeCommand('registry add -U testRegistryUri -b -l testUserName' +
    ' -p testPassword -e testEmail@gmail.com -u ' + userId), registryCreateFields)
  const registryId = registryCreateResponse.id

  try {
    const catalogCreateResponse = responseHasFields(testCommand('catalog add -n testCatalogItem1 -d testDescription' +
      ' -c testCategory -x testIntelImage -a testArmImage -p testPublisher -s 15 -r 15 -t testPicture -g ' +
      registryId + ' -I testInputType -F testInputFormat -O testOutputType -T testOutputFormat ' +
      '-X \'{}\' -u ' + userId), catalogCreateFields)
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

function testFlowSection () {
  console.log('\n=============================\nStarting flow section..')

  const userCreateResponse = responseHasFields(executeCommand('user add -f John -l Doe -e flowUser@domain.com' +
    ' -p \'#Bugs4Fun\''), userCreateFields)
  const userId = userCreateResponse.id

  try {
    const flowCreateResponse = responseHasFields(testCommand('flow add -n test-flow-1 -d testDescription' +
      ' -a -u ' + userId), flowCreateFields)
    const name = flowCreateResponse.name
    responseEquals(testCommand('flow update -n ' + name + ' -d testDescription -a' + ' -u ' + userId),
      'Flow updated successfully.')
    responseHasFields(testCommand('flow list'), flowListFields)
    responseHasFields(testCommand('flow info -n ' + name), flowCreateFields)
    responseEquals(testCommand('flow remove -n ' + name + ' -u ' + userId), 'Flow removed successfully.')
    executeCommand('user remove -e flowUser@domain.com')
  } catch (exception) {
    executeCommand('user remove -e flowUser@domain.com')
  }
}

function testMicroserviceSection () {
  console.log('\n=============================\nStarting microservice section..')

  const userCreateResponse = responseHasFields(executeCommand('user add -f John -l Doe -e microserviceUser@domain.com' +
    ' -p \'#Bugs4Fun\''), userCreateFields)
  const userId = userCreateResponse.id

  const registryCreateResponse = responseHasFields(executeCommand('registry add -U testRegistryUri -b -l testUserName' +
    ' -p testPassword -e testEmail@gmail.com -u ' + userId), registryCreateFields)
  const registryId = registryCreateResponse.id

  const catalogCreateResponse = responseHasFields(executeCommand('catalog add -n testCatalogItem1 -d testDescription' +
    ' -c testCategory -x testIntelImage -a testArmImage -p testPublisher -s 15 -r 15 -t testPicture -g ' +
    registryId + ' -I testInputType -F testInputFormat -O testOutputType -T testOutputFormat ' +
    '-X \'{}\' -u ' + userId), catalogCreateFields)
  const catalogId = catalogCreateResponse.id

  const flowCreateResponse = responseHasFields(executeCommand('flow add -n test-flow1 -d testDescription' +
    ' -a -u ' + userId), flowCreateFields)
  const flowId = flowCreateResponse.name

  const ioFogCreateResponse = responseHasFields(executeCommand('iofog add -n ioFog2 -l testLocation -t 55 -g 65 ' +
    '-d testDescription -D testDockerUrl -M 55 -T testDiskDirectoryString -m 65 -c 24 -G 1 -Y testLogDirectory ' +
    '-C 15 -s 25 -F 27 -Q 26 -B -W -A -y 1 -u ' + userId), ioFogCreateFields)
  const ioFogUuid = ioFogCreateResponse.uuid

  try {
    const microserviceCreateResponse = responseHasFields(testCommand('microservice add -n microserviceName1' +
      ' -c ' + catalogId + ' -F ' + flowId + ' -I ' + ioFogUuid + ' -g \'{}\' -v /host_src:/container_src:rw -l 15 -R' +
      ' -p 80:8080:false -u ' + userId), microserviceCreateFields)
    const microserviceUuid = microserviceCreateResponse.uuid
    responseEquals(testCommand('microservice update -i ' + microserviceUuid + ' -n microserviceName2' +
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
    executeCommand('flow remove -i ' + flowId)
    executeCommand('catalog remove -i ' + catalogId)
    executeCommand('user remove -e microserviceUser@domain.com')
  } catch (exception) {
    executeCommand('iofog remove -i ' + ioFogUuid)
    executeCommand('flow remove -i ' + flowId)
    executeCommand('catalog remove -i ' + catalogId)
    executeCommand('registry remove -i ' + registryId)
    executeCommand('user remove -e microserviceUser@domain.com')
  }
}

function testRegistrySection () {
  console.log('\n=============================\nStarting registry section..')

  const userCreateResponse = responseHasFields(executeCommand('user add -f John -l Doe -e registryUser@domain.com' +
    ' -p \'#Bugs4Fun\''), userCreateFields)

  try {
    const userId = userCreateResponse.id
    const registryCreateResponse = responseHasFields(testCommand('registry add -U testRegistryUri -b -l testUserName' +
      ' -p testPassword -e testEmail@gmail.com -u ' + userId), registryCreateFields)
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

  const userCreateResponse = responseHasFields(executeCommand('user add -f John -l Doe -e diagnosticsUser@domain.com' +
    ' -p \'#Bugs4Fun\''), userCreateFields)
  const userId = userCreateResponse.id

  const registryCreateResponse = responseHasFields(executeCommand('registry add -U testRegistryUri -b -l testUserName' +
    ' -p testPassword -e testEmail@gmail.com -u ' + userId), registryCreateFields)
  const registryId = registryCreateResponse.id

  const catalogCreateResponse = responseHasFields(executeCommand('catalog add -n testCatalogItem1 -d testDescription' +
    ' -c testCategory -x testIntelImage -a testArmImage -p testPublisher -s 15 -r 15 -t testPicture -g ' +
    registryId + ' -I testInputType -F testInputFormat -O testOutputType -T testOutputFormat ' +
    '-X \'{}\' -u ' + userId), catalogCreateFields)
  const catalogId = catalogCreateResponse.id

  const flowCreateResponse = responseHasFields(executeCommand('flow add -n test-flow1 -d testDescription' +
    ' -a -u ' + userId), flowCreateFields)
  const flowId = flowCreateResponse.name

  const ioFogCreateResponse = responseHasFields(executeCommand('iofog add -n ioFog3 -l testLocation -t 55 -g 65' +
    ' -d testDescription -D testDockerUrl -M 55 -T testDiskDirectoryString -m 65 -c 24 -G 1 -Y testLogDirectory ' +
    '-C 15 -s 25 -F 27 -Q 26 -B -W -A -y 1 -u ' + userId), ioFogCreateFields)
  const ioFogUuid = ioFogCreateResponse.uuid

  const microserviceCreateResponse = responseHasFields(executeCommand('microservice add -n microserviceName1' +
    ' -c ' + catalogId + ' -F ' + flowId + ' -I ' + ioFogUuid + ' -g \'{}\' -v /host_src:/container_src:rw -l 15 -R' +
    ' -p 80:8080:false -u ' + userId), microserviceCreateFields)
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
    executeCommand('flow remove -i ' + flowId)
    executeCommand('catalog remove -i ' + catalogId)
    executeCommand('registry remove -i ' + registryId)
    executeCommand('user remove -e diagnosticsUser@domain.com')
  } catch (exception) {
    executeCommand('microservice remove -i ' + microserviceUuid)
    executeCommand('iofog remove -i ' + ioFogUuid)
    executeCommand('flow remove -i ' + flowId)
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
    testUserSection()
    testConfigSection()
    testTunnelSection()
    testIoFogSection()
    testCatalogSection()
    testFlowSection()
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
