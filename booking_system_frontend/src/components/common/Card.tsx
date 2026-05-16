import type { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card = ({ children, className, hover = false, onClick }: CardProps) => {
  const sharedClassName = clsx(
    'carbon-card',
    hover && 'carbon-card--interactive',
    onClick && 'w-full text-left',
    className
  );

  if (onClick) {
    return (
      <button className={sharedClassName} onClick={onClick} type="button">
        {children}
      </button>
    );
  }

  return <div className={sharedClassName}>{children}</div>;
};

// Made with Bob
