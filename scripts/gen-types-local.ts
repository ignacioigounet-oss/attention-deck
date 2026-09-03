/**
 * Generates src/data/supabase/database.types.ts from a plain PostgreSQL
 * database, using the same generator the Supabase CLI uses
 * (@supabase/postgres-meta + @supabase/postgrest-typegen), without Docker.
 *
 *   DATABASE_URL=postgresql://... tsx scripts/gen-types-local.ts > src/data/supabase/database.types.ts
 *
 * With the Supabase stack running, prefer `npm run db:types`.
 */
import { PostgresMeta } from "@supabase/postgres-meta";
import { getGeneratorMetadata } from "@supabase/postgres-meta/dist/lib/generators.js";
import { generateTypescript } from "@supabase/postgrest-typegen";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/attention_deck";

const pgMeta = new PostgresMeta({ connectionString, max: 2 });
const { data, error } = await getGeneratorMetadata(pgMeta, {
  includedSchemas: ["public"],
  excludedSchemas: [],
});
if (error || !data) {
  console.error(error);
  process.exit(1);
}
const out = await generateTypescript(data, { detectOneToOneRelationships: true, defaultSchema: "public" });
process.stdout.write(out);
await pgMeta.end();
