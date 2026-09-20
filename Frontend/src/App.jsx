import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AdminView } from './views/AdminView';
import { PosView } from './views/PosView';
import { ClientPortalView } from './views/ClientPortalView';
import { Lock, KeyRound, AlertCircle, X, ShieldAlert, ShieldCheck } from 'lucide-react';

export function App() {
  // Manejo de rutas basadas en URL pathname o hash (Ej: /, /admin, /cliente)
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const ADMIN_PIN = "1234";

  // Escuchar cambios de URL en el navegador (atrás/adelante)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    if (path.startsWith('/admin') && !isAdminUnlocked) {
      setPinInput('');
      setPinError('');
      setShowPinModal(true);
      return;
    }
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleVerifyPin = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAdminUnlocked(true);
      setShowPinModal(false);
      const targetPath = currentPath.startsWith('/admin') ? currentPath : '/admin';
      window.history.pushState({}, '', targetPath);
      setCurrentPath(targetPath);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('NIP de seguridad incorrecto. Intenta de nuevo.');
      setPinInput('');
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  // Renderizar la vista correspondiente a la ruta URL actual
  const renderView = () => {
    if (currentPath.startsWith('/admin')) {
      if (!isAdminUnlocked) {
        return (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', margin: '40px auto', maxWidth: '400px' }}>
            <Lock size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
            <h2 className="card-title">Acceso Restringido a Administración</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Se requiere autenticación mediante NIP de seguridad para acceder a la gestión de clientes.
            </p>
            <button className="btn btn-primary" onClick={() => setShowPinModal(true)}>
              <KeyRound size={18} />
              Ingresar NIP de Seguridad
            </button>
          </div>
        );
      }
      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#CFD989', padding: '8px 14px', borderRadius: '10px', color: '#734F2F' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} /> Sesión de Administración Segura
            </span>
            <button 
              onClick={handleLockAdmin}
              style={{ background: '#734F2F', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Cerrar Sesión Admin
            </button>
          </div>
          <AdminView />
        </div>
      );
    }

    if (currentPath === '/cliente' || currentPath === '/registro') {
      return <ClientPortalView />;
    }

    // Ruta por defecto ( / o /pos )
    return <PosView />;
  };

  return (
    <div className="app-container">
      <Navbar currentPath={currentPath} navigateTo={navigateTo} />

      <main className="main-content">
        {renderView()}
      </main>

      {/* Modal de Verificación NIP de Seguridad para Ruta /admin */}
      {showPinModal && (
        <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ background: '#788C5A', color: '#FFF', padding: '1.25rem', borderRadius: '16px 16px 0 0', position: 'relative' }}>
              <div style={{ width: '48px', height: '48px', background: '#CFD989', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: '#734F2F' }}>
                <Lock size={26} />
              </div>
              <h3 style={{ color: '#FFF', margin: 0, fontSize: '1.2rem' }}>Protección de Ruta Admin</h3>
              <p style={{ fontSize: '0.78rem', color: '#EBF0C8', marginTop: '4px' }}>
                Ingresa el NIP de Administrador para desbloquear la ruta /admin.
              </p>
              <button 
                onClick={() => setShowPinModal(false)}
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleVerifyPin} style={{ padding: '1.25rem' }}>
              {pinError && (
                <div style={{ background: '#FFE4E6', color: '#9F1239', padding: '8px 12px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>NIP de Seguridad</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="****"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '4px', padding: '10px' }}
                  autoFocus
                />
                <span style={{ fontSize: '0.72rem', color: '#9E7D5E', marginTop: '4px', display: 'block' }}>
                  NIP por defecto: <b>1234</b>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPinModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <KeyRound size={16} />
                  <span>Desbloquear</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
