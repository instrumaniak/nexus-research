import { Injectable, OnModuleInit } from '@nestjs/common';
import { pipeline } from '@xenova/transformers';
import { LoggingService } from '../logging/logging.service';

type FeatureExtractionPipeline = (
  input: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{
  tolist(): number[][];
}>;

export function float32ArrayToBlob(arr: Float32Array): Buffer {
  return Buffer.from(arr.buffer);
}

export function blobToFloat32Array(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private pipeline: FeatureExtractionPipeline | null = null;

  constructor(private readonly loggingService: LoggingService) {}

  async onModuleInit(): Promise<void> {
    this.loggingService.log('Loading embeddings model...', 'EmbeddingsService');

    this.pipeline = (await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
    )) as unknown as FeatureExtractionPipeline;

    this.loggingService.log('Embeddings model loaded', 'EmbeddingsService');
  }

  async embed(text: string): Promise<Float32Array> {
    if (!this.pipeline) {
      this.loggingService.error('Embeddings pipeline not initialised', 'EmbeddingsService');
      throw new Error('Embeddings pipeline not initialised');
    }

    try {
      const output = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      const tensor = output.tolist()[0];

      return new Float32Array(tensor);
    } catch (error) {
      this.loggingService.error('Failed to generate embeddings', 'EmbeddingsService', undefined, {
        error:
          error instanceof Error
            ? { message: error.message, name: error.name }
            : { message: 'Unknown error' },
      });
      throw error;
    }
  }
}
