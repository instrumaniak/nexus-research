import { Test } from '@nestjs/testing';
import { LoggingService } from '../logging/logging.service';
import { blobToFloat32Array, EmbeddingsService, float32ArrayToBlob } from './embeddings.service';

describe('EmbeddingsService', () => {
  it('should round-trip Float32Array via Buffer helpers', () => {
    const original = new Float32Array([1.5, -2.25, 3.75]);

    const blob = float32ArrayToBlob(original);
    const roundTripped = blobToFloat32Array(blob);

    expect(roundTripped).toHaveLength(original.length);
    for (let i = 0; i < original.length; i += 1) {
      expect(roundTripped[i]).toBeCloseTo(original[i]);
    }
  });

  it('logs and throws when pipeline is not initialised', async () => {
    const loggingService: Pick<LoggingService, 'error' | 'log' | 'warn'> = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmbeddingsService,
        {
          provide: LoggingService,
          useValue: loggingService,
        },
      ],
    }).compile();

    const service = moduleRef.get(EmbeddingsService);

    await expect(service.embed('hello')).rejects.toThrow('Embeddings pipeline not initialised');
  });
});
