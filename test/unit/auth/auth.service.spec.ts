import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../src/auth/services/auth.service';
import { UsersRepository } from '../../../src/repositories/users.repository';
import { RefreshTokenRepository } from '../../../src/repositories/refresh-token.repository';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    phone: null,
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            createUser: jest.fn(),
            findActiveByEmail: jest.fn(),
          },
        },
        {
          provide: RefreshTokenRepository,
          useValue: {
            createToken: jest.fn(),
            findValidToken: jest.fn(),
            revokeToken: jest.fn(),
            revokeUserTokens: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('7d'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get(UsersRepository);
    refreshTokenRepository = module.get(RefreshTokenRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData = {
      email: 'newuser@example.com',
      name: 'New User',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.createUser.mockResolvedValue(mockUser);
      refreshTokenRepository.createToken.mockResolvedValue({
        id: 'token-id',
        userId: mockUser.id,
        token: 'refresh-token',
        expiresAt: new Date(),
        createdAt: new Date(),
        revokedAt: null,
      });

      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword' as never));

      const result = await service.register(registerData);

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(usersRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerData.email,
          name: registerData.name,
          password: 'hashedPassword',
        }),
      );
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerData)).rejects.toThrow(ConflictException);
      await expect(service.register(registerData)).rejects.toThrow('Email já cadastrado');
      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      refreshTokenRepository.createToken.mockResolvedValue({
        id: 'token-id',
        userId: mockUser.id,
        token: 'refresh-token',
        expiresAt: new Date(),
        createdAt: new Date(),
        revokedAt: null,
      });

      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true as never));

      
      const result = await service.login(loginData);

     
      expect(usersRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      
      usersRepository.findByEmail.mockResolvedValue(null);

      
      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginData)).rejects.toThrow('Credenciais inválidas');
    });

    it('should throw UnauthorizedException if user is deleted', async () => {
      
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      usersRepository.findByEmail.mockResolvedValue(deletedUser);

      
      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false as never));

      
      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginData)).rejects.toThrow('Credenciais inválidas');
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh tokens successfully', async () => {
      
      const mockTokenRecord = {
        id: 'token-id',
        userId: mockUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        revokedAt: null,
        user: mockUser,
      };

      refreshTokenRepository.findValidToken.mockResolvedValue(mockTokenRecord);
      refreshTokenRepository.revokeToken.mockResolvedValue({
        ...mockTokenRecord,
        revokedAt: new Date(),
      });
      refreshTokenRepository.createToken.mockResolvedValue({
        id: 'new-token-id',
        userId: mockUser.id,
        token: 'new-refresh-token',
        expiresAt: new Date(),
        createdAt: new Date(),
        revokedAt: null,
      });

      
      const result = await service.refreshToken(refreshToken);

     
      expect(refreshTokenRepository.findValidToken).toHaveBeenCalledWith(refreshToken);
      expect(refreshTokenRepository.revokeToken).toHaveBeenCalledWith(mockTokenRecord.id);
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      
      refreshTokenRepository.findValidToken.mockResolvedValue(null);

      
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(refreshToken)).rejects.toThrow('Refresh token inválido');
    });
  });

  describe('logout', () => {
    it('should revoke user tokens successfully', async () => {
      
      const userId = '123';
      const token = 'token-to-revoke';
      refreshTokenRepository.revokeUserTokens.mockResolvedValue(1);

      
      await service.logout(userId, token);

     
      expect(refreshTokenRepository.revokeUserTokens).toHaveBeenCalledWith(userId, token);
    });
  });
});
