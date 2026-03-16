import { db, sqlite } from '../drizzle/db';
import { kbItems } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

async function backfillFts() {
  console.log('Starting FTS backfill...');

  try {
    const items = await db.select().from(kbItems).all();
    console.log(`Found ${items.length} KB items to process.`);

    let inserted = 0;
    let skipped = 0;

    for (const item of items) {
      try {
        db.run(
          sql`INSERT OR IGNORE INTO kb_items_fts(rowid, title, content, summary) VALUES (${item.id}, ${item.title}, ${item.content}, ${item.summary})`,
        );
        inserted++;
      } catch (err) {
        skipped++;
        console.error(`Failed to insert FTS for item ${item.id}:`, err);
      }
    }

    console.log(`\n✓ Backfill complete: ${inserted} inserted, ${skipped} skipped.`);
  } catch (error) {
    console.error('Error during FTS backfill:', error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

backfillFts();
