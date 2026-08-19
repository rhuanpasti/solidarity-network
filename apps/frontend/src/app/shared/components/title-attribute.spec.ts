import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('shared component title attributes', () => {
  it('applies translated titles to real DOM elements', () => {
    const componentTemplates = [
      './page-header/page-header.component.ts',
      './list-panel/list-panel.component.ts',
      './empty-state/empty-state.component.ts',
      './modal/modal.component.ts',
    ];

    for (const templatePath of componentTemplates) {
      const source = readFileSync(new URL(templatePath, import.meta.url), 'utf8');

      assert.match(source, /\[title\]="tooltipText\(\) \| translate"/);
      assert.match(source, /tooltip = input<string \| null>\(null\)/);
      assert.match(source, /computed\(\(\) => this\.tooltip\(\) \?\? this\.title\(\)\)/);
    }
  });
});
