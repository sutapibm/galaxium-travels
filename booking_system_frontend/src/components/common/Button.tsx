import type { ReactNode } from 'react';
import { Button as CarbonButton, InlineLoading } from '@carbon/react';
import clsx from 'clsx';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  type = 'button',
  onClick,
}: ButtonProps) => {
  const carbonKind = {
    primary: 'primary',
    secondary: 'secondary',
    danger: 'danger',
  } as const;

  const sizeClass = {
    sm: 'carbon-button--sm',
    md: 'carbon-button--md',
    lg: 'carbon-button--lg',
  };

  return (
    <CarbonButton
      kind={carbonKind[variant]}
      className={clsx(sizeClass[size], className)}
      disabled={disabled || isLoading}
      type={type}
      onClick={onClick}
    >
      {isLoading ? <InlineLoading description="Loading" status="active" /> : children}
    </CarbonButton>
  );
};

// Made with Bob
