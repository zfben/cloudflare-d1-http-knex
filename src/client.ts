import K, { type Knex } from 'knex'
import { Pool } from 'tarn'
import TableCompiler from 'knex/lib/dialects/sqlite3/schema/sqlite-tablecompiler'
import QueryBuilder from 'knex/lib/dialects/sqlite3/query/sqlite-querybuilder'
import QueryCompiler from 'knex/lib/dialects/sqlite3/query/sqlite-querycompiler'

export type CloudflareD1HttpClientConfigConnection = {
  /** Cloudflare's account id */
  account_id: string
  /** D1's database id */
  database_id: string
  /** Cloudflare's api key, from https://dash.cloudflare.com/profile/api-tokens */
  key: string
  /** Mock fetch function for testing */
  mockedFetch?: (
    url: string,
    options: RequestInit
  ) => Promise<{
    json: () => Promise<{
      success: boolean
      result: { results: any; meta: any }[]
    }>
  }>
}

export type CloudflareD1HttpClientConfig = Knex.Config & {
  connection: CloudflareD1HttpClientConfigConnection
}

export class CloudflareD1HttpClient extends K.Client {
  declare readonly config: CloudflareD1HttpClientConfig

  constructor(config: CloudflareD1HttpClientConfig) {
    super(config)

    if (!config.connection?.account_id) {
      throw Error('Missing required account_id')
    }

    if (!config.connection?.database_id) {
      throw Error('Missing required database_id')
    }

    if (!config.connection?.key) {
      throw Error('Missing required key')
    }

    this.config = config

    this.pool = new Pool({
      min: 1,
      max: 1,
      propagateCreateError: true,
      create: async cb => cb(null, {}),
      destroy: async () => null,
    })
  }

  async _query(_, obj) {
    if (!obj.sql) return Promise.reject(Error('The query is empty'))

    if (obj.sql === 'BEGIN;')
      return Promise.reject(
        Error(
          "D1 doesn't support transactions, see https://blog.cloudflare.com/whats-new-with-d1/"
        )
      )

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

  tableCompiler() {
    // biome-ignore lint/style/noArguments: <explanation>
    return new TableCompiler(this, ...arguments)
  }

  queryBuilder() {
    return new QueryBuilder(this)
  }

  queryCompiler() {
    // biome-ignore lint/style/noArguments: <explanation>
    return new QueryCompiler(this, ...arguments)
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
  return K({ client: CloudflareD1HttpClient, connection: connection as any })
}
