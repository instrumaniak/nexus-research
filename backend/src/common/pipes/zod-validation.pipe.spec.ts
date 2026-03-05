import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

const testSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(testSchema);
  });

  it('passes valid input through unchanged', () => {
    const input = { email: 'user@example.com', password: 'password123' };
    expect(pipe.transform(input, {} as ArgumentMetadata)).toEqual(input);
  });

  it('throws BadRequestException for invalid email', () => {
    const input = { email: 'not-an-email', password: 'password123' };
    expect(() => pipe.transform(input, {} as ArgumentMetadata)).toThrow(BadRequestException);
  });

  it('throws BadRequestException for missing fields', () => {
    expect(() => pipe.transform({}, {} as ArgumentMetadata)).toThrow(BadRequestException);
  });

  it('error response contains field-level detail', () => {
    try {
      pipe.transform({ email: 'bad', password: 'short' }, {} as ArgumentMetadata);
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const response = (err as BadRequestException).getResponse() as {
        errors: Array<{ field: string; message: string }>;
      };
      expect(response.errors).toBeInstanceOf(Array);
      expect(response.errors[0]).toHaveProperty('field');
      expect(response.errors[0]).toHaveProperty('message');
    }
  });
});
