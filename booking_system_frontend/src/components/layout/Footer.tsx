import { Github } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="carbon-footer">
      <div className="carbon-footer__content">
        <div className="carbon-footer__meta">
          <span>© {currentYear} Galaxium Travels</span>
          <span>IBM Carbon-styled booking experience</span>
        </div>

        <div className="carbon-footer__links">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <Github size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
};

// Made with Bob
