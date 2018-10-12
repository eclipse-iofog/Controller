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
 comsat         -- ComSat operations. <br>
 proxy          -- Proxy operations. <br>
 iofog          -- ioFog nodes operations. <br>
 catalog        -- Microservices catalog operations. <br>
 flow           -- Application flow operations. <br>
 microservice   -- Microservice instance operations. <br>
 registry       -- Registries instance operations. <br>


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
 
 
 
**ComSat** <br>

$ fog-controller comsat <command> <options>

**Command List**

 add      -- Add a new ComSat. <br>
 update   -- Update existing ComSat. <br>
 remove   -- Delete a ComSat. <br>
 list     -- List all ComSats. <br>

*add*

 -n, --name string        (ComSat name) <br>
 -d, --domain string      (ComSat domain name) <br>
 -i, --public-ip string   (ComSat public IP address) <br>
 -c, --cert-dir string    (Path to certificate) <br>
 -s, --self-signed        (Is self-signed) <br>
 -u, --user-id number     (User's id) <br>

*update*

 -n, --name string        (ComSat name) <br>
 -d, --domain string      (ComSat domain name) <br>
 -i, --public-ip string   (ComSat public IP address) <br>
 -c, --cert-dir string    (Path to certificate) <br>
 -s, --self-signed        (Is self-signed) <br>

*remove*

 -i, --public-ip string   (ComSat public IP address)
 
 
 
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
 
  
 
 **IoFog**
 
 $ fog-controller iofog <command> <options>

**Command List**

  add                -- Add a new ioFog node. <br>
  update             -- Update existing ioFog node. <br>
  remove             -- Delete an ioFog node. <br>
  list               -- List all ioFog nodes. <br>
  info               -- Get ioFog node settings. <br>
  provisioning-key   -- Get provisioning key for an ioFog node. <br>
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
  -C, --log-count number          (ioFog node log files count) <br>
  -s, --status-frequency number   (ioFog node status check frequency (seconds)) <br>
  -F, --change-frequency number   (ioFog node configuration change check frequency (seconds)) <br>
  -Q, --device-frequency number   (ioFog node device scan frequency (seconds)) <br>
  -B, --blutooth-enable           (Enable bluetoth on ioFog node) <br>
  -b, --blutooth-disable          (Disable bluetoth on ioFog node) <br>
  -W, --watchdog-enable           (Enable watchdog on ioFog node) <br>
  -w, --watchdog-disable          (Disable watchdog on ioFog node) <br>
  -a, --abs-hw-enable             (Enable hardware abstraction on ioFog node) <br>
  -A, --abs-hw-disable            (Disable hardware abstraction on ioFog node) <br>
  -p, --gps-enable                (Enable GPS on ioFog node) <br> 
  -P, --gps-disable               (Disable GPS on ioFog node) <br>
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
  -C, --log-count number          (ioFog node log files count) <br>
  -s, --status-frequency number   (ioFog node status check frequency (seconds)) <br>
  -F, --change-frequency number   (ioFog node configuration change check frequency (seconds)) <br>
  -Q, --device-frequency number   (ioFog node device scan frequency (seconds)) <br>
  -B, --blutooth-enable           (Enable bluetoth on ioFog node) <br>
  -b, --blutooth-disable          (Disable bluetoth on ioFog node) <br>
  -W, --watchdog-enable           (Enable watchdog on ioFog node) <br>
  -w, --watchdog-disable          (Disable watchdog on ioFog node) <br>
  -a, --abs-hw-enable             (Enable hardware abstraction on ioFog node) <br>
  -A, --abs-hw-disable            (Disable hardware abstraction on ioFog node) <br>
  -p, --gps-enable                (Enable GPS on ioFog node) <br>
  -P, --gps-disable               (Disable GPS on ioFog node) <br>
  -o, --reboot                    (Reboot ioFog node) <br>
  -y, --fog-type number           (ioFog node architecture type) <br>

*remove*

  -i, --node-id string   (ioFog node ID)

*info*

  -i, --node-id string   (ioFog node ID)

*provisioning-key*

  -i, --node-id string   (ioFog node ID)

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
  autoGPSEnabled: boolean <br>
  reboot: boolean <br>
  fogType: number <br>
