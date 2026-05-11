import { IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  // Login with Email & Username
  @IsString({ message: 'Email or username is invalid' })
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  identifier!: string;

  @IsString()
  @MinLength(8, { message: 'Password cannot empty' })
  @MaxLength(72, { message: 'Password is not over 72 characters' })
  password!: string;
}
