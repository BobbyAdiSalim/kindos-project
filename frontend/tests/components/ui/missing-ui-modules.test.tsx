import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const files = [
  'src/app/components/layout/root-layout.tsx',
  'src/app/components/ui/accordion.tsx',
  'src/app/components/ui/aspect-ratio.tsx',
  'src/app/components/ui/avatar.tsx',
  'src/app/components/ui/breadcrumb.tsx',
  'src/app/components/ui/calendar.tsx',
  'src/app/components/ui/carousel.tsx',
  'src/app/components/ui/checkbox.tsx',
  'src/app/components/ui/collapsible.tsx',
  'src/app/components/ui/command.tsx',
  'src/app/components/ui/context-menu.tsx',
  'src/app/components/ui/drawer.tsx',
  'src/app/components/ui/hover-card.tsx',
  'src/app/components/ui/input-otp.tsx',
  'src/app/components/ui/menubar.tsx',
  'src/app/components/ui/navigation-menu.tsx',
  'src/app/components/ui/pagination.tsx',
  'src/app/components/ui/popover.tsx',
  'src/app/components/ui/progress.tsx',
  'src/app/components/ui/radio-group.tsx',
  'src/app/components/ui/resizable.tsx',
  'src/app/components/ui/scroll-area.tsx',
  'src/app/components/ui/separator.tsx',
  'src/app/components/ui/sidebar.tsx',
  'src/app/components/ui/skeleton.tsx',
  'src/app/components/ui/slider.tsx',
  'src/app/components/ui/tabs.tsx',
  'src/app/components/ui/textarea.tsx',
  'src/app/components/ui/toggle-group.tsx',
  'src/app/components/ui/toggle.tsx',
] as const;

describe('missing UI module file checks', () => {
  it.each(files)('has test coverage placeholder for %s', (relativePath) => {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    expect(fs.existsSync(absolutePath)).toBe(true);

    const content = fs.readFileSync(absolutePath, 'utf8').trim();
    expect(content.length).toBeGreaterThan(0);
  });
});
