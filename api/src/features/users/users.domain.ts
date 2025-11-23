import bcrypt from 'bcrypt';
import { usersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto } from './users.interface';

export class UsersDomain {
  async getAllUsers() {
    return usersRepository.findAll();
  }

  async getUserById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateUser(id: string, data: UpdateUserDto) {
    await this.getUserById(id); // Ensure user exists
    return usersRepository.update(id, data);
  }
}

export const usersDomain = new UsersDomain();
