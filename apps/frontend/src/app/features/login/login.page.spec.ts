import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { copyTextToClipboard } from './login.page';

describe('copyTextToClipboard', () => {
  it('copies text with the Clipboard API', async () => {
    let copiedValue = '';
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: async (value: string) => {
            copiedValue = value;
          },
        },
      },
    });

    try {
      assert.equal(await copyTextToClipboard('demo-user-2026'), true);
      assert.equal(copiedValue, 'demo-user-2026');
    } finally {
      if (originalNavigator) {
        Object.defineProperty(globalThis, 'navigator', originalNavigator);
      } else {
        delete (globalThis as { navigator?: unknown }).navigator;
      }
    }
  });
});
