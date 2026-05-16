import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { UserProvider } from './hooks/useUser';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Flights } from './pages/Flights';
import { MyBookings } from './pages/MyBookings';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/** Access the app theme and toggle action. */
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};

/** Provide persisted light/dark theme state for the app shell. */
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem('galaxium-theme');
    return storedTheme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('galaxium-theme', theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light')),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/flights" element={<Flights />} />
              <Route path="/bookings" element={<MyBookings />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Layout>
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

// Made with Bob
