import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/shared/Navigation';
import ClientsComponent from './components/ClientsComponent';
import PartenairesComponent from './components/PartenairesComponent';
import ArtistesComponent from './components/ArtistesComponent';
import OeuvresComponent from './components/OeuvresComponent';
import VentesComponent from './components/VentesComponent';
import BudgetComponent from './components/BudgetComponent';
import TableauDeBordComponent from './components/TableauDeBordComponent';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import FloatingChatbot from './components/FloatingChatbot';
import ChatPage from './pages/ChatPage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="app-container">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/tableau-de-bord" element={<TableauDeBordComponent />} />
              <Route path="/clients" element={<ClientsComponent />} />
              <Route path="/partenaires" element={<PartenairesComponent />} />
              <Route path="/artistes" element={<ArtistesComponent />} />
              <Route path="/oeuvres" element={<OeuvresComponent />} />
              <Route path="/ventes" element={<VentesComponent />} />
              <Route path="/budget" element={<BudgetComponent />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/" element={<Navigate to="/tableau-de-bord" />} />
            </Routes>
          </main>
          <FloatingChatbot />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;