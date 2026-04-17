import { UserRole } from '@generated/prisma/enums';

export interface ICurrentUser {
  id: string;
  email: string;
  username: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  role: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
