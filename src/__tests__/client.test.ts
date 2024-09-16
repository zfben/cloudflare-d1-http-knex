import { createConnection } from '../client'
import knex, { type Knex } from 'knex'
import { mockedFetch, MockedCloudflareD1HttpClient } from '../mock'

const connection = {
  account_id: 'account_id',
  database_id: 'database_id',
  key: 'key',
  mockedFetch,
}

it('MockedCloudflareD1HttpClient', async () => {
  const K = knex({
    client: MockedCloudflareD1HttpClient,
  })

  const sqlite3 = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: false,
  })

  await expect(K.raw('SELECT 1+1')).resolves.toEqual(
    await sqlite3.raw('SELECT 1+1')
  )

  await K.destroy()
  await sqlite3.destroy()
})

it('SELECT 1+1', async () => {
  const db = createConnection(connection)

  const sqlite3 = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: false,
  })

  await expect(db.raw('SELECT 1+1')).resolves.toEqual(
    await sqlite3.raw('SELECT 1+1')
  )

  await db.destroy()
  await sqlite3.destroy()
})

it('SELECT a', async () => {
  const db = createConnection(connection)

  await expect(db.raw('SELECT a')).rejects.toThrow(
    'SELECT a - no such column: a'
  )

  await db.destroy()
})

it('insert, update, delete', async () => {
  const db = createConnection(connection)

  await db.schema.dropTableIfExists('test_users')
  await db.schema.createTable('test_users', t => {
    t.string('name').primary()
  })

  const sqlite3 = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: false,
  })
  await sqlite3.schema.dropTableIfExists('test_users')
  await sqlite3.schema.createTable('test_users', t => {
    t.string('name').primary()
  })

  await expect(
    db('test_users')
      .insert([{ name: '1' }, { name: '2' }])
      .returning('*')
  ).resolves.toEqual(
    await sqlite3('test_users')
      .insert([{ name: '1' }, { name: '2' }])
      .returning('*')
  )

  await expect(db('test_users').first()).resolves.toEqual(
    await sqlite3('test_users').first()
  )

  await expect(
    db('test_users').update({ name: '3' }).where('name', '1').returning('*')
  ).resolves.toEqual(
    await sqlite3('test_users')
      .update({ name: '3' })
      .where('name', '1')
      .returning('*')
  )

  await expect(
    db('test_users').delete().where('name', '2').returning('*')
  ).resolves.toEqual(
    await sqlite3('test_users').delete().where('name', '2').returning('*')
  )

  await expect(db('test_users').delete().where('name', '1')).resolves.toEqual(
    await sqlite3('test_users').delete().where('name', '1')
  )

  await db.destroy()
  await sqlite3.destroy()
}, 20000)

it('migration', async () => {
  const config: Knex.MigratorConfig = {
    directory: `${__dirname}/migrations`,
    extension: 'ts',
    disableTransactions: true,
  }

  const db = createConnection(connection)

  await db.schema.dropTableIfExists('test_logs')
  await db.schema.dropTableIfExists('knex_migrations')
  await db.schema.dropTableIfExists('knex_migrations_lock')

  await expect(db.schema.hasTable('test_logs')).resolves.toEqual(false)

  await db.schema.createTable('knex_migrations', t => {
    t.increments('id').primary()
    t.string('name')
    t.integer('batch')
    t.timestamp('migration_time')
  })

  await db.schema.createTable('knex_migrations_lock', t => {
    t.integer('index')
    t.integer('is_locked')
  })

  await db.migrate.up(config)

  await expect(db('test_logs').first()).resolves.toEqual(undefined)

  await db.migrate.down(config)

  await expect(db('test_logs').first()).rejects.toMatchObject({
    message: expect.stringContaining('no such table: test_logs'),
  })

  await db.destroy()
})
