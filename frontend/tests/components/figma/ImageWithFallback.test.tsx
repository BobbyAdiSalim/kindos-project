import { fireEvent, render, screen } from '@testing-library/react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

describe('ImageWithFallback', () => {
  it('renders the original image initially', () => {
    render(<ImageWithFallback src="https://example.com/pic.png" alt="Example" />);
    expect(screen.getByAltText('Example')).toBeInTheDocument();
  });

  it('switches to fallback image when original fails', () => {
    render(<ImageWithFallback src="https://example.com/pic.png" alt="Example" />);

    fireEvent.error(screen.getByAltText('Example'));

    const fallback = screen.getByAltText('Error loading image');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveAttribute('data-original-url', 'https://example.com/pic.png');
  });
});
