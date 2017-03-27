**Fog Controller Setup**

1.&ensp;Install fog-controller

	   npm install -g fog-controller

2.&ensp;Create user

	   fog-controller user -add <email> <firstName> <lastName> <password>

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

&emsp;&emsp;&emsp;and &#39;:fabricType&#39; is a FogType


**Usage**

1.&ensp;To view help menu

        fog-controller help

2.&ensp;To view current status

        fog-controller status   

3.&ensp;To view version and license

        fog-controller version
 
**Logs**
- Log files are located at './node_modules/fog-controller/logs/'
- Log files are rotated on daily basis or if a file size exceeds 20 MB 

**System Requirements (Recommended)**
- Processor: 64 bit Dual Core or better
- RAM: 2 GB
- Hard Disk: 10 GB

**Platforms Supported**
- Ubuntu
- macOS Sierra
- Windows

**Configuration Management**

1.&ensp;To list configurations

        fog-controller config -list

2.&ensp;To add a configuration

        fog-controller config -add <key> <value>

Note: Configuration keys can be one of following

- port
- ssl\_key
- intermediate\_cert
- ssl\_cert

To setup HTTPS for fog controller, do following steps:

        fog-controller config -add port 443
        fog-controller config -add ssl_key '/home/certificates/key.pem'
        fog-controller config -add intermediate_cert '/home/certificates/gs_intermediate_ca.crt'
        fog-controller config -add ssl_cert '/home/certificates/certificate.pem'

3.&ensp;To remove a configuration

        fog-controller config -remove <key>


**User Managment**

1.&ensp;To list users

        fog-controller user -list

2.&ensp;To add a user

        fog-controller user -add <email> <firstName> <lastName> <password>

3.&ensp;To remove a user

        fog-controller user -remove <email>

4.&ensp;To reset password

        fog-controller user -generateToken <email>


**ComSat Managment**

1.&ensp;To list all ComSat(s)

        fog-controller comsat -list

2.&ensp;To add a ComSat

        fog-controller comsat -add <name> <domain> <publicIP>

3.&ensp;To remove a ComSat

        fog-controller comsat -remove <ID>

**Execute Fog-Controller on startup**

&ensp;For Windows, do following steps:

&ensp;&ensp;&ensp;- Open a new text document

&ensp;&ensp;&ensp;- Insert following line in it: 

        fog-controller start

&ensp;&ensp;&ensp;- Save text document with extension as ‘.bat’

&ensp;&ensp;&ensp;- Put the .bat file in 

        “C:\Users\username\AppData\Roaming\Microsoft\Windows\StartMenu\Programs\Startup\” 
        (replacing ‘username’ with the name of your user).

&ensp;For Ubuntu, do following steps:

&ensp;&ensp;&ensp;- Create a file as ‘fog-controller.conf’ in /etc/init/ directory with following command:

        sudo gedit /etc/init/fog-controller.conf

&ensp;&ensp;&ensp;- Save following text in the file:

        # fog-controller.conf
        description "Fog Controller project @ iotracks.com"
        start on startup
        stop on shutdown
        post-start script
                mkdir -p /usr/local/lib/node_modules/fog-controller
                cd /usr/local/lib/node_modules/fog-controller
                sudo fog-controller start
        end script
        respawn