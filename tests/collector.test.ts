/**
 * Tests for FeedbackCollector
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  FeedbackCollector,
  MemoryHandler,
  ConsoleHandler,
  CallbackHandler,
  ValidationError,
} from '../src/index.js';

// Test schemas
const NpsSchema = z.object({
  score: z.number().min(0).max(10),
  comment: z.string().optional(),
});

type NpsScore = z.infer<typeof NpsSchema>;

describe('FeedbackCollector', () => {
  describe('basic collection', () => {
    it('should collect feedback with valid data', async () => {
      const memory = new MemoryHandler<NpsScore>();
      const collector = new FeedbackCollector<NpsScore>({
        type: 'nps',
        schema: NpsSchema,
      });
      collector.use(memory);

      const result = await collector.collect({ score: 9, comment: 'Great!' });

      expect(result.id).toBeDefined();
      expect(result.type).toBe('nps');
      expect(result.data.score).toBe(9);
      expect(result.data.comment).toBe('Great!');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(memory.count).toBe(1);
    });

    it('should include metadata in collected items', async () => {
      const memory = new MemoryHandler<NpsScore>();
      const collector = new FeedbackCollector<NpsScore>({
        type: 'nps',
        defaultMetadata: { source: 'web' },
      });
      collector.use(memory);

      await collector.collect({ score: 8 }, { userId: 'user-123' });

      expect(memory.last?.metadata.source).toBe('web');
      expect(memory.last?.metadata.userId).toBe('user-123');
    });
  });

  describe('validation', () => {
    it('should reject invalid data with Zod schema', async () => {
      const collector = new FeedbackCollector<NpsScore>({
        type: 'nps',
        schema: NpsSchema,
      });

      await expect(collector.collect({ score: 11 } as NpsScore))
        .rejects.toThrow(ValidationError);
    });

    it('should validate without collecting', async () => {
      const collector = new FeedbackCollector<NpsScore>({
        type: 'nps',
        schema: NpsSchema,
      });

      const validResult = await collector.validate({ score: 5 });
      expect(validResult.valid).toBe(true);

      const invalidResult = await collector.validate({ score: -1 });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('hooks', () => {
    it('should call onBeforeCollect hook', async () => {
      const beforeHook = vi.fn();
      const collector = new FeedbackCollector<NpsScore>({ type: 'nps' });
      collector.onBeforeCollect(beforeHook);

      await collector.collect({ score: 7 });

      expect(beforeHook).toHaveBeenCalledTimes(1);
      expect(beforeHook).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'nps',
          data: { score: 7 },
        })
      );
    });

    it('should cancel collection when beforeCollect returns false', async () => {
      const memory = new MemoryHandler<NpsScore>();
      const collector = new FeedbackCollector<NpsScore>({ type: 'nps' });
      collector.use(memory);
      collector.onBeforeCollect(() => false);

      await expect(collector.collect({ score: 7 })).rejects.toThrow('Cancelled');
      expect(memory.count).toBe(0);
    });

    it('should call onAfterCollect hook', async () => {
      const afterHook = vi.fn();
      const collector = new FeedbackCollector<NpsScore>({ type: 'nps' });
      collector.onAfterCollect(afterHook);

      await collector.collect({ score: 8 });

      expect(afterHook).toHaveBeenCalledTimes(1);
      expect(afterHook).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          type: 'nps',
        })
      );
    });

    it('should call onError hook on validation failure', async () => {
      const errorHook = vi.fn();
      const collector = new FeedbackCollector<NpsScore>({
        type: 'nps',
        schema: NpsSchema,
      });
      collector.onError(errorHook);

      await expect(collector.collect({ score: 15 } as NpsScore)).rejects.toThrow();

      expect(errorHook).toHaveBeenCalledTimes(1);
      expect(errorHook).toHaveBeenCalledWith(
        expect.any(ValidationError),
        expect.objectContaining({ phase: 'validation' })
      );
    });
  });

  describe('handlers', () => {
    it('should work with CallbackHandler', async () => {
      const callback = vi.fn();
      const collector = new FeedbackCollector<NpsScore>({ type: 'nps' });
      collector.use(new CallbackHandler(callback));

      await collector.collect({ score: 9 });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should work with MemoryHandler', async () => {
      const memory = new MemoryHandler<NpsScore>({ maxItems: 2 });
      const collector = new FeedbackCollector<NpsScore>({ type: 'nps' });
      collector.use(memory);

      await collector.collect({ score: 1 });
      await collector.collect({ score: 2 });
      await collector.collect({ score: 3 });

      expect(memory.count).toBe(2);
      expect(memory.items[0].data.score).toBe(2);
      expect(memory.items[1].data.score).toBe(3);
    });
  });

  describe('chaining', () => {
    it('should support method chaining', async () => {
      const memory = new MemoryHandler<NpsScore>();

      const collector = new FeedbackCollector<NpsScore>({
        type: 'nps',
        schema: NpsSchema,
      })
        .use(memory)
        .onBeforeCollect(() => {})
        .onAfterCollect(() => {})
        .onError(() => {});

      await collector.collect({ score: 10 });

      expect(memory.count).toBe(1);
    });
  });
});

describe('MemoryHandler', () => {
  it('should find items by predicate', async () => {
    const memory = new MemoryHandler<NpsScore>();
    const collector = new FeedbackCollector<NpsScore>({ type: 'nps' });
    collector.use(memory);

    await collector.collect({ score: 5 });
    await collector.collect({ score: 9 });
    await collector.collect({ score: 3 });

    const highScores = memory.find((item) => item.data.score >= 7);
    expect(highScores.length).toBe(1);
    expect(highScores[0].data.score).toBe(9);
  });

  it('should clear stored items', async () => {
    const memory = new MemoryHandler<NpsScore>();
    const collector = new FeedbackCollector<NpsScore>({ type: 'nps' });
    collector.use(memory);

    await collector.collect({ score: 5 });
    expect(memory.count).toBe(1);

    memory.clear();
    expect(memory.count).toBe(0);
  });
});
