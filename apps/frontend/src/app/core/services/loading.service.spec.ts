import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  beforeEach(() => {
    Object.assign(globalThis, {
      window: globalThis,
    });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it('delays visibility for short requests', () => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const service = new LoadingService();

    service.begin();
    assert.equal(service.isLoading(), true);
    assert.equal(service.isVisible(), false);

    mock.timers.tick(100);
    service.end();
    mock.timers.tick(200);

    assert.equal(service.isLoading(), false);
    assert.equal(service.isVisible(), false);
  });

  it('keeps the indicator visible for the minimum visible duration', () => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const service = new LoadingService();

    service.begin();
    mock.timers.tick(180);
    assert.equal(service.isVisible(), true);

    service.end();
    assert.equal(service.isVisible(), true);

    mock.timers.tick(319);
    assert.equal(service.isVisible(), true);
    mock.timers.tick(1);
    assert.equal(service.isVisible(), false);
  });

  it('tracks overlapping requests without hiding early', () => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const service = new LoadingService();

    service.begin();
    service.begin();
    mock.timers.tick(180);
    service.end();

    assert.equal(service.isLoading(), true);
    assert.equal(service.isVisible(), true);

    mock.timers.tick(500);
    assert.equal(service.isVisible(), true);

    service.end();
    mock.timers.tick(320);
    assert.equal(service.isLoading(), false);
    assert.equal(service.isVisible(), false);
  });
});
