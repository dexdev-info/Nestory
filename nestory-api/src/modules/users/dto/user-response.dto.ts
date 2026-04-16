import { Exclude, Expose, Transform } from 'class-transformer';
import { UserRole } from '@generated/prisma/enums';

@Exclude()
export class UserResponseDto {
  @Expose() id!: string;
  @Expose() email!: string;
  @Expose() username!: string;
  @Expose() name!: string | null;
  @Expose() bio!: string | null;
  @Expose() avatarUrl!: string | null;
  @Expose() role!: UserRole;
  @Expose() isActive!: boolean;
  @Expose() isVerified!: boolean;
  @Expose()
  @Transform(({ value }: { value: Date }) => value?.toISOString())
  createdAt!: Date;
  @Expose()
  @Transform(({ value }: { value: Date }) => value?.toISOString())
  updatedAt!: Date;
  // passwordHash, deletedAt — Not @Expose() → auto stripped
  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
