import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Header as CarbonHeader,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderMenuButton,
  SideNav,
  SideNavItems,
  SideNavLink,
} from '@carbon/react';
import { User, LogOut, Moon, Sun } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { useTheme } from '../../App';
import { Button } from '../common';
import { UserIdentification } from '../user/UserIdentification';

export const Header = () => {
  const location = useLocation();
  const { user, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [showUserModal, setShowUserModal] = useState(false);
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <CarbonHeader aria-label="Galaxium Travels">
        <HeaderMenuButton
          aria-label={isSideNavExpanded ? 'Close navigation menu' : 'Open navigation menu'}
          isActive={isSideNavExpanded}
          onClick={() => setIsSideNavExpanded((currentValue) => !currentValue)}
        />
        <HeaderName as={Link} to="/" prefix="IBM">
          Galaxium Travels
        </HeaderName>

        <HeaderNavigation aria-label="Primary navigation" className="max-[1055px]:hidden">
          <HeaderMenuItem as={Link} to="/" isActive={isActive('/')}>
            Home
          </HeaderMenuItem>
          <HeaderMenuItem as={Link} to="/flights" isActive={isActive('/flights')}>
            Flights
          </HeaderMenuItem>
          {user ? (
            <HeaderMenuItem as={Link} to="/bookings" isActive={isActive('/bookings')}>
              My Bookings
            </HeaderMenuItem>
          ) : null}
        </HeaderNavigation>

        <SideNav
          aria-label="Mobile navigation"
          expanded={isSideNavExpanded}
          isPersistent={false}
          onOverlayClick={() => setIsSideNavExpanded(false)}
          onSideNavBlur={() => setIsSideNavExpanded(false)}
        >
          <SideNavItems>
            <SideNavLink as={Link} to="/" isActive={isActive('/')} onClick={() => setIsSideNavExpanded(false)}>
              Home
            </SideNavLink>
            <SideNavLink as={Link} to="/flights" isActive={isActive('/flights')} onClick={() => setIsSideNavExpanded(false)}>
              Flights
            </SideNavLink>
            {user ? (
              <SideNavLink
                as={Link}
                to="/bookings"
                isActive={isActive('/bookings')}
                onClick={() => setIsSideNavExpanded(false)}
              >
                My Bookings
              </SideNavLink>
            ) : null}
          </SideNavItems>
        </SideNav>

        <HeaderGlobalBar>
          <div className="flex items-center gap-3 pr-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleTheme}
              className="min-w-0 px-0"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </Button>

            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2 text-sm carbon-muted">
                  <User size={16} />
                  <span>{user.name}</span>
                </div>
                <Button variant="secondary" size="sm" onClick={logout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </Button>
              </>
            ) : location.pathname === '/' ? (
              <Link to="/flights">
                <Button size="sm">Book a Flight</Button>
              </Link>
            ) : (
              <Button size="sm" onClick={() => setShowUserModal(true)}>
                Login
              </Button>
            )}
          </div>
        </HeaderGlobalBar>
      </CarbonHeader>

      <UserIdentification
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSuccess={() => {
          setShowUserModal(false);
        }}
      />
    </>
  );
};

// Made with Bob
