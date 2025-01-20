import K, { type Knex } from 'knex'
import Client from 'knex/lib/dialects/sqlite3/index.js'
import type { mockedFetch } from './mock'

export type CloudflareD1HttpClientConfigConnection = {
  /** Cloudflare's account id */
  account_id: string
  /** D1's database id */
  database_id: string
  /** Cloudflare's api key, from https://dash.cloudflare.com/profile/api-tokens */
  key: string
  /** Mock fetch function for testing */
  mockedFetch?: typeof mockedFetch
} & Knex.StaticConnectionConfig

export type CloudflareD1HttpClientConfig = Knex.Config & {
  connection: CloudflareD1HttpClientConfigConnection
}

export class CloudflareD1HttpClient extends (Client as unknown as typeof Knex.Client) {
  declare readonly config: CloudflareD1HttpClientConfig

  constructor(config: CloudflareD1HttpClientConfig) {
    ;(config.connection as any).filename = ':memory:'
    config.useNullAsDefault = false

    super(config)

    if (!config.connection.mockedFetch) {
      if (!config.connection?.account_id) {
        throw Error('Missing required account_id')
      }

      if (!config.connection?.database_id) {
        throw Error('Missing required database_id')
      }

      if (!config.connection?.key) {
        throw Error('Missing required key')
      }
    }

    this.config = config
  }

  _driver() {
    return this
  }

  acquireRawConnection() {
    return Promise.resolve(this)
  }

  async _query(_, obj) {
    if (!obj.sql) return Promise.reject(Error('The query is empty'))

    if (['BEGIN;', 'COMMIT;', 'ROLLBACK;'].includes(obj.sql)) {
      console.warn(
        "[WARN] D1 doesn't support transactions, see https://blog.cloudflare.com/whats-new-with-d1/"
      )
      return Promise.resolve()
    }

    if (this.config.connection.mockedFetch)
      return this.config.connection
        .mockedFetch(
          `https://api.cloudflare.com/client/v4/accounts/${this.config.connection.account_id}/d1/database/${this.config.connection.database_id}/query`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sql: obj.sql,
              params: obj.bindings,
            }),
          }
        )
        .then(res => this._processResponse(res, obj))

    return fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.config.connection.account_id}/d1/database/${this.config.connection.database_id}/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.connection.key}`,
        },
        body: JSON.stringify({
          sql: obj.sql,
          params: obj.bindings,
        }),
      }
    ).then(res => this._processResponse(res, obj))
  }

  async _processResponse(res, obj) {
    return res.json().then(body => {
      if (body.success) {
        if (obj.output) return obj.output.call(null, body.result[0].results)

        switch (obj.method) {
          case 'first':
            return body.result[0].results[0]
          case 'insert':
            if (obj.returning) {
              return body.result[0].results
            }

            return [body.result[0].meta.changes]
          case 'update':
            if (obj.returning) {
              return body.result[0].results
            }

            return body.result[0].meta.changes
          case 'del':
          case 'counter':
            return body.result[0].meta.changes
          case 'pluck':
            return body.result[0].results.map(row => row[obj.pluck])
          default:
            return body.result[0].results
        }
      }

      throw Error(body.errors[0].message)
    })
  }

  async processResponse(res) {
    return res
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
export function createConnection(
  connection: CloudflareD1HttpClientConfigConnection
) {
  return K({
    client: CloudflareD1HttpClient,
    connection,
  })
}
