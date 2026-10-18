import bcrypt from 'bcryptjs';

// bcrypt cost factor: each +1 doubles the hashing time
const SALT_ROUNDS = 10;

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, SALT_ROUNDS);

const DUMMY_HASH = await hashPassword('dummy');
export const verifyPassword = async (password: string, hash?: string | null): Promise<boolean> => {
  if (hash) return bcrypt.compare(password, hash);
  await bcrypt.compare(password, DUMMY_HASH); // only to spend the same time; result ignored
  return false;
};
