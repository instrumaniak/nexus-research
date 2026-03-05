import { db, sqlite } from '../drizzle/db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

interface Args {
  username?: string;
  email?: string;
  password?: string;
}

function parseArgs(): Args {
  const args: Args = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2) as keyof Args;
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++;
      }
    }
  }

  return args;
}

async function createSuperadmin() {
  const args = parseArgs();

  const username = args.username;
  const email = args.email;
  const password = args.password;

  if (!username || !email || !password) {
    console.error('Usage: npx ts-node scripts/create-superadmin.ts --username <name> --email <email> --password <pass>');
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (existingUser) {
      console.log(`User "${username}" already exists. No action taken.`);
      process.exit(0);
    }

    // Hash password with bcrypt (cost factor 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert superadmin user
    const now = new Date();
    await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      role: 'SUPERADMIN',
      status: 'ACTIVE',
      createdAt: now,
      lastLoginAt: null,
    });

    console.log(`✓ Superadmin "${username}" created successfully.`);
    console.log(`  Email: ${email}`);
    console.log(`  Role: SUPERADMIN`);
    console.log(`  Status: ACTIVE`);
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    sqlite.close();
  }
}

// Run the script
createSuperadmin();
