import Sqlite3 from 'better-sqlite3'

const db = new Sqlite3(':memory:')

jest.mock('node:https', () => ({
  request: jest.fn().mockImplementation((options) => {
    let requestBody = ''
    return {
      end: jest.fn().mockImplementation((data) => {
        requestBody = data
      }),
      on: jest.fn().mockImplementation((event, cb) => {
        if (event === 'response') {
          cb({
            on: jest.fn().mockImplementation((event, cb) => {
              if (event === 'data') {
                const req = JSON.parse(requestBody)
                const prepare = db.prepare(req.sql)

                let results
                let meta

                try {
                  results = prepare.all(req.params || [])
                } catch (error) {
                  if (error.message.includes('Use run() instead')) {
                    meta = prepare.run(req.params || [])
                  } else
                    throw error
                }

                cb(JSON.stringify({
                  success: true,
                  result: [{
                    results,
                    meta,
                  }]
                }))
                return
              }

              if (event === 'end') {
                cb()
              }
            })
          })
        }

        return this
      })
    }
  })
}))
