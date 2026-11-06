import React from 'react';
import { act, render, screen } from '@testing-library/react';
import Ball from './Ball';

const mockStart = jest.fn().mockResolvedValue(undefined);
const mockControls = { start: mockStart };
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, animate, initial, transition, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  useAnimation: () => mockControls,
}));
afterEach(() => { jest.useRealTimers(); mockStart.mockClear(); });

describe('Ball', () => {
  it('should render with the correct number', () => {
    render(<Ball number={42} />);
    
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should apply small class when small prop is true', () => {
    const { container } = render(<Ball number={10} small={true} />);
    
    expect(container.querySelector('.small')).toBeInTheDocument();
  });

  it('should not apply small class when small prop is false', () => {
    const { container } = render(<Ball number={10} small={false} />);
    
    expect(container.querySelector('.small')).not.toBeInTheDocument();
  });

  it('should apply drawn class when drawn prop is true', () => {
    const { container } = render(<Ball number={5} drawn={true} />);
    
    expect(container.querySelector('.drawn')).toBeInTheDocument();
  });

  it('should not apply drawn class when drawn prop is false', () => {
    const { container } = render(<Ball number={5} drawn={false} />);
    
    expect(container.querySelector('.drawn')).not.toBeInTheDocument();
  });

  it('should render with default props', () => {
    const { container } = render(<Ball number={33} />);
    
    expect(screen.getByText('33')).toBeInTheDocument();
    expect(container.querySelector('.small')).not.toBeInTheDocument();
    expect(container.querySelector('.drawn')).not.toBeInTheDocument();
  });

  it('should render numbers from 1-89', () => {
    const numbers = [1, 45, 89];
    
    numbers.forEach((num) => {
      const { rerender } = render(<Ball number={num} />);
      expect(screen.getByText(num.toString())).toBeInTheDocument();
      rerender(<div />);
    });
  });

  // Animation tests
  describe('Animation', () => {
    it('should render with animate prop set to true', () => {
      render(<Ball number={25} animate={true} />);
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should render with animate prop set to false', () => {
      render(<Ball number={25} animate={false} />);
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should render with all props combined', () => {
      const { container } = render(<Ball number={50} small={true} drawn={true} animate={true} />);
      
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(container.querySelector('.small')).toBeInTheDocument();
      expect(container.querySelector('.drawn')).toBeInTheDocument();
    });

    it('should render small drawn ball without animation', () => {
      const { container } = render(<Ball number={15} small={true} drawn={true} animate={false} />);
      
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(container.querySelector('.small')).toBeInTheDocument();
      expect(container.querySelector('.drawn')).toBeInTheDocument();
    });
  });
});

it('zooms in, holds for 1500ms and returns to its normal size', async () => {
  jest.useFakeTimers();
  const { rerender } = render(<Ball number={42} animate />);
  await act(async () => {});
  expect(mockStart).toHaveBeenCalledTimes(1);
  expect(mockStart).toHaveBeenNthCalledWith(1, expect.objectContaining({ scale: 6, zIndex: 9999 }));
  // A caller clears the trigger while the current animation finishes.
  rerender(<Ball number={42} animate={false} />);
  await act(async () => { jest.advanceTimersByTime(1499); });
  expect(mockStart).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(mockStart).toHaveBeenNthCalledWith(2, expect.objectContaining({ scale: 1, zIndex: 1 }));
  expect(screen.getByRole('img', { name: 'Ball number 42, not drawn' })).toBeInTheDocument();
});
