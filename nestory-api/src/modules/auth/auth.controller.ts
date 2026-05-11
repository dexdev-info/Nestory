import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@modules/auth/auth.service';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { AuthResponseDto } from '@modules/auth/dto/auth-response.dto';
import { Public } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ResponseMessage } from '@common/interceptors/transform.interceptor';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // --- Cookie Helpers ---

  private setRefreshTokenCookie(res: Response, token: string, expiresAt: Date): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true, // not accessible via JS
      secure: this.config.get('app.nodeEnv') === 'production', // HTTPS only in prod
      sameSite: 'strict', // CSRF protection
      expires: expiresAt, // use exp from JWT
      path: '/api/auth', // only sent for /auth routes
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: this.config.get('app.nodeEnv') === 'production',
      sameSite: 'strict',
      path: '/api/auth',
    });
  }

  // --- Public Routes ---

  // POST /api/auth/register
  @Public()
  @Post('register')
  @ResponseMessage('Registration successful')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { response, refreshToken, refreshExpiresAt } = await this.authService.register(
      dto,
      req.headers['user-agent'],
      req.ip,
    );
    this.setRefreshTokenCookie(res, refreshToken, refreshExpiresAt);
    return response;
  }

  // POST /api/auth/login
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Login successful')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { response, refreshToken, refreshExpiresAt } = await this.authService.login(
      dto,
      req.headers['user-agent'],
      req.ip,
    );
    this.setRefreshTokenCookie(res, refreshToken, refreshExpiresAt);
    return response;
  }

  // POST /api/auth/refresh
  // @Public() because access token may be expired
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Token refreshed successfully')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const {
      response,
      refreshToken: newRefreshToken,
      refreshExpiresAt,
    } = await this.authService.refresh(refreshToken, req.headers['user-agent'], req.ip);
    this.setRefreshTokenCookie(res, newRefreshToken, refreshExpiresAt);
    return response;
  }

  // --- Protected Routes (require auth) ---

  // POST /api/auth/logout
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.clearRefreshTokenCookie(res);
  }

  // POST /api/auth/logout-all
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logoutAll(userId);
    this.clearRefreshTokenCookie(res);
  }
}
