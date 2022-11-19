import assert from 'assert'

// import * from index using es6 syntax
import { connect, init, auth, point, write, logout } from './index.js'

// environment variables
const USERNAME = process.env.INFLUXDB_USERNAME || 'development'
const PASSWORD = process.env.INFLUXDB_PASSWORD || 'development'
const ORG = process.env.INFLUXDB_ORG || 'development'
const BUCKET = process.env.INFLUXDB_BUCKET || 'development'
//const RETENTION = process.env.INFLUXDB_RETENTION
const URL = process.env.INFLUXDB_URL || 'http://localhost:8086'

context('telemetry', () => {
  let token
  let p

  // connect to influxdb
  it('connect', async () => {
    let client = await connect(URL)
    assert(client)
  })

  // initialize the database
  it('init', async () => {
    const config = {
      username: USERNAME,
      password: PASSWORD,
      org: ORG,
      bucket: BUCKET,
    }
    let result = await init(config)
    assert(result)
  })

  // authenticate to the database
  it('auth', async () => {
    token = await auth(USERNAME, PASSWORD, ORG)
    assert(token)
  })

  // reconnect with a token
  it('reconnect', async () => {
    let client = await connect({ url: URL, token: token })
    assert(client)
  })

  it('should create a gpu stats point', function () {
    p = point(
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
      }
    )
  })

  // initialize the writeapi
  it('write.init()', async () => {
    await write.init(ORG, BUCKET)
  })

  // write the point to the database
  it('write.point()', async () => {
    await write.point(p)
  })

  // close the writeapi
  it('write.close()', async () => {
    await write.close()
  })

  // logout
  it('logout', async () => {
    await logout()
  })
})
