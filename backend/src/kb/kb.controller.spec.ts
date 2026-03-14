import { Test, TestingModule } from '@nestjs/testing';
import type { User } from '../../drizzle/schema';
import { KbController } from './kb.controller';
import { KbService } from './kb.service';

const user: User = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  password: 'hashed',
  role: 'USER',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  lastLoginAt: null,
};

describe('KbController', () => {
  let controller: KbController;
  let service: {
    save: jest.Mock;
    list: jest.Mock;
    search: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      save: jest.fn(),
      list: jest.fn(),
      search: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KbController],
      providers: [{ provide: KbService, useValue: service }],
    }).compile();

    controller = module.get<KbController>(KbController);
  });

  it('save forwards dto and userId', async () => {
    service.save.mockResolvedValueOnce({ id: 1 });

    const dto = {
      title: 'Title',
      content: 'Content',
      summary: undefined,
      sourceUrl: undefined,
      tags: ['ai'],
    };

    await controller.save(dto, user);

    expect(service.save).toHaveBeenCalledWith(user.id, dto);
  });

  it('list forwards query params and userId', async () => {
    service.list.mockResolvedValueOnce([]);

    const dto = { tag: 'ai', page: 2, limit: 10 };

    await controller.list(user, dto);

    expect(service.list).toHaveBeenCalledWith(user.id, dto.tag, dto.page, dto.limit);
  });

  it('search forwards query and userId', async () => {
    service.search.mockResolvedValueOnce([]);

    const params = { q: 'search term' };

    await controller.search(user, params);

    expect(service.search).toHaveBeenCalledWith(user.id, params.q);
  });

  it('findOne forwards id and userId', async () => {
    service.findOne.mockResolvedValueOnce({ id: 5 });

    await controller.findOne(user, 5);

    expect(service.findOne).toHaveBeenCalledWith(user.id, 5);
  });

  it('delete forwards id and userId', async () => {
    service.delete.mockResolvedValueOnce(undefined);

    await controller.delete(user, 9);

    expect(service.delete).toHaveBeenCalledWith(user.id, 9);
  });
});
