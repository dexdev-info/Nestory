import { UserResponseDto } from '@modules/users/dto/user-response.dto';

export class AuthResponseDto {
  accessToken!: string;
  user!: UserResponseDto;
  // refreshToken KHÔNG có trong body — gửi qua HttpOnly Cookie
}
