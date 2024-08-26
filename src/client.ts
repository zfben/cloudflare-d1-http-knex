import k, { Client, type Knex } from 'knex'
import { Pool } from 'tarn'
import { request } from 'node:https'
import TableCompiler from 'knex/lib/dialects/sqlite3/schema/sqlite-tablecompiler'

export type CloudflareD1HttpClientConfig = Knex.Config & {
  connection: {
    account_id: string
    database_id: string
    key: string
  }
}

export class CloudflareD1HttpClient extends Client {
  declare readonly config: CloudflareD1HttpClientConfig

  constructor(config: CloudflareD1HttpClientConfig) {
    super(config)

    if (!config.connection?.account_id) {
      throw Error('Missing required connection.account_id')
    }

    if (!config.connection?.database_id) {
      throw Error('Missing required connection.database_id')
    }

    if (!config.connection?.key) {
      throw Error('Missing required connection.key')
    }

    this.config = config

    this.pool = new Pool({ min: 1, max: 1, propagateCreateError: true, create: async (cb) => cb(null, {}), destroy: async () => null })
  }

  async _query(connection, obj) {
    if (!obj.sql) throw new Error('The query is empty');

    const req = request({
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${this.config.connection.account_id}/d1/database/${this.config.connection.database_id}/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.config.connection.key,
      },
    })

    req.end(JSON.stringify({
      sql: obj.sql,
      params: obj.bindings,
    }))

    return new Promise((resolve, reject) => {
      req.on('response', (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          try {
            const body = JSON.parse(data)

            if (body.success) {
              switch (obj.method) {
                case 'first':
                  resolve(body.result[0].results[0])
                  break
                case 'insert':
                  resolve([body.result[0].meta.changes])
                  break
                case 'update':
                  resolve(body.result[0].meta.changes)
                  break
                case 'del':
                  resolve(body.result[0].meta.changes)
                  break
                default:
                  resolve(body.result[0].results)
                  break
              }
              return
            }

            reject(Error(body.errors[0].message))
          } catch (error) {
            reject(error)
          }
        })
      })
    })
  }

  async processResponse(obj) {
    return obj
  }

  tableCompiler() {
    return new TableCompiler(this, ...arguments);
  }
}

/**
 * Create a new connection and return the Knex instance.
 *
 * @example
 * ```ts
 * const db = createConnection({
 *   account_id: 'xxxx',
 *   database_id: 'xxxx',
 *   key: 'xxxx',
 * })
 *
 * await db('users').first()
 * ```
 */
export function createConnection(config: CloudflareD1HttpClientConfig['connection']) {
  return k({ client: CloudflareD1HttpClient, connection: config })
}
