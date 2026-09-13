import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Award, ExternalLink, Download, CheckCircle, RefreshCw, QrCode } from 'lucide-react';
import { userService } from '../services/api';

export const CustomerModal = ({ user, onClose }) => {
  const [walletPass, setWalletPass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchWalletPass(user.id);
    }
  }, [user]);

  const fetchWalletPass = async (userId) => {
    setLoading(true);
    setError('');
    try {
      const data = await userService.getGoogleWalletPass(userId);
      setWalletPass(data);
    } catch (err) {
      console.error("Error fetching Google Wallet Pass:", err);
      setError("No se pudo obtener el pase digital.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const fullName = `${user.first_name} ${user.last_name}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tarjetas de Lealtad & Pase Digital</h3>
          <button onClick={onClose} style={{ color: '#FFF' }}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          {/* Digital Card Preview Shell */}
          <div className="digital-pass-card">
            <div className="pass-header">
              <span className="pass-brand">CAFETERÍA GOURMET</span>
              <span style={{ fontSize: '0.8rem', color: '#D4A373', fontWeight: 600 }}>PASE DE LEALTAD</span>
            </div>

            <div className="pass-customer-name">{fullName}</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
              {user.email}
            </div>

            <div className="pass-points-display">
              <div>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)', display: 'block' }}>
                  SALDO DE PUNTOS
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#E5A93C' }}>
                  {user.current_points} Pts
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)', display: 'block' }}>
                  CÓDIGO QR
                </span>
                <span className="badge-code" style={{ background: '#1E120B', color: '#D4A373', borderColor: '#4A2B1D' }}>
                  {user.loyalty_code}
                </span>
              </div>
            </div>

            {/* Live Scannable QR Code Render */}
            <div className="qr-box-container">
              <span style={{ fontSize: '0.8rem', color: '#2C1810', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <QrCode size={16} /> CÓDIGO QR PARA ESCANEAR EN CAJA
              </span>

              <div style={{ padding: '0.5rem', background: '#FFF', borderRadius: '8px' }}>
                <QRCodeSVG
                  value={user.loyalty_code}
                  size={165}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=100&q=80",
                    x: undefined,
                    y: undefined,
                    height: 28,
                    width: 28,
                    excavate: true,
                  }}
                />
              </div>

              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#4A2B1D', letterSpacing: '1px' }}>
                {user.loyalty_code}
              </div>
            </div>
          </div>

          {/* Save to Google Wallet Action Button */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#786C65' }}>
              <RefreshCw size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Generando Pase de Google Wallet...</p>
            </div>
          ) : walletPass?.save_url ? (
            <div>
              <a
                href={walletPass.save_url}
                target="_blank"
                rel="noopener noreferrer"
                className="google-wallet-btn"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#34A853"/>
                  <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V12.5L8.5 7L13.5 12L21 4.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285F4"/>
                  <path d="M21 12.5L13.5 20L8.5 15L3 20.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V12.5Z" fill="#EA4335"/>
                  <path d="M8.5 7L3 12.5V19.5C3 20.33 3.67 21 4.5 21H12.5L8.5 7Z" fill="#FBBC05"/>
                </svg>
                <span>Añadir a Google Wallet</span>
                <ExternalLink size={16} />
              </a>

              {walletPass.is_mock && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#854D0E', background: '#FEF08A', padding: '0.5rem 0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                  ⚡ Modo demostración activo: Enlace generado y listo para sincronizar con tu Google Pay Issuer ID.
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => fetchWalletPass(user.id)}>
              Reintentar Generación de Pase
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
