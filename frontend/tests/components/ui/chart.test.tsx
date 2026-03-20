import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  ChartContainer,
  ChartLegendContent,
  ChartStyle,
  ChartTooltipContent,
} from '@/app/components/ui/chart';

const TestIcon = () => <svg data-testid="test-icon" />;

describe('chart ui primitives', () => {
  it('renders style variables when chart config has colors', () => {
    render(
      <ChartStyle
        id="chart-test"
        config={{
          sales: { color: '#ff0000', label: 'Sales' },
          visits: { theme: { light: '#00ff00', dark: '#0000ff' }, label: 'Visits' },
        }}
      />
    );

    const styleTag = document.querySelector('style');
    expect(styleTag?.textContent).toContain('--color-sales: #ff0000;');
    expect(styleTag?.textContent).toContain('--color-visits: #00ff00;');
    expect(styleTag?.textContent).toContain('--color-visits: #0000ff;');
  });

  it('returns no style output when config has no colors', () => {
    const { container } = render(
      <ChartStyle
        id="chart-empty"
        config={{
          bare: { label: 'Bare' },
        }}
      />
    );

    expect(container.querySelector('style')).toBeNull();
  });

  it('throws if tooltip content is rendered outside chart container', () => {
    expect(() => {
      render(<ChartTooltipContent active payload={[]} />);
    }).toThrow('useChart must be used within a <ChartContainer />');
  });

  it('renders tooltip labels and values inside chart container', () => {
    render(
      <ChartContainer
        config={{
          sales: { label: 'Sales', color: '#f00' },
        }}
      >
        <ChartTooltipContent
          active
          label="sales"
          payload={[
            {
              name: 'sales',
              value: 1234,
              dataKey: 'sales',
              color: '#f00',
              payload: { sales: 'sales', fill: '#f00' },
            } as any,
          ]}
        />
      </ChartContainer>
    );

    expect(screen.getAllByText('Sales').length).toBeGreaterThan(0);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders legend content with icon and fallback color swatch', () => {
    const { container, rerender } = render(
      <ChartContainer
        config={{
          sales: { label: 'Sales', icon: TestIcon },
          visits: { label: 'Visits', color: '#0f0' },
        }}
      >
        <ChartLegendContent
          payload={[
            { value: 'sales', dataKey: 'sales', color: '#f00' },
            { value: 'visits', dataKey: 'visits', color: '#0f0' },
          ] as any}
          verticalAlign="top"
        />
      </ChartContainer>
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Visits')).toBeInTheDocument();
    expect(container.querySelector('.pb-3')).toBeInTheDocument();

    rerender(
      <ChartContainer
        config={{
          sales: { label: 'Sales', icon: TestIcon },
        }}
      >
        <ChartLegendContent
          hideIcon
          payload={[{ value: 'sales', dataKey: 'sales', color: '#f00' }] as any}
          verticalAlign="bottom"
        />
      </ChartContainer>
    );

    expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
  });
});
