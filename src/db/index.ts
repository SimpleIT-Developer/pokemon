import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

function createDb() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  return drizzle(neon(connectionString), { schema })
}

type Db = ReturnType<typeof createDb>

let instance: Db | undefined

// Connect lazily on first query. Doing it at module scope makes the build fail,
// since Next evaluates this file while collecting page data and DATABASE_URL
// isn't available then.
const db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= createDb()
    const value = Reflect.get(instance, prop)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export default db
