import type { Database } from 'better-sqlite3'

let db: Database

/**
 * Mocked fetch function to simulate a database connection.
 *
 * **Note: Your should install `better-sqlite3` to use it.**
 *
 * @example
 * ```ts
 * import { createConnection } from 'cloudflare-d1-http-knex'
 * import { mockedFetch } from 'cloudflare-d1-http-knex/mock'
 *
 * const connection = {
 *   account_id: 'xxxx',
 *   database_id: 'xxxx',
 *   key: 'xxxx',
 *   mockedFetch,
 * }
 *
 * const db = createConnection(connection)
 *
 * await db.raw('SELECT 1+1')
 * ```
 */
export const mockedFetch = (_, options) => {
  if (!db) {
    const Sqlite3 = require('better-sqlite3')

    db = new Sqlite3(':memory:')
  }

  return Promise.resolve({
    json: () => {
      const req = JSON.parse(options.body)
      const prepare = db.prepare(req.sql)

      let results: any[]
      let meta: any

      try {
        results = prepare.all(req.params || [])
      } catch (error) {
        if (error.message.includes('Use run() instead')) {
          meta = prepare.run(req.params || [])
        } else return Promise.reject(Error(error.message))
      }

      return Promise.resolve({
        success: true,
        result: [
          {
            results,
            meta,
          },
        ],
      })
    },
  })
}
