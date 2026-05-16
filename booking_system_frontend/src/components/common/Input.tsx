import type { ChangeEventHandler } from 'react';
import { TextInput } from '@carbon/react';
import clsx from 'clsx';

interface InputProps {
  label?: string;
  error?: string;
  className?: string;
  id?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  autoComplete?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

export const Input = ({ label, error, className, id, ...props }: InputProps) => {
  return (
    <TextInput
      id={id ?? props.name ?? label ?? 'input-field'}
      labelText={label ?? ''}
      invalid={Boolean(error)}
      invalidText={error}
      className={clsx('carbon-text-input', className)}
      {...props}
    />
  );
};

// Made with Bob
