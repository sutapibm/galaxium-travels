import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../../App';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { theme } = useTheme();

  return (
    <div className="carbon-shell">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: theme === 'dark' ? '#262626' : '#ffffff',
            color: theme === 'dark' ? '#f4f4f4' : '#161616',
            border: `1px solid ${theme === 'dark' ? '#393939' : '#e0e0e0'}`,
          },
        }}
      />

      <Header />

      <main className="carbon-main">
        <div className="carbon-container">{children}</div>
      </main>

      <Footer />
    </div>
  );
};

// Made with Bob
