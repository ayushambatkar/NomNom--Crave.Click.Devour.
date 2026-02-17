import type { User } from '@prisma/client';

export class UserExtensions {
  static isGuest(user: User): boolean {
    return !user.phoneNumber;
  }
}
