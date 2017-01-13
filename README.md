
**Fog Controller Setup**

1.&ensp;Install fog-controller

	   npm install –g fog-controller

2.&ensp;Create user

	   fog-controller user -add <email> <firstName> <lastName>

3.&ensp;Start fog-controller

	   fog-controller start

4.&ensp;Open your browser and hit following endpoints to setup IOFog, provision key and fog access token.

-  Create Fog

&emsp;&emsp;&emsp;[http://localhost:3000/api/v2/instance/create/type/:type?userId=:userAccessToken](http://localhost:3000/api/v2/instance/create/type/:type?userId=:userAccessToken)

&emsp;&emsp;&emsp;where &#39;:type&#39; is FogType which can be 1 for Standard Linux (x86) OR 2 for ARM Linux 

&emsp;&emsp;&emsp;and &#39;:userAccessToken&#39; is obtained by creating user

- Fog provisioning

&emsp;&emsp;&emsp;[http://localhost:3000/api/v2/authoring/fabric/provisionkey/instanceid/:instanceId](http://localhost:3000/api/v2/authoring/fabric/provisionkey/instanceid/:instanceId)

&emsp;&emsp;&emsp;where  :instanceId&#39; is obtained by creating fog. This provision key can be provided to ioFog for provisioning.

- Create fog access token

&emsp;&emsp;&emsp;[http://localhost:3000/api/v2/instance/provision/key/:provisionKey/fabrictype/:fabricType](http://localhost:3000/api/v2/instance/provision/key/:provisionKey/fabrictype/:fabricType)

&emsp;&emsp;&emsp;where &#39;:provisionKey&#39; is obtained by provisioning fog                                                        

&emsp;&emsp;&emsp; and &#39;:fabricType&#39; is a FogType



**Fog Controller Configuration**

1.&ensp;To start fog-controller
          
        fog-controller start

2.&ensp;To set configurations

        fog-controller set <key> <value>

Note: Configuration keys can be one of following

- PORT
- SSL\_KEY
- SSL\_CERT
- INTERMEDIATE\_CERT

To setup HTTPS for fog controller, do following steps:

        fog-controller set PORT 443
        fog-controller set SSL_KEY '/home/certificates/key.pem'
        fog-controller set INTERMEDIATE_CERT '/home/certificates/gs_intermediate_ca.crt'
        fog-controller set SSL_CERT '/home/certificates/certificate.pem'

3.&ensp;To list the users

        fog-controller user
        OR
        fog-controller user -list

4.&ensp;To add a user

        fog-controller user -add <email> <firstName> <lastName>

5.&ensp;To remove a user

        fog-controller user -remove <email>

6.&ensp;To reset password

        fog-controller user -generateToken <email>