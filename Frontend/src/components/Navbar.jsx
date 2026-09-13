import React from 'react';
import { Coffee, Users, QrCode, ShieldCheck } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab }) => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a href="#" className="brand-logo">
          <Coffee size={28} color="#D4A373" />
          <span>CAFETERÍA GOURMET</span>
          <span className="brand-badge">LEALTAD & POS</span>
        </a>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Users size={18} />
            <span>Administración Clientes</span>
          </button>

          <button
            className={`nav-tab ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <QrCode size={18} />
            <span>Escanear QR en Caja (POS)</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
