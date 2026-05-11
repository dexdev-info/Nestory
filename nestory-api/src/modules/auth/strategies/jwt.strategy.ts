import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ICurrentUser } from '@common/interfaces/current-user.interface';
import { UserRole } from '@generated/prisma/enums';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const accessSecret = configService.get<string>('jwt.accessSecret');

    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  // The passport automatically verifies the signature and expiration date before calling validate()
  // If the token is invalid or expired → automatically throws a 401 error
  validate(payload: JwtPayload): ICurrentUser {
    if (!payload.sub) {
      throw new UnauthorizedException('Token is invalid');
    }

    // This object will be attached to request.user
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      name: payload.name,
      role: payload.role,
    };
  }
}
