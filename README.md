# cloudflare-d1-http-knex

[![License: MIT](https://img.shields.io/npm/l/cloudflare-d1-http-knex.svg)](https://github.com/zfben/cloudflare-d1-http-knex/blob/main/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/cloudflare-d1-http-knex.svg)](https://www.npmjs.com/package/cloudflare-d1-http-knex)
[![Coverage Status](https://img.shields.io/codecov/c/github/zfben/cloudflare-d1-http-knex.svg)](https://app.codecov.io/gh/zfben/cloudflare-d1-http-knex)
[![Testing Status](https://github.com/zfben/cloudflare-d1-http-knex/actions/workflows/test.yml/badge.svg)](https://github.com/zfben/cloudflare-d1-http-knex/actions/workflows/test.yml)

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

## Mocking

1. Install `better-sqlite3`: `npm install -D better-sqlite3`.
2. Using in case:
```ts
import { createConnection } from 'cloudflare-d1-http-knex'
import { mockedFetch } from 'cloudflare-d1-http-knex/mock'

const db = createConnection({
  account_id: 'xxxx',
  database_id: 'xxxx',
  key: 'xxxx',
  mockedFetch, // Using mocked fetch, it won't connect to real D1 database.
})

await db.raw('SELECT 1+1')
```

### Usage mockedFetch as Global in Jest

You should add below codes to your jest setup files.

```ts
import { mockedFetch } from 'cloudflare-d1-http-knex/mock'

global.fetch = jest.fn(mockedFetch)
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
