import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { User } from '../models/user.model';

async function seedAdmin() {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in environment');
  }

  await connectDatabase();

  const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log('Admin user already exists:', existing.email);
    await disconnectDatabase();
    return;
  }

  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12);
  const user = await User.create({
    name: env.SEED_ADMIN_NAME,
    email: env.SEED_ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: 'super_admin',
    isActive: true,
  });

  console.log('Created admin user:', user.email);
  await disconnectDatabase();
}

seedAdmin().catch(async (error) => {
  console.error('Seed failed:', error);
  await disconnectDatabase();
  process.exit(1);
});
