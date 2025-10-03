import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from '../../repositories/users.repository';
import { RefreshTokenRepository } from '../../repositories/refresh-token.repository';
import { PasswordStrategy } from '../strategies/password.strategy';
import { TokenStrategy } from '../strategies/token.strategy';
import { LoggerService } from '../../logging/logger.service';

@Injectable()
export class AuthService {
  private readonly context = AuthService.name;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordStrategy: PasswordStrategy,
    private readonly tokenStrategy: TokenStrategy,
    private readonly logger: LoggerService,
  ) {}

  async register(data: { email: string; name: string; password: string; phone?: string }) {
    this.logger.log(`Registration attempt for email: ${data.email}`, this.context);

    const validation = this.passwordStrategy.validate(data.password);
    if (!validation.valid) {
      this.logger.warn(`Weak password attempt: ${validation.errors.join(', ')}`, this.context);
      throw new BadRequestException(validation.errors);
    }

    const emailExists = await this.usersRepository.findByEmail(data.email);
    if (emailExists) {
      this.logger.warn(`Registration failed: Email already exists ${data.email}`, this.context);
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await this.passwordStrategy.hash(data.password);

    const user = await this.usersRepository.createUser({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      phone: data.phone,
    });

    this.logger.log(`User registered successfully: ${user.id}`, this.context);
    return this.makeTokens(user);
  }

  async login(data: { email: string; password: string }) {
    this.logger.log(`Login attempt for email: ${data.email}`, this.context);

    const user = await this.usersRepository.findByEmail(data.email);
    if (!user || user.deletedAt) {
      this.logger.warn(`Login failed: User not found ${data.email}`, this.context);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await this.passwordStrategy.compare(data.password, user.password);
    if (!valid) {
      this.logger.warn(`Login failed: Invalid password for ${data.email}`, this.context);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    this.logger.log(`User logged in successfully: ${user.id}`, this.context);
    return this.makeTokens(user);
  }

  async refreshToken(token: string) {
    this.logger.debug('Refresh token attempt', this.context);

    const record = await this.refreshTokenRepository.findValidToken(token);

    if (!record || !record.user) {
      this.logger.warn('Invalid refresh token attempt', this.context);
      throw new UnauthorizedException('Refresh token inválido');
    }

    await this.refreshTokenRepository.revokeToken(record.id);

    this.logger.log(`Token refreshed for user: ${record.user.id}`, this.context);
    return this.makeTokens(record.user);
  }

  async logout(userId: string, token: string) {
    this.logger.log(`Logout for user: ${userId}`, this.context);
    await this.refreshTokenRepository.revokeUserTokens(userId, token);
  }

  private async makeTokens(user: User) {
    const tokenPair = this.tokenStrategy.generateTokenPair(user);
    const expiresAt = this.tokenStrategy.getRefreshTokenExpiry();

    await this.refreshTokenRepository.createToken({
      user: { connect: { id: user.id } },
      token: tokenPair.refreshToken,
      expiresAt,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}