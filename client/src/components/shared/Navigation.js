import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const Navigation = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <nav className="sidebar">
      <div className="logo">
        <h1>Galerie d'Art</h1>
      </div>
      <ul className="nav-links">
        <li>
          <Link to="/tableau-de-bord" className="nav-link">
            <i className="fas fa-chart-line"></i>
            <span>Tableau de Bord</span>
          </Link>
        </li>
        <li>
          <Link to="/oeuvres" className="nav-link">
            <i className="fas fa-palette"></i>
            <span>Œuvres</span>
          </Link>
        </li>
        <li>
          <Link to="/artistes" className="nav-link">
            <i className="fas fa-user-circle"></i>
            <span>Artistes</span>
          </Link>
        </li>
        <li>
          <Link to="/clients" className="nav-link">
            <i className="fas fa-users"></i>
            <span>Clients</span>
          </Link>
        </li>
        <li>
          <Link to="/ventes" className="nav-link">
            <i className="fas fa-shopping-cart"></i>
            <span>Ventes</span>
          </Link>
        </li>
        <li>
          <Link to="/partenaires" className="nav-link">
            <i className="fas fa-handshake"></i>
            <span>Partenaires</span>
          </Link>
        </li>
        <li>
          <Link to="/budget" className="nav-link">
            <i className="fas fa-coins"></i>
            <span>Budget</span>
          </Link>
        </li>
        <li>
          <Link 
            to="/chat" 
            className={`nav-link ${location.pathname === '/chat' ? 'active' : ''}`}
          >
            <i className="fas fa-robot"></i>
            <span>AI Assistant</span>
          </Link>
        </li>
        <li>
          <button 
            onClick={toggleTheme}
            className="nav-link"
            style={{ 
              width: '100%',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '15px 20px',
            }}
          >
            <i className={`fas ${theme.isDarkMode ? 'fa-sun' : 'fa-moon'}`} style={{ width: '20px', marginRight: '10px' }}></i>
            <span>{theme.isDarkMode ? 'Mode Clair' : 'Mode Sombre'}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation; 