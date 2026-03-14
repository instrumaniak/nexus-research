import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE_CLIENT } from '../database';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { LoggingService } from '../logging/logging.service';
import { KbService } from './kb.service';

describe('KbService', () => {
  let service: KbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KbService,
        {
          provide: DRIZZLE_CLIENT,
          useValue: {
            insert: jest.fn(),
            select: jest.fn(),
            delete: jest.fn(),
            all: jest.fn(),
            run: jest.fn(),
          },
        },
        {
          provide: EmbeddingsService,
          useValue: {
            embed: jest.fn(),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<KbService>(KbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
