**Fog Controller Usage**

 $ fog-controller <*command*> <*options*>

**Command List**

 start          -- Start fog-controller service. <br>
 stop           -- Stop fog-controller service. <br>
 controller     -- Display fog-controller service information. <br>
 help           -- Display usage information. <br>
 version        -- Display fog-controller service version. <br>
 user           -- User operations. <br>
 config         -- Set/Display fog-controller service config. <br>
 connector      -- Connector operations. <br>
 tunnel         -- Tunnel operations. <br>
 iofog          -- ioFog nodes operations. <br>
 catalog        -- Microservices catalog operations. <br>
 flow           -- Application flow operations. <br>
 microservice   -- Microservice instance operations. <br>
 registry       -- Registries instance operations. <br>
 diagnostics    -- Diagnostic instance operations. <br>
<br>
<br>
<br>

**Controller**

$ fog-controller controller <*command*> <*options*>

**Command List**

 - status             -- Display fog-controller service status.
 - email-activation   -- Is email activation.
 - fog-types          -- List all Fog-types.
<br>
<br>
<br>

**User**

$ fog-controller user <*command*> <*options*>

**Command List**

 - add              -- Add a new user.
 - update           -- Update existing user.
 - remove           -- Delete a user.
 - list             -- List all users.
 - generate-token   -- Generate token for a user.
 - activate         -- Activate a user.
 - suspend          -- Suspend a user.

*add*

 -f, --first-name string    (User's first name) <br>
 -l, --last-name string     (User's last name) <br>
 -e, --email string         (User's email address) <br>
 -p, --password string      (User's password) <br>

*update -e* <*email*>

 -f, --first-name string   (User's first name) <br>
 -l, --last-name string    (User's last name) <br>
 -p, --password string     (User's password) <br>

*remove*

 -e, --email string   (User's email address)

*generate-token*

 -e, --email string   (User's email address)

*activate*

 -e, --email string   (User's email address)

*suspend*

 -e, --email string   (User's email address)
 
 **Example**
 
 node src/main.js user add -f test1 -l test2 -e test@gmail.com -p password1 <br>
<br>
<br>
<br>

**Config** <br>

$ fog-controller config <*options*>
 
 *add*

 -p, --port number                (Port) <br>
 -c, --ssl-cert string            (Path to SSL certificate file) <br>
 -k, --ssl-key string             (Path to SSL key file) <br>
 -i, --intermediate-cert string   (Path to SSL intermediate certificate file) <br>
 -m, --email-activation-on        (Email activation required) <br>
 -n, --email-activation-off       (Email activation not required) <br>
 -a, --email-address string       (Email address to send activations from) <br>
 -w, --email-password string      (Email password to send activations from) <br>
 -s, --email-service string       (Email service to send activations) <br>
 -d, --log-dir string             (Log files directory) <br>
 -z, --log-size number            (Log files size (MB)) <br>
 
 *list*<br>
 
 *dev-mode*<br>

 -o, --on     (Enable dev mode)<br>
 -f, --off    (Disable dev mode)<br>
 
<br>
<br>
<br>
 
**Connector** <br>

$ fog-controller connector <*command*> <*options*>

**Command List**

 add      -- Add a new Connector. <br>
 update   -- Update existing Connector. <br>
 remove   -- Delete a Connector. <br>
 list     -- List all Connectors. <br>

*add*

 -n, --name string        (Connector name) <br>
 -d, --domain string      (Connector domain name) <br>
 -i, --public-ip string   (Connector public IP address) <br>
 -c, --cert string        (Certificate) <br>
 -S, --self-signed-on     (Switch on self-signed enabled) <br>
 -s, --self-signed-off    (Switch off self-signed disabled) <br>
 -H, --dev-mode-on        (Switch on dev mode) <br>
 -h, --dev-mode-off       (Switch off dev mode) <br>

*update -i* <*public-ip*>

 -n, --name string        (Connector name) <br>
 -d, --domain string      (Connector domain name) <br>
 -c, --cert string        (Certificate) <br>
 -S, --self-signed-on     (Switch on self-signed enabled) <br>
 -s, --self-signed-off    (Switch off self-signed disabled) <br>
 -H, --dev-mode-on        (Switch on dev mode) <br>
 -h, --dev-mode-off       (Switch off dev mode) <br>

*remove*

 -i, --public-ip string   (Connector public IP address)
 
<br>
<br>
<br> 
 
**Tunnel** <br>

$ fog-controller tunnel <*command*> <*options*>

**Command List**

 update   -- Update existing tunnel or create a new one. <br>
 list     -- List all tunnels. <br>

*update -a* <*action*> (Action: can be either 'open' or 'close')

 -u, --username string   (Tunnel username) <br>
 -p, --password string   (Tunnel password) <br>
 -s, --host string       (Tunnel host address) <br>
 -k, --rsa-key string    (Tunnel RSA key) <br>
 -o, --port number       (Tunnel port) <br>
 -f, --iofogUuid string  (Fog UUID) <br>

**Example**<br>
 tunnel update -a close -u dmitry -p dpass -s 127.12.14.52 -k /home/dmitrys/documents/rsa.txt -o 22 -f NH44VjVFnr8946Yr8HPRrJdFZgLN8k7j <br>
 
*list*<br>

**Example**<br>
tunnel list
<br>
<br>
<br>  
 
 **IoFog**
 
 $ fog-controller iofog <*command*> <*options*>

**Command List**

  add                -- Add a new ioFog node. <br>
  update             -- Update existing ioFog node. <br>
  remove             -- Delete an ioFog node. <br>
  list               -- List all ioFog nodes. <br>
  info               -- Get ioFog node settings. <br>
  provisioning-key   -- Get provisioning key for an ioFog node. <br>
  reboot             -- Reboot ioFog node. <br>             
  version            -- Change agent version of ioFog node. <br>
  hal-hw             -- Get HAL Hardware ioFog node data. <br>
  hal-usb            -- Get HAL USB ioFog node data. <br>
  
*add -u* <*user-id*>

  -f, --file string               (ioFog settings JSON file) <br>
  -n, --name string               (ioFog node name) <br>
  -l, --location string           (ioFog node location) <br>
  -t, --latitude number           (ioFog node latitude) <br>
  -g, --longitude number          (ioFog node longitude) <br>
  -d, --description string        (ioFog node description) <br>
  -D, --docker-url string         (ioFog node docker url) <br>
  -M, --disk-limit number         (ioFog node disk usage limit (MB)) <br>
  -T, --disk-directory string     (ioFog node disk directory) <br>
  -m, --memory-limit number       (ioFog node memory usage limit (MB)) <br>
  -c, --cpu-limit number          (ioFog node CPU usage limit (%)) <br>
  -G, --log-limit number          (ioFog node log size limit (MB)) <br>
  -Y, --log-directory string      (ioFog node log files directory) <br>
  -C, --log-file-count number     (ioFog node log files count) <br>
  -s, --status-frequency number   (ioFog node status check frequency (seconds)) <br>
  -F, --change-frequency number   (ioFog node configuration change check frequency (seconds)) <br>
  -Q, --device-frequency number   (ioFog node device scan frequency (seconds)) <br>
  -B, --bluetooth-enable          (Enable bluetooth on ioFog node) <br>
  -b, --bluetooth-disable         (Disable bluetooth on ioFog node) <br>
  -W, --watchdog-enable           (Enable watchdog on ioFog node) <br>
  -w, --watchdog-disable          (Disable watchdog on ioFog node) <br>
  -a, --abs-hw-disable            (Disable hardware abstraction on ioFog node) <br>
  -A, --abs-hw-enable             (Enable hardware abstraction on ioFog node) <br>
  -o, --reboot                    (Reboot ioFog node) <br>
  -y, --fog-type number           (ioFog node architecture type) <br>

*update -i* <*node-id*>

  -f, --file string               (ioFog settings JSON file) <br>
  -n, --name string               (ioFog node name) <br>
  -l, --location string           (ioFog node location) <br>
  -t, --latitude number           (ioFog node latitude) <br>
  -g, --longitude number          (ioFog node longitude) <br>
  -d, --description string        (ioFog node description) <br>
  -D, --docker-url string         (ioFog node docker url) <br>
  -M, --disk-limit number         (ioFog node disk usage limit (MB)) <br>
  -T, --disk-directory string     (ioFog node disk directory) <br>
  -m, --memory-limit number       (ioFog node memory usage limit (MB)) <br>
  -c, --cpu-limit number          (ioFog node CPU usage limit (%)) <br>
  -G, --log-limit number          (ioFog node log size limit (MB)) <br>
  -Y, --log-directory string      (ioFog node log files directory)) <br>
  -C, --log-file-count number     (ioFog node log files count) <br>
  -s, --status-frequency number   (ioFog node status check frequency (seconds)) <br>
  -F, --change-frequency number   (ioFog node configuration change check frequency (seconds)) <br>
  -Q, --device-frequency number   (ioFog node device scan frequency (seconds)) <br>
  -B, --bluetooth-enable          (Enable bluetooth on ioFog node) <br>
  -b, --bluetooth-disable         (Disable bluetooth on ioFog node) <br>
  -W, --watchdog-enable           (Enable watchdog on ioFog node) <br>
  -w, --watchdog-disable          (Disable watchdog on ioFog node) <br>
  -a, --abs-hw-disable            (Disable hardware abstraction on ioFog node) <br>
  -A, --abs-hw-enable             (Enable hardware abstraction on ioFog node) <br>
  -o, --reboot                    (Reboot ioFog node) <br>
  -y, --fog-type number           (ioFog node architecture type) <br>

*remove*

  -i, --node-id string   (ioFog node ID)

*info*

  -i, --node-id string   (ioFog node ID)

*provisioning-key*

  -i, --node-id string   (ioFog node ID)

*reboot*

  -i, --node-id string   (ioFog node ID) 

*version*

  -i, --node-id         string           (ioFog node ID)         
  -v, --version-command string           (ioFog version command) 
  
 *hal-hw*

  -i, --node-id string   (ioFog node ID)<br>

 *hal-usb*

  -i, --node-id string   (ioFog node ID)<br>

*JSON File Schema*

  name: string <br>
  location: string <br>
  latitude: number <br>
  longitude: number <br>
  description: string <br>
  dockerUrl: string <br>
  diskLimit: number <br>
  diskDirectory: string <br>
  memoryLimit: number <br>
  cpuLimit: number <br>
  logLimit: number <br>
  logDirectory: string <br>
  logFileCount: number <br>
  statusFrequency: number <br>
  changeFrequency: number <br>
  deviceScanFrequency: number <br>
  bluetoothEnabled: boolean <br>
  watchdogEnabled: boolean <br>
  abstractedHardwareEnabled: boolean <br>
  reboot: boolean <br>
  fogType: number <br>
  
<br>
<br>
<br>

**Catalog**<br>

$ fog-controller catalog <*command*> <*options*> <br>

**Command List**<br>

 add      -- Add a new catalog item.<br>
 update   -- Update existing catalog item.<br>
 remove   -- Delete a catalog item.<br>
 list     -- List all catalog items.<br>
 info     -- Get catalog item settings.<br>

*add -u* <*user-id*>

 -f, --file string             (Catalog item settings JSON file)<br>
 -n, --name string             (Catalog item name)<br>
 -d, --description string      (Catalog item description)<br>
 -c, --category string         (Catalog item category)<br>
 -x, --x86-image string        (x86 docker image name)<br>
 -a, --arm-image string        (ARM docker image name)<br>
 -p, --publisher string        (Catalog item publisher name)<br>
 -s, --disk-required number    (Amount of disk required to run the microservice (MB))<br>
 -r, --ram-required number     (Amount of RAM required to run the microservice (MB))<br>
 -t, --picture string          (Catalog item picture)<br>
 -P, --public                  (Public catalog item)<br>
 -V, --private                 (Private catalog item)<br>
 -g, --registry-id number      (Catalog item docker registry ID)<br>
 -I, --input-type string       (Catalog item input type)<br>
 -F, --input-format string     (Catalog item input format)<br>
 -O, --output-type string      (Catalog item output type)<br>
 -T, --output-format string    (Catalog item output format)<br>
 -X, --config-example string   (Catalog item config example)<br>

*update -i* <*item-id*><br>

 -f, --file string             (Catalog item settings JSON file)<br>
 -n, --name string             (Catalog item name)<br>
 -d, --description string      (Catalog item description)<br>
 -c, --category string         (Catalog item category)<br>
 -x, --x86-image string        (x86 docker image name)<br>
 -a, --arm-image string        (ARM docker image name)<br>
 -p, --publisher string        (Catalog item publisher name)<br>
 -s, --disk-required number    (Amount of disk required to run the microservice (MB))<br>
 -r, --ram-required number     (Amount of RAM required to run the microservice (MB))<br>
 -t, --picture string          (Catalog item picture)<br>
 -P, --public                  (Public catalog item)<br>
 -V, --private                 (Private catalog item)<br>
 -g, --registry-id number      (Catalog item docker registry ID)<br>
 -I, --input-type string       (Catalog item input type)<br>
 -F, --input-format string     (Catalog item input format)<br>
 -O, --output-type string      (Catalog item output type)<br>
 -T, --output-format string    (Catalog item output format)<br>
 -X, --config-example string   (Catalog item config example)<br>

*remove*<br>

 -i, --item-id string   -- Catalog item ID<br>

*info*<br>

 -i, --item-id string   -- Catalog item ID<br>

*JSON File Schema*<br>

 name: string<br>
 description: string<br>
 category: string<br>
 publisher: string<br>
 diskRequired: number<br>
 ramRequired: number<br>
 picture: string<br>
 isPublic: boolean<br>
 registryId: number<br>
 configExample: string<br>
 images: array of objects<br>
 containerImage: string<br>
 fogTypeId: number<br>
 inputType: object<br>
 infoType: string<br>
 infoFormat: string<br>
 outputType: object<br>
 infoType: string<br>
 infoFormat: string<br>
<br>
<br>
<br>
**Flow**<br>

 $ fog-controller flow <*command*> <*options*><br>

*Command List*<br>

 add       -- Add a new flow.<br>
 update    -- Update existing flow.<br>
 remove    -- Delete a flow.<br>
 list      -- List all flows.<br>
 info      -- Get flow settings.<br>

*add -u* <*user-id*>

 -f, --file string          (Application flow settings JSON file)<br>
 -n, --name string          (Application flow name)<br>
 -d, --description string   (Application flow description)<br>
 -a, --activate             (Activate application flow)<br>
 -D, --deactivate           (Deactivate application flow)<br>

*update -i* <*flow-id*><br>

 -f, --file string          (Application flow settings JSON file)<br>
 -n, --name string          (Application flow name)<br>
 -d, --description string   (Application flow description)<br>
 -a, --activate             (Activate application flow)<br>
 -D, --deactivate           (Deactivate application flow)<br>

*remove*<br>

 -i, --flow-id string   -- Application flow ID

*info*<br>

 -i, --flow-id string   -- Application flow ID

*JSON File Schema*<br>

 name: string<br>
 description: string<br>
 isActivated: boolean<br>

<br>
<br>
<br>

 **Microservice**<br>
 
 $ fog-controller microservice <*command*> <*options*><br>

*Command List*<br>

 add      -- Add a new microservice.<br>
 update   -- Update existing microservice.<br>
 remove   -- Delete a microservice.<br>
 list     -- List all microservices.<br>
 info     -- Get microservice settings.<br>
 route    -- Add/Remove microservice route.<br>
 port-mapping   -- Create/Delete/List microservice port mapping.<br>

*add -u* <*user-id*>

 -f, --file string         (Microservice settings JSON file)<br>
 -n, --name string         (Microservice name)<br>
 -c, --catalog-id string   (Catalog item ID)<br>
 -F, --flow-id string      (Application flow ID)<br>
 -I, --iofog-id string     (ioFog node ID)<br>
 -g, --config string       (Microservice config)<br>
 -v, --volumes string[]    (Microservice volume mapping(s))<br>
 -l, --log-limit number    (Log file size limit (MB))<br>
 -r, --root-enable         (Enable root access)<br>
 -R, --root-disable        (Disable root access)<br>
 -p, --ports string[]      (Container ports)<br>
 -t, --routes string[]     (Microservice route(s) (receiving microservices))<br>

*update -i* <*microservice-id*><br>

 -f, --file string              (Microservice settings JSON file)<br>
 -n, --name string              (Microservice name)<br>
 -I, --iofog-id string          (ioFog node ID)<br>
 -g, --config string            (Microservice config)<br>
 -v, --volumes string[]         (Microservice volume mapping(s))<br>
 -l, --log-limit number         (Log file size limit (MB))<br>
 -r, --root-enable              (Enable root access)<br>
 -R, --root-disable             (Disable root access)<br>
 -w, --rebuild                  (Rebuild microservice image on fog agent)<br>
 
 **Example**
 
 update -i <*microservice-id*> -v{'hostDestination':'/var1/dest','containerDestination':'/var/dest','accessMode':'w'} -n testcli <br>

*remove*<br>

 -i, --microservice-id string   (Microservice ID)<br>
 -z, --cleanUp                  (Delete microservice with cleanup)<br>

*info*<br>

 -i, --microservice-id string   (Microservice ID)<br>

*route*<br>

 -D, --dest-microservice-id string     (Destination Microservice ID of route)<br>
 -S, --source-microservice-id string   (Source Microservice ID of route)<br>
 -a, --add                             (Add new route(s))<br>
 -m, --remove                          (Delete existing route(s))<br>

*port-mapping*<br>

 -i, --microservice-id string   (Microservice ID)<br>
 -b, --create                   (Add new port mapping(s))<br>
 -B, --delete                   (Delete existing port mapping(s))<br>
 -G, --list                     (List port mappings)<br>
 -W, --internal number          (Internal port)<br>
 -Y, --external number          (External port)<br>
 -Z, --public                   (Public mode of connector)<br>
 -K, --private                  (Private mode of connector)<br>

<br>
<br>
<br>

 **Registry**

 $ fog-controller registry <*command*> <*options*><br>

*Command List*<br>

 add      -- Add a new Registry.<br>
 remove   -- Delete a Registry.<br>
 list     -- List all Registries.<br>

*add -i* <*user-id*>

 -u, --uri string        (Registry URI)<br>
 -b, --public            (Set registry as public)<br>
 -r, --private           (Set registry as private)<br>
 -l, --username string   (Registry's user name)<br>
 -p, --password string   (Password)<br>
 -e, --email string      (Email address)<br>

*remove*<br>

 -d, --item-id number    (Item's id)
<br>
<br>
<br>

 **Diagnostics**

 $ fog-controller diagnostics <*command*> <*options*><br>

*Command List*<br>

 strace-update           -- Change microservice strace status to enabled or disabled.<br>
 strace-info             -- Get microservice strace data.<br>
 strace-ftp-post         -- Post microservice strace data to ftp.<br>
 image-snapshot-create   -- Create microservice image snapshot.<br>
 image-snapshot-get      -- Get microservice image snapshot.<br>

*strace-update -i* <*microservice-id*><br>

 -e, --enable                   (Enable microservice strace)<br>
 -o, --disable                  (Disable microservice strace)<br>

*strace-info -i* <*microservice-id*><br>

 -f, --format string            (Format of strace data to receive)<br>
 
 *strace-ftp-post -i* <*microservice-id*><br>

 -h, --ftpHost string           (FTP host)<br>
 -p, --ftpPort number           (FTP port)<br>
 -u, --ftpUser string           (FTP user)<br>
 -s, --ftpPass string           (FTP user password)<br>
 -d, --ftpDestDir string        (FTP destination directory)<br>

*image-snapshot-create*

 -i, --microservice-id string   (Microservice ID)<br>

*image-snapshot-get*

 -i, --microservice-id string   (Microservice ID)<br>
