import { db, sqlite } from '../drizzle/db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import prompts from 'prompts';
import { z } from 'zod';

// Email validation schema using Zod
const emailSchema = z.string().email('Invalid email address');

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

  // Validate email if provided via CLI using Zod
  if (args.email) {
    const result = emailSchema.safeParse(args.email);
    if (!result.success) {
      console.error(`Invalid email address: ${args.email}`);
      process.exit(1);
    }
  }

  // Validate password length if provided via CLI
  if (args.password && args.password.length < 6) {
    console.error('Password must be at least 6 characters');
    process.exit(1);
  }

  return args;
}

async function askForMissingArgs(args: Args): Promise<Args> {
  const questions = [];
  if (!args.username) {
    questions.push({
      type: 'text',
      name: 'username',
      message: 'Enter username:',
      validate: (value: string) => (value.length > 0 ? true : 'Username is required'),
    });
  }
  if (!args.email) {
    questions.push({
      type: 'text',
      name: 'email',
      message: 'Enter email:',
      validate: (value: string) => {
        const result = emailSchema.safeParse(value);
        return result.success ? true : result.error.errors[0].message;
      },
    });
  }
  if (!args.password) {
    questions.push({
      type: 'password',
      name: 'password',
      message: 'Enter password:',
      validate: (value: string) =>
        value.length >= 6 ? true : 'Password must be at least 6 characters',
    });
  }

  if (questions.length > 0) {
    const answers = await prompts(questions);
    return {
      username: args.username || answers.username,
      email: args.email || answers.email,
      password: args.password || answers.password,
    };
  }
  return args;
}

async function createSuperadmin() {
  let args = parseArgs();
  args = await askForMissingArgs(args);

  const { username, email, password } = args;

  if (!username || !email || !password) {
    console.error('Missing required arguments.');
    process.exit(1);
  }

  // Validate password length
  if (password.length < 6) {
    console.error('Password must be at least 6 characters');
    process.exit(1);
  }

  // Final email validation using Zod
  const emailValidation = emailSchema.safeParse(email);
  if (!emailValidation.success) {
    console.error(`Invalid email address: ${email}`);
    process.exit(1);
  }

  try {
    // Check if email already exists (only email uniqueness check as per requirement)
    const existingEmail = await db.select().from(users).where(eq(users.email, email)).get();

    if (existingEmail) {
      console.error(`User with email "${email}" already exists. No action taken.`);
      process.exit(1);
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
