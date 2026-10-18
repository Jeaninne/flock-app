import bcrypt from 'bcryptjs';

// bcrypt cost factor: each +1 doubles the hashing time
const SALT_ROUNDS = 10;

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, SALT_ROUNDS);

const DUMMY_HASH = await hashPassword('dummy');
export const verifyPassword = (password: string, hash?: string | null): Promise<boolean> =>
  bcrypt.compare(password, hash ?? DUMMY_HASH);
