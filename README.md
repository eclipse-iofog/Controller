**Fog Controller Usage**

 $ fog-controller  <command> <options>

**Command List**

 start          -- Start fog-controller service. <br>
 stop           -- Stop fog-controller service. <br>
 status         -- Display fog-controller service status. <br>
 help           -- Display usage information. <br>
 version        -- Display fog-controller service version. <br>
 user           -- User operations. <br>
 config         -- Set/Display fog-controller service config. <br>
 connector      -- Connector operations. <br>
 proxy          -- Proxy operations. <br>
 iofog          -- ioFog nodes operations. <br>
 catalog        -- Microservices catalog operations. <br>
 flow           -- Application flow operations. <br>
 microservice   -- Microservice instance operations. <br>
 registry       -- Registries instance operations. <br>
<br>
<br>
<br>

**User**

$ fog-controller user <command> <options>

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

*update*

 -f, --first-name string   (User's first name) <br>
 -l, --last-name string    (User's last name) <br>
 -e, --email string        (User's email address) <br>
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
 
 
**Connector** <br>

$ fog-controller connector <command> <options>

**Command List**

 add      -- Add a new Connector. <br>
 update   -- Update existing Connector. <br>
 remove   -- Delete a Connector. <br>
 list     -- List all Connectors. <br>

*add*

 -n, --name string        (Connector name) <br>
 -d, --domain string      (Connector domain name) <br>
 -i, --public-ip string   (Connector public IP address) <br>
 -c, --cert-dir string    (Path to certificate) <br>
 -S, --self-signed-on     (Switch on self-signed) <br>
 -s, --self-signed-off    (Switch off self-signed) <br>
 -u, --user-id number     (User's id) <br>

*update*

 -n, --name string        (Connector name) <br>
 -d, --domain string      (Connector domain name) <br>
 -i, --public-ip string   (Connector public IP address) <br>
 -c, --cert-dir string    (Path to certificate) <br>
 -s, --self-signed        (Is self-signed) <br>

*remove*

 -i, --public-ip string   (Connector public IP address)
 
<br>
<br>
<br> 
 
**Proxy** <br>

$ fog-controller proxy <command> <options>

**Command List**

 add      -- Add a new proxy. <br>
 update   -- Update existing proxy. <br>
 remove   -- Delete a proxy. <br>
 list     -- List all proxies. <br>

*add*

 -u, --username string   (Proxy username) <br>
 -p, --password string   (Proxy password) <br>
 -s, --host string       (Proxy host address) <br>
 -k, --rsa-key string    (Proxy RSA key) <br>
 -o, --port number       (Proxy port) <br>

*update*

 -u, --username string   (Proxy username) <br>
 -p, --password string   (Proxy password) <br>
 -s, --host string       (Proxy host address) <br>
 -k, --rsa-key string    (Proxy RSA key) <br>
 -o, --port number       (Proxy port) <br>

*remove*

 -s, --host string   (Proxy host address)
 
<br>
<br>
<br>  
 
 **IoFog**
 
 $ fog-controller iofog <command> <options>

**Command List**

  add                -- Add a new ioFog node. <br>
  update             -- Update existing ioFog node. <br>
  remove             -- Delete an ioFog node. <br>
  list               -- List all ioFog nodes. <br>
  info               -- Get ioFog node settings. <br>
  provisioning-key   -- Get provisioning key for an ioFog node. <br>
  reboot             -- Reboot ioFog node. <br>             
  version            -- Change agent version of ioFog node. <br>
  tunnel             -- Tunnel operations for an ioFog node. <br>
  
*add*

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
  -a, --abs-hw-enable             (Enable hardware abstraction on ioFog node) <br>
  -A, --abs-hw-disable            (Disable hardware abstraction on ioFog node) <br>
  -o, --reboot                    (Reboot ioFog node) <br>
  -y, --fog-type number           (ioFog node architecture type) <br>
  -u, --user-id number            (User's id) <br>

*update*

  -f, --file string               (ioFog settings JSON file) <br>
  -i, --node-id string            (ioFog node ID) <br>
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
  -a, --abs-hw-enable             (Enable hardware abstraction on ioFog node) <br>
  -A, --abs-hw-disable            (Disable hardware abstraction on ioFog node) <br>
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

*tunnel*

  -e, --enable     (Enable tunnel) <br>
  -S, --disable    (Disable tunnel) <br>
  -O, --info       (Display tunnel info) <br>

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

$ fog-controller catalog <command> <options> <br>

**Command List**<br>

 add      -- Add a new catalog item.<br>
 update   -- Update existing catalog item.<br>
 remove   -- Delete a catalog item.<br>
 list     -- List all catalog items.<br>
 info     -- Get catalog item settings.<br>

*add*

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
 -u, --user-id number          (User's id)<br>

*update*<br>

 -f, --file string             (Catalog item settings JSON file)<br>
 -i, --item-id string          (Catalog item ID)<br>
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
 containersImages: object<br>
   x86ContainerImage: string<br>
   armContainerImage: string<br>
 publisher: string<br>
 diskRequired: number<br>
 ramRequired: number<br>
 picture: string<br>
 isPublic: boolean<br>
 registryId: number<br>
 inputType: string<br>
 inputFormat: string<br>
 outputType: string<br>
 outputFormat: string<br>
 configExample: string<br>
<br>
<br>
<br>
**Flow**<br>

 $ fog-controller flow <command> <options><br>

*Command List*<br>

 add      -- Add a new flow.<br>
 update    -- Update existing flow.<br>
 remove    -- Delete a flow.<br>
 list      -- List all flows.<br>
 info      -- Get flow settings.<br>

*add*<br>

 -f, --file string          (Application flow settings JSON file)<br>
 -n, --name string          (Application flow name)<br>
 -d, --description string   (Application flow description)<br>
 -a, --activate             (Activate application flow)<br>
 -D, --deactivate           (Deactivate application flow)<br>
 -u, --user-id number       (User's id)<br>

*update*<br>

 -f, --file string          (Application flow settings JSON file)<br>
 -i, --flow-id string       (Application flow ID)<br>
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
 
 $ fog-controller microservice <command> <options><br>

*Command List*<br>

 add      -- Add a new microservice.<br>
 update   -- Update existing microservice.<br>
 remove   -- Delete a microservice.<br>
 list     -- List all microservices.<br>
 info     -- Get microservice settings.<br>
 route    -- Add/Remove microservice route.<br>
 strace   -- strace option operations.<br>

*add*<br>

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
 -u, --user-id number      (User's id)<br>

*update*<br>

 -f, --file string              (Microservice settings JSON file)<br>
 -i, --microservice-id string   (Microservice ID)<br>
 -n, --name string              (Microservice name)<br>
 -c, --catalog-id string        (Catalog item ID)<br>
 -F, --flow-id string           (Application flow ID)<br>
 -I, --iofog-id string          (ioFog node ID)<br>
 -g, --config string            (Microservice config)<br>
 -v, --volumes string[]         (Microservice volume mapping(s))<br>
 -l, --log-limit number         (Log file size limit (MB))<br>
 -r, --root-enable              (Enable root access)<br>
 -R, --root-disable             (Disable root access)<br>
 -p, --ports string[]           (Container ports)<br>
 -t, --routes string[]          (Microservice route(s) (receiving microservices))<br>

*remove*<br>

 -i, --microservice-id string   (Microservice ID)<br>

*info*<br>

 -i, --microservice-id string   (Microservice ID)<br>

*route*<br>

 -i, --microservice-id string   (Microservice ID)<br>
 -a, --add string[]             (Add new route(s))<br>
 -m, --remove string[]          (Delete existing route(s))<br>

*strace*<br>

 -i, --microservice-id string   (Microservice ID)<br>
 -e, --enable                   (Enable strace option)<br>
 -d, --disable                  (Disable strace option)<br>
 -G, --get string               (Get strace data, formats: string,file)<br>

*JSON File Schema*<br>

 name: string<br>
 catalogItemId: string<br>
 flowId: string<br>
 ioFogNodeId: string<br>
 config: string<br>
 volumeMappings: string<br>
 logLimit: number<br>
 rootHostAccess: true<br>
 ports: object<br>
   internal: number<br>
   external: number<br>
   tunnel: boolean<br>
 routes: array of strings<br>

*Examples*

 1. Single mapping:                       $ fog-controller microservice add [other required options] --volumes
                                       /host_src:/container_src<br>
 2. Multiple mappings:                   $ fog-controller microservice add [other required options] --volumes
                                       /host_src:/container_src /host_bin:/container_bin<br>
 3. Ports (internal:external:tunnel):     $ fog-controller microservice add [other required options] --ports
                                       80:8080:false 443:5443:true<br>
 4. Add routes:                           $ fog-controller microservice route -i ABCD --add DEF GHI<br>
 5. Delete route:                         $ fog-controller microservice route -i ABC --remove DEF<br>
 6. Get strace data:                      $ fog-controller microservice strace -i ABC --get file<br>
<br>
<br>
<br>

 **Registry**

 $ fog-controller registry <command> <options><br>

*Command List*<br>

 add      -- Add a new Registry.<br>
 remove   -- Delete a Registry.<br>
 list     -- List all Registries.<br>

*add*<br>

 -u, --uri string        (Registry URI)<br>
 -b, --public            (Set registry as public)<br>
 -r, --private           (Set registry as private)<br>
 -l, --username string   (Registry's user name)<br>
 -p, --password string   (Password)<br>
 -e, --email string      (Email address)<br>
 -i, --user-id number    (User's id)<br>

*remove*<br>

 -u, --uri string   (Registry URI)
