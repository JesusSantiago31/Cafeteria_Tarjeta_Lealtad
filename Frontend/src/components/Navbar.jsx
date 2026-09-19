import React from 'react';
import { Coffee, QrCode, ShieldAlert, Users, Search, Lock } from 'lucide-react';

export const Navbar = ({ currentPath, navigateTo }) => {
  return (
    <>
      {/* Header Superior Móvil */}
      <header className="mobile-header">
        <div className="mobile-brand" onClick={() => navigateTo('/')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">
            <Coffee size={22} />
          </div>
          <div>
            <div className="brand-title">Café Lealtad</div>
            <div className="brand-sub">Sistema de Monedero</div>
          </div>
        </div>
      </header>

      {/* Barra de Navegación Inferior con Rutas Fijas */}
      <nav className="bottom-nav">
        <button
          className={`bottom-nav-item ${currentPath === '/' || currentPath === '/pos' ? 'active' : ''}`}
          onClick={() => navigateTo('/')}
        >
          <Search size={22} />
          <span>Caja POS</span>
        </button>

        <button
          className={`bottom-nav-item ${currentPath === '/cliente' || currentPath === '/registro' ? 'active' : ''}`}
          onClick={() => navigateTo('/cliente')}
        >
          <QrCode size={22} />
          <span>Portal Cliente</span>
        </button>

        <button
          className={`bottom-nav-item ${currentPath === '/admin' ? 'active' : ''}`}
          onClick={() => navigateTo('/admin')}
        >
          <Lock size={22} />
          <span>Administración</span>
        </button>
      </nav>
    </>
  );
};
