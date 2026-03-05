import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User } from '../../drizzle/schema';
import { DRIZZLE_CLIENT } from '../database';
import { AuthService } from './auth.service';

type MockDb = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
};

type SelectBuilder = {
  from: jest.Mock;
};

type WhereBuilder = {
  where: jest.Mock;
};

type GetBuilder<T> = {
  get: jest.Mock<Promise<T | undefined>, []>;
};

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let mockDb: MockDb;
  let mockConfigService: { get: jest.Mock };

  const activeUser: User = {
    id: 1,
    username: 'john',
    email: 'john@example.com',
    password: 'hashed-pass',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    lastLoginAt: null,
  };

  const pendingUser: User = {
    ...activeUser,
    status: 'PENDING',
  };

  const bannedUser: User = {
    ...activeUser,
    status: 'BANNED',
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'auth.jwtAccessSecret': 'test-access-secret-that-is-long-enough',
          'auth.jwtRefreshSecret': 'test-refresh-secret-that-is-long-enough',
          'auth.jwtAccessExpiry': '15m',
          'auth.jwtRefreshExpiry': '7d',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DRIZZLE_CLIENT,
          useValue: {
            select: jest.fn(),
            insert: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    mockDb = module.get(DRIZZLE_CLIENT) as MockDb;

    jest.clearAllMocks();
  });

  function mockSelectGetOnce<T>(value: T | undefined): void {
    const getBuilder: GetBuilder<T> = {
      get: jest.fn(async () => value),
    };

    const whereBuilder: WhereBuilder = {
      where: jest.fn(() => getBuilder),
    };

    const selectBuilder: SelectBuilder = {
      from: jest.fn(() => whereBuilder),
    };

    mockDb.select.mockReturnValueOnce(selectBuilder);
  }

  function mockInsertValuesResolved(): jest.Mock {
    const values = jest.fn(async () => undefined);
    mockDb.insert.mockReturnValue({ values });
    return values;
  }

  function mockUpdateSetWhereResolved(): { set: jest.Mock; where: jest.Mock } {
    const where = jest.fn(async () => undefined);
    const set = jest.fn(() => ({ where }));
    mockDb.update.mockReturnValue({ set });
    return { set, where };
  }

  it('register: new email -> user inserted with PENDING status, password hashed', async () => {
    mockSelectGetOnce(undefined);
    mockSelectGetOnce(undefined);
    const values = mockInsertValuesResolved();

    const result = await service.register({
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
    });

    expect(result).toEqual({ message: 'Account pending approval' });
    const insertedArg = values.mock.calls[0]?.[0] as {
      password: string;
      status: string;
      role: string;
    };
    expect(insertedArg).toMatchObject({
      status: 'PENDING',
      role: 'USER',
    });
    expect(insertedArg.password).not.toBe('password123');
    expect(await bcrypt.compare('password123', insertedArg.password)).toBe(true);
  });

  it('register: duplicate email -> throws ConflictException', async () => {
    mockSelectGetOnce(activeUser);

    await expect(
      service.register({
        username: 'someone',
        email: 'john@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('register: duplicate username -> throws ConflictException', async () => {
    mockSelectGetOnce(undefined);
    mockSelectGetOnce(activeUser);

    await expect(
      service.register({
        username: 'john',
        email: 'other@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('validateUser: correct credentials -> returns user object', async () => {
    const hashedPassword = await bcrypt.hash('password123', 12);
    mockSelectGetOnce({
      ...activeUser,
      password: hashedPassword,
    });

    const result = await service.validateUser('john@example.com', 'password123');

    expect(result).toEqual({
      ...activeUser,
      password: hashedPassword,
    });
  });

  it('validateUser: wrong password -> returns null', async () => {
    const hashedPassword = await bcrypt.hash('password123', 12);
    mockSelectGetOnce({
      ...activeUser,
      password: hashedPassword,
    });

    const result = await service.validateUser('john@example.com', 'bad-password');

    expect(result).toBeNull();
  });

  it('login: ACTIVE user -> returns accessToken + user shape', async () => {
    jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
    jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
    mockInsertValuesResolved();
    mockUpdateSetWhereResolved();

    const result = await service.login(activeUser);

    expect(result).toMatchObject({
      accessToken: 'access-token',
      user: {
        id: activeUser.id,
        username: activeUser.username,
        email: activeUser.email,
        role: activeUser.role,
      },
    });
  });

  it('login: PENDING user -> throws ForbiddenException with "Account pending approval"', async () => {
    await expect(service.login(pendingUser)).rejects.toThrow(
      new ForbiddenException('Account pending approval'),
    );
  });

  it('login: BANNED user -> throws ForbiddenException with "Account suspended"', async () => {
    await expect(service.login(bannedUser)).rejects.toThrow(
      new ForbiddenException('Account suspended'),
    );
  });

  it('refresh: valid token -> old token revoked, new token returned', async () => {
    const nowPlusOneHour = Math.floor(Date.now() / 1000) + 3600;

    jwtService.verify.mockReturnValue({ sub: activeUser.id, jti: 'jti-1', exp: nowPlusOneHour });
    mockSelectGetOnce({
      id: 10,
      userId: activeUser.id,
      token: 'old-refresh-token',
      revoked: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    });
    mockSelectGetOnce(activeUser);

    const firstUpdate = mockUpdateSetWhereResolved();
    const insertValues = mockInsertValuesResolved();

    jwtService.sign
      .mockReturnValueOnce('new-access-token')
      .mockReturnValueOnce('new-refresh-token');
    jwtService.decode.mockReturnValue({ exp: nowPlusOneHour });

    const result = await service.refresh('old-refresh-token');

    expect(result).toMatchObject({ accessToken: 'new-access-token' });
    expect(firstUpdate.set).toHaveBeenCalledWith({ revoked: true });
    expect(insertValues).toHaveBeenCalled();
  });

  it('refresh: revoked token -> throws UnauthorizedException', async () => {
    jwtService.verify.mockReturnValue({ sub: activeUser.id, jti: 'jti-1', exp: 9999999999 });
    mockSelectGetOnce({
      id: 99,
      userId: activeUser.id,
      token: 'revoked-token',
      revoked: true,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    });

    await expect(service.refresh('revoked-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout: valid token -> refresh token marked revoked', async () => {
    const updateCall = mockUpdateSetWhereResolved();

    await service.logout('refresh-token');

    expect(updateCall.set).toHaveBeenCalledWith({ revoked: true });
  });

  it('revokeAllTokensForUser: all tokens for userId set revoked: true', async () => {
    const updateCall = mockUpdateSetWhereResolved();

    await service.revokeAllTokensForUser(7);

    expect(updateCall.set).toHaveBeenCalledWith({ revoked: true });
  });
});
