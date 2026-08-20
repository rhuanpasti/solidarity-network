import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BackendAvailabilityService } from './backend-availability.service';

describe('BackendAvailabilityService', () => {
  it('tracks temporary backend unavailability and can clear it', () => {
    const service = new BackendAvailabilityService();

    assert.equal(service.isUnavailable(), false);
    service.markUnavailable();
    assert.equal(service.isUnavailable(), true);
    service.clear();
    assert.equal(service.isUnavailable(), false);
  });
});
