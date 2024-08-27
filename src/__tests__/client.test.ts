import { createConnection } from '../client'
import knex from 'knex'

const connection = {
  account_id: 'account_id',
  database_id: 'database_id',
  key: 'key',
}

it('SELECT 1+1', async () => {
  const db = createConnection(connection)

  const sqlite3 = knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: false })

  await expect(db.raw('SELECT 1+1')).resolves.toEqual(await sqlite3.raw('SELECT 1+1'))

  await db.destroy()
  await sqlite3.destroy()
})

it('SELECT a', async () => {
  const db = createConnection(connection)

  await expect(db.raw('SELECT a')).rejects.toThrow("SELECT a - no such column: a")

  await db.destroy()
})

it('insert, update, delete', async () => {
  const db = createConnection(connection)

  await db.schema.dropTableIfExists('test_users')
  await db.schema.createTable('test_users', t => {
    t.string('name').primary()
  })

  const sqlite3 = knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: false })
  await sqlite3.schema.dropTableIfExists('test_users')
  await sqlite3.schema.createTable('test_users', t => {
    t.string('name').primary()
  })

  await expect(db('test_users').insert([{ name: '1' }, { name: '2' }])).resolves.toEqual(await sqlite3('test_users').insert([{ name: '1' }, { name: '2' }]))

  await expect(db('test_users').first()).resolves.toEqual(await sqlite3('test_users').first())

  await expect(db('test_users').update({ name: '3' }).where('name', '1')).resolves.toEqual(await sqlite3('test_users').update({ name: '3' }).where('name', '1'))

  await expect(db('test_users').delete().where('name', '2')).resolves.toEqual(await sqlite3('test_users').delete().where('name', '2'))

  await expect(db('test_users').delete().where('name', '1')).resolves.toEqual(await sqlite3('test_users').delete().where('name', '1'))

  await db.destroy()
  await sqlite3.destroy()
}, 20000)

it('transaction', async () => {
  const db = createConnection(connection)

  await db.schema.dropTableIfExists('test_users')
  await db.schema.createTable('test_users', t => {
    t.string('name').primary()
  })

  const sqlite3 = knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: false })
  await sqlite3.schema.dropTableIfExists('test_users')
  await sqlite3.schema.createTable('test_users', t => {
    t.string('name').primary()
  })

  await expect(db.transaction(async trx => {
    await trx('test_users').insert({ name: '1' })
    await trx('test_users').insert({ name: '2' })
  })).resolves.toEqual(await sqlite3.transaction(async trx => {
    await trx('test_users').insert({ name: '1' })
    await trx('test_users').insert({ name: '2' })
  }))

  await expect(db('test_users').first()).resolves.toEqual(await sqlite3('test_users').first())

  await db.destroy()
  await sqlite3.destroy()
}, 20000)
