import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { User } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Token Strategy
 * 
 * Handles JWT access tokens and refresh tokens
 */
@Injectable()
export class TokenStrategy {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate access token (JWT)
   */
  generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Generate refresh token (UUID)
   */
  generateRefreshToken(): string {
    return randomUUID();
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(user: User): TokenPair {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();
    const expiresIn = this.getAccessTokenExpirySeconds();

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): TokenPayload {
    return this.jwtService.verify<TokenPayload>(token);
  }

  /**
   * Get access token expiry in seconds
   */
  getAccessTokenExpirySeconds(): number {
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') || '15m';
    return this.parseTimeToSeconds(expiresIn);
  }

  /**
   * Get refresh token expiry date
   */
  getRefreshTokenExpiry(): Date {
    const days = parseInt(
      this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN')?.replace('d', '') || '7',
      10,
    );
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Parse time string to seconds (e.g., "15m" -> 900)
   */
  private parseTimeToSeconds(time: string): number {
    const value = parseInt(time.slice(0, -1), 10);
    const unit = time.slice(-1);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900; 
    }
  }
}
