import type { ReactNode } from 'react';
import { ComposedModal, ModalBody, ModalHeader } from '@carbon/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  const modalSize = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
  } as const;

  return (
    <ComposedModal
      open={isOpen}
      onClose={onClose}
      size={modalSize[size]}
      className="carbon-modal"
    >
      {title ? <ModalHeader title={title} closeModal={onClose} /> : null}
      <ModalBody hasScrollingContent={false}>{children}</ModalBody>
    </ComposedModal>
  );
};

// Made with Bob
