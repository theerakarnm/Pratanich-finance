import { eq, isNull } from 'drizzle-orm';
import { db } from '../../core/database';
import { users } from '../../core/database/schema/auth-schema';
import { CreateUserDto, UpdateUserDto } from './users.interface';

export class UsersRepository {
  async findAll() {
    return db.select().from(users);
  }

  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async findByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  }

  async update(id: string, data: UpdateUserDto) {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
}

export const usersRepository = new UsersRepository();
