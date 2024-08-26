# cloudflare-d1-http-knex

[![License: MIT](https://img.shields.io/npm/l/cloudflare-d1-http-knex.svg)](https://github.com/zfben/cloudflare-d1-http-knex/blob/main/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/cloudflare-d1-http-knex.svg)](https://www.npmjs.com/package/cloudflare-d1-http-knex)

An npm package that query [Cloudflare's D1](https://developers.cloudflare.com/d1/) through [Query D1 Database API](https://developers.cloudflare.com/api/operations/cloudflare-d1-query-database-query) and [Knex](https://knexjs.org/).

## Installation

```bash
npm install cloudflare-d1-http-knex

# or
bun add cloudflare-d1-http-knex
```

## Usage

```ts
import { createConnection } from 'cloudflare-d1-http-knex';

// The connection function returns a Knex instance
const connection = createConnection({
  account_id: 'account_id',
  database_id: 'database_id',
  key: 'key',
});

const query = await connection('table_name').select('*');
```
