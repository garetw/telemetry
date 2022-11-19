// import * from index using es6 syntax
import { connect, init, auth, point, write, logout } from './index.js'

// environment variables
const USERNAME = process.env.INFLUXDB_USERNAME || 'development'
const PASSWORD = process.env.INFLUX
const ORG = process.env.INFLUXDB_ORG || 'development'
const BUCKET = process.env.INFLUXDB_BUCKET || 'development'
//const RETENTION = process.env.INFLUXDB_RETENTION
const URL = process.env.INFLUXDB_URL || 'http://localhost:8086'

// connect to influxdb
await connect(URL)
// initialize the database, bail if already initialized
await init()
// authenticate to the database using the username and password
let token = await auth(USERNAME, PASSWORD, ORG)
// reconnect with a token
await connect({ url: URL, token: token })
// create a point
let p = point(
  'gpu',
  {
    temperature: 100,
    fan: 50,
    memory: 100,
    power: 100,
    utilization: 100,
    core: 100,
  },
  {
    gpu: 'nvidia',
    host: 'localhost',
  },
  {
    timestamp: new Date(),
  }
)
// write the point to the database
await write(ORG, BUCKET).point(p)
await write.close()
