// import * from @influxdata/influxdb-client using es6 syntax
import { HttpError, InfluxDB, Point } from '@influxdata/influxdb-client'
// import * from @influxdata/influxdb-client-apis using es6 syntax
import {
  AuthorizationsAPI,
  PingAPI,
  SetupAPI,
  OrgsAPI,
  SigninAPI,
  SignoutAPI,
} from '@influxdata/influxdb-client-apis'

// environment variables
const USERNAME = process.env.INFLUXDB_USERNAME || 'development'
const PASSWORD = process.env.INFLUXDB_PASSWORD || 'development'
const ORG = process.env.INFLUXDB_ORG || 'development'
const BUCKET = process.env.INFLUXDB_BUCKET || 'development'
//const RETENTION = process.env.INFLUXDB_RETENTION
const URL = process.env.INFLUXDB_URL || 'http://localhost:8086'
const TIMEOUT = 10 * 1000
const DEFAULT_TAGS = {
  hostname: 'localhost',
  app: 'telemetry',
}

// helpers
const log = console.log

// hoist
let client
let session
let writeApi

// functions
const connect = async (cxn) => {
  try {
    client = new InfluxDB(cxn)
    let ping = new PingAPI(client)
    await ping.getPing({ timeout: TIMEOUT })
    return client
  } catch (error) {
    log(error.toString())
  }
}

const init = async (config) => {
  try {
    let setup = new SetupAPI(client)
    const { semaphore } = await setup.getSetup({ timeout: TIMEOUT })
    if (semaphore) {
      setup
        .postSetup({ body: config })
        .then((r) => {
          log('InfluxDB setup completed')
          return true
        })
        .catch((e) => {
          log(e.toString())
        })
    } else {
      log('InfluxDB already setup')
      return true
    }
  } catch (error) {
    log(error.toString())
  }
}

// auth helper function to sign in and set session cookies
const signin = async (username = USERNAME, password = PASSWORD) => {
  try {
    const signinApi = new SigninAPI(client)
    const cookies = []
    await signinApi.postSignin(
      { auth: { user: username, password } },
      {
        responseStarted: (headers, status) => {
          if (status < 300) {
            const setCookie = headers['set-cookie']
            if (typeof setCookie === 'string') {
              cookies.push(setCookie.split(';').shift())
            } else if (Array.isArray(setCookie)) {
              setCookie.forEach((c) => cookies.push(c.split(';').shift()))
            }
          }
        },
      }
    )
    // authorize communication with session cookies
    // set global session (facilitates logout later)
    session = { headers: { cookie: cookies.join('; ') } }
    return session
  } catch (error) {
    if (error instanceof HttpError) {
      log(error.message)
    }
    log(error.toString())
  }
}

const auth = async (username = USERNAME, password = PASSWORD, org = ORG) => {
  try {
    let tokenname = 'telemetry-api'

    await signin(username, password)

    const authorizationAPI = new AuthorizationsAPI(client)
    const authorizations = await authorizationAPI.getAuthorizations({}, session)

    let tokenID = undefined

    ;(authorizations.authorizations || []).forEach((auth) => {
      if (auth.description === tokenname) {
        tokenID = auth.id
      }
    })

    // check organization, and assign to orgID
    const orgsResponse = await new OrgsAPI(client).getOrgs({ org }, session)
    if (!orgsResponse.orgs || orgsResponse.orgs.length === 0) {
      throw new Error(`No organization named ${org} found!`)
    }
    const orgID = orgsResponse.orgs[0].id

    // check if token exists, and delete if it does
    // this avoids duplication of tokens in influxdb
    if (tokenID) {
      await authorizationAPI.deleteAuthorizationsID(
        { authID: tokenID },
        session
      )
    }

    // create authorization
    const authn = await authorizationAPI.postAuthorizations(
      {
        body: {
          description: tokenname,
          orgID,
          permissions: [
            {
              action: 'read',
              resource: { type: 'buckets', orgID },
            },
            {
              action: 'write',
              resource: { type: 'buckets', orgID },
            },
          ],
        },
      },
      session
    )

    return authn.token
  } catch (error) {
    if (error instanceof HttpError) {
      log(error.message)
    } else {
      log(error)
    }
  }
}

const point = (measurement, fields, tags, timestamp) => {
  const p = new Point(measurement)
  Object.entries(fields).forEach(([key, value]) => {
    p.floatField(key, value)
  })
  Object.entries({ ...DEFAULT_TAGS, ...tags }).forEach(([key, value]) => {
    p.tag(key, value)
  })
  p.timestamp(timestamp)
  return p
}

// handles writeapi actions for clean writes and
// cleaning out of buffer/queue on exit
const write = {
  init: async (org, bucket) => {
    try {
      writeApi = client.getWriteApi(org, bucket)
      writeApi.useDefaultTags(DEFAULT_TAGS)
      writeApi = writeApi
    } catch (error) {
      log(error.toString())
    }
  },
  point: async (p) => {
    try {
      writeApi.writePoint(p)
    } catch (error) {
      log(error.toString())
    }
  },
  points: async (ps) => {
    try {
      writeApi.writePoints(ps)
    } catch (error) {
      log(error.toString())
    }
  },
  close: async () => {
    try {
      return writeApi
        .close()
        .then(() => {
          return true
        })
        .catch((e) => {
          log(e)
          log(e.stack)
        })
    } catch (error) {
      log(error.toString())
    }
  },
}

// future query function
const query = async (q) => {}

// potentially-useful transformations
const xfrm = () => {
  return {
    // given an object, return an array of objects
    // where each object is sorted by value, string || number
    splitObjByStringOrFloat: (obj) => {
      const str = {}
      const num = {}
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'string') {
          str[key] = value
        } else if (typeof value === 'number' || typeof value === 'float') {
          num[key] = value
        }
      })
      return [str, num]
    },
  }
}

const logout = async () => {
  try {
    const signoutApi = new SignoutAPI(client)
    await signoutApi.postSignout({}, session)
    return true
  } catch (error) {
    log(error.toString())
  }
}

export { connect, init, auth, point, query, write, logout, xfrm }
