# telemetry

This is a quickstart for telemetry collection using InfluxDB 2.0  
It uses the InfluxDB 2.0 client library `@influxdata/influxdb-client` and `@influxdata/influxdb-client-apis.`  

This library is meant to aid in sending points to Influxdb  
it handles login, session, as well as writeapi conventions  

[*] to instantiate a connection  
[*] to initialize the database/user  
[*] to retrieve a session token  
[*] to manage WriteAPI/Write data to influx
[] to query the data.

## installation
### InfluxDB:   
* Windows Powershell
```
wget https://dl.influxdata.com/influxdb/releases/influxdb2-2.5.1-windows-amd64.zip -UseBasicParsing -OutFile influxdb2-2.5.0-windows-amd64.zip
Expand-Archive .\influxdb2-2.5.1-windows-amd64.zip -DestinationPath 'C:\Program Files\InfluxData\influxdb\'
```
* Linux (Debian)
```
https://www.cyberithub.com/how-to-install-influxdb2-on-ubuntu-20-04-lts-step-by-step/
```
* Docker
```
docker run -p 8086:8086 \
      -v influxdb:/var/lib/influxdb \
      -v influxdb2:/var/lib/influxdb2 \
      -e DOCKER_INFLUXDB_INIT_MODE=upgrade \
      -e DOCKER_INFLUXDB_INIT_USERNAME=my-user \
      -e DOCKER_INFLUXDB_INIT_PASSWORD=my-password \
      -e DOCKER_INFLUXDB_INIT_ORG=my-org \
      -e DOCKER_INFLUXDB_INIT_BUCKET=my-bucket \
      influxdb:2.0
```

### Telemetry

from local dir '.'  
`npm install && npm run test`

check `example.js` for a quick working sample

#### notes on auth(n/z)

Influxdb has moved in the direction of cloud-hosted apis.  
Because of this, they have started expecting tokenized auth  
The steps to this are:

      * Create an unauthenticated connection
      * Sign-in using username and password (or env/var)
      * Generate a session/token
      * Re-connect to the database providing token

#### notes on WriteApi

Influxdb client relies on a lower-level api called `WriteApi`  
which handles buffer control and other gnars, however, it must  
be initiated, and closed after-use, otherwise the connection  
pool may be saturated.