import React from 'react';
import { render, screen } from '@testing-library/react';
import Ball from './Ball';

// Mock motion/react
/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  useAnimation: () => ({
    start: jest.fn().mockResolvedValue(undefined),
  }),
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

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
