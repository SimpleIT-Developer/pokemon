import { pgTable, text, timestamp, integer, boolean, real, primaryKey } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const users = pgTable('User', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').unique().notNull(),
  name: text('name'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
})

export const pokemons = pgTable('Pokemon', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  pokedexNumber: integer('pokedexNumber').unique().notNull(),
  name: text('name').notNull(),
  generation: integer('generation').notNull(),
  primaryType: text('primaryType').notNull(),
  secondaryType: text('secondaryType'),
  imageUrl: text('imageUrl'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
})

export const collections = pgTable('Collection', {
  id: text('id').$defaultFn(() => createId()).notNull(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pokemonId: text('pokemonId').notNull().references(() => pokemons.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').default(1).notNull(),
  owned: boolean('owned').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.pokemonId] })
}))

export const pokemonCards = pgTable('PokemonCard', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  pokemonId: text('pokemonId').notNull().references(() => pokemons.id, { onDelete: 'cascade' }),
  setName: text('setName').notNull(),
  cardNumber: text('cardNumber').notNull(),
  rarity: text('rarity'),
  imageUrl: text('imageUrl'),
})

export const cardScans = pgTable('CardScan', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pokemonCardId: text('pokemonCardId').references(() => pokemonCards.id, { onDelete: 'set null' }),
  imageUrl: text('imageUrl').notNull(),
  confidence: real('confidence'),
  ocrText: text('ocrText'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
})
