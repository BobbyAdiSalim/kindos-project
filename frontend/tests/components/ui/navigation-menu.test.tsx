import { render } from '@testing-library/react';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from '@/app/components/ui/navigation-menu';

describe('NavigationMenu', () => {
  it('renders viewport by default', () => {
    const { container } = render(
      <NavigationMenu>
        <NavigationMenuList />
      </NavigationMenu>
    );

    expect(container.querySelector('[data-slot="navigation-menu"]')).toHaveAttribute('data-viewport', 'true');
  });

  it('omits viewport when viewport is false', () => {
    const { container } = render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList />
      </NavigationMenu>
    );

    expect(container.querySelector('[data-slot="navigation-menu"]')).toHaveAttribute('data-viewport', 'false');
    expect(container.querySelector('[data-slot="navigation-menu-viewport"]')).toBeNull();
  });

  it('renders trigger and link primitives within menu context', () => {
    const { container } = render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuLink href="#docs">Docs</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );

    expect(container.querySelector('[data-slot="navigation-menu-trigger"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="navigation-menu-link"]')).toBeTruthy();
  });

  it('returns trigger utility classes', () => {
    const classes = navigationMenuTriggerStyle();
    expect(classes).toContain('inline-flex');
    expect(classes).toContain('data-[state=open]:bg-accent/50');
  });
});
