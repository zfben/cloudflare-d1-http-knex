import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('test_logs', t => {
    t.uuid('id').primary()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('test_logs')
}
