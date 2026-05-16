import { InlineLoading, Loading } from '@carbon/react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner = ({ size = 'md', text }: LoadingSpinnerProps) => {
  if (size === 'sm') {
    return (
      <div className="carbon-loading-wrapper">
        <InlineLoading description={text ?? 'Loading'} status="active" />
      </div>
    );
  }

  return (
    <div className="carbon-loading-wrapper carbon-loading-wrapper--block">
      <Loading small={size === 'md'} withOverlay={false} description={text ?? 'Loading'} />
      {text ? <p className="carbon-loading-text">{text}</p> : null}
    </div>
  );
};

// Made with Bob
