import { RequestMethod } from '@nestjs/common';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ObservabilityModule } from './observability.module';

describe('ObservabilityModule', () => {
  it('registers request tracing with a named wildcard route', () => {
    const forRoutes = mock.fn();
    const apply = mock.fn(() => ({ forRoutes }));

    new ObservabilityModule().configure({ apply } as never);

    assert.deepEqual(forRoutes.mock.calls[0]?.arguments, [
      { path: '*path', method: RequestMethod.ALL },
    ]);
  });
});
