import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

const baseUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  password: 'hashed-password',
  role: 'USER',
  status: 'PENDING',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  lastLoginAt: new Date('2026-03-02T00:00:00.000Z'),
};

describe('AdminService', () => {
  let service: AdminService;
  let db: {
    select: jest.Mock;
    update: jest.Mock;
  };
  let authService: {
    revokeAllTokensForUser: jest.Mock;
  };
  let logging: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    db = {
      select: jest.fn(),
      update: jest.fn(),
    };

    authService = {
      revokeAllTokensForUser: jest.fn(),
    };

    logging = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = new AdminService(db as never, authService as never, logging as never);
  });

  it('getUsers returns array without password field', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          all: jest.fn().mockResolvedValue([
            {
              id: baseUser.id,
              username: baseUser.username,
              email: baseUser.email,
              role: baseUser.role,
              status: baseUser.status,
              createdAt: baseUser.createdAt,
              lastLoginAt: baseUser.lastLoginAt,
            },
          ]),
        }),
      }),
    });

    await expect(service.getUsers()).resolves.toEqual([
      {
        id: baseUser.id,
        username: baseUser.username,
        email: baseUser.email,
        role: baseUser.role,
        status: baseUser.status,
        createdAt: baseUser.createdAt,
        lastLoginAt: baseUser.lastLoginAt,
      },
    ]);
  });

  it('approveUser sets status ACTIVE and returns updated user', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ ...baseUser, status: 'PENDING' }),
        }),
      }),
    });
    db.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ ...baseUser, status: 'ACTIVE' }),
          }),
        }),
      }),
    });

    await expect(service.approveUser(baseUser.id)).resolves.toEqual({
      ...baseUser,
      status: 'ACTIVE',
    });
  });

  it('approveUser throws NotFoundException for unknown id', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    });

    await expect(service.approveUser(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('approveUser throws BadRequestException if already ACTIVE', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ ...baseUser, status: 'ACTIVE' }),
        }),
      }),
    });

    await expect(service.approveUser(baseUser.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('banUser sets status BANNED and calls revokeAllTokensForUser', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ ...baseUser, status: 'ACTIVE' }),
        }),
      }),
    });
    db.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ ...baseUser, status: 'BANNED' }),
          }),
        }),
      }),
    });

    await expect(service.banUser(baseUser.id)).resolves.toEqual({
      ...baseUser,
      status: 'BANNED',
    });
    expect(authService.revokeAllTokensForUser).toHaveBeenCalledWith(baseUser.id);
  });

  it('banUser throws NotFoundException for unknown id', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    });

    await expect(service.banUser(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('unbanUser sets status ACTIVE', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ ...baseUser, status: 'BANNED' }),
        }),
      }),
    });
    db.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ ...baseUser, status: 'ACTIVE' }),
          }),
        }),
      }),
    });

    await expect(service.unbanUser(baseUser.id)).resolves.toEqual({
      ...baseUser,
      status: 'ACTIVE',
    });
  });

  it('unbanUser throws BadRequestException if user is not BANNED', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ ...baseUser, status: 'ACTIVE' }),
        }),
      }),
    });

    await expect(service.unbanUser(baseUser.id)).rejects.toBeInstanceOf(BadRequestException);
  });
});
