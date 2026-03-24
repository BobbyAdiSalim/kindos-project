import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockAnalytics,
  mockAppointments,
  mockDoctors,
  mockMessages,
  mockPendingDoctors,
  mockReviews,
} from '@/app/lib/mock-data';

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock('react-dom/client', () => ({
  createRoot: createRootMock,
}));

vi.mock('@/app/App', () => ({
  App: () => null,
  default: () => null,
}));

describe('mock data module', () => {
  it('exports non-empty fixture collections', () => {
    expect(mockDoctors.length).toBeGreaterThan(0);
    expect(mockAppointments.length).toBeGreaterThan(0);
    expect(mockReviews.length).toBeGreaterThan(0);
    expect(mockMessages.length).toBeGreaterThan(0);
    expect(mockPendingDoctors.length).toBeGreaterThan(0);
    expect(mockAnalytics.totalBookings).toBeGreaterThan(0);
  });
});

describe('main entrypoint bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    createRootMock.mockClear();
    renderMock.mockClear();
  });

  it('creates root and renders app', async () => {
    await import('@/main');

    expect(createRootMock).toHaveBeenCalledTimes(1);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
