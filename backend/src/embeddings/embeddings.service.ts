import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggingService } from '../logging/logging.service';

export function float32ArrayToBlob(arr: Float32Array): Buffer {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
}

export function blobToFloat32Array(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

type EmbeddingPipeline = (
  input: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{
  tolist(): number[][];
}>;

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private pipe: EmbeddingPipeline | null = null;
  private readonly useStub = process.env.EMBEDDINGS_STUB === 'true';

  constructor(private readonly loggingService: LoggingService) {}

  async onModuleInit(): Promise<void> {
    if (this.useStub) {
      this.loggingService.warn('Embeddings stub enabled', 'EmbeddingsService');
      return;
    }

    this.loggingService.log('Loading embeddings model...', 'EmbeddingsService');

    const modulePromise = Function('return import("@xenova/transformers")')() as Promise<{
      pipeline: (task: string, model: string) => Promise<unknown>;
    }>;

    const { pipeline } = await modulePromise;

    const createPipeline = pipeline as (task: string, model: string) => Promise<EmbeddingPipeline>;

    this.pipe = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    this.loggingService.log('Embeddings model loaded', 'EmbeddingsService');
  }

  async embed(text: string): Promise<Float32Array> {
    try {
      if (this.useStub) {
        const stub = new Float32Array(384);
        stub[0] = text.length;
        return stub;
      }

      if (!this.pipe) {
        throw new Error('Embeddings pipeline not initialised');
      }

      const output = await this.pipe(text, {
        pooling: 'mean',
        normalize: true,
      });

      const tensor = (output as { tolist: () => number[][] }).tolist()[0];
      return new Float32Array(tensor);
    } catch (err) {
      this.loggingService.error(`Embedding failed: ${String(err)}`, 'EmbeddingsService');
      throw err;
    }
  }
}
