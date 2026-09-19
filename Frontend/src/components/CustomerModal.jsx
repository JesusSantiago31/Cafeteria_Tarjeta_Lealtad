import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, ExternalLink, RefreshCw, QrCode, Phone, Award } from 'lucide-react';
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

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Cliente';
  const displayPhone = user.phone || 'Sin número';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: 0, overflow: 'hidden' }}>
        
        {/* Encabezado del Modal */}
        <div className="modal-header" style={{ background: '#788C5A', color: '#FFFFFF', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#FFFFFF', fontWeight: 800 }}>Pase Digital & Código QR</h3>
          <button onClick={onClose} style={{ color: '#FFFFFF', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          
          {/* Tarjeta Visual de Pase de Lealtad */}
          <div style={{
            background: 'linear-gradient(135deg, #788C5A 0%, #5E7044 100%)',
            color: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 8px 20px rgba(120, 140, 90, 0.25)',
            border: '1.5px solid #CFD989',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#EBF0C8', marginBottom: '6px' }}>
              TARJETA DIGITAL DE LEALTAD
            </div>

            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
              {fullName}
            </div>

            <div style={{ fontSize: '0.85rem', color: '#EBF0C8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.15)', padding: '3px 10px', borderRadius: '12px', marginBottom: '14px' }}>
              <Phone size={13} /> {displayPhone}
            </div>

            {/* Saldo de Puntos */}
            <div style={{ background: '#FAFDF7', color: '#734F2F', borderRadius: '12px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', border: '1px solid #CFD989' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8 }}>SALDO DE PUNTOS</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#788C5A' }}>
                {user.current_points || 0} <span style={{ fontSize: '0.9rem' }}>pts</span>
              </span>
            </div>

            {/* Código QR Centrado */}
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '14px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <QRCodeSVG
                value={user.phone || user.loyalty_code || 'CLIENTE'}
                size={160}
                level="H"
                includeMargin={true}
              />
              <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 800, color: '#734F2F' }}>
                {displayPhone}
              </div>
            </div>
          </div>

          {/* Botones de Wallet */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '12px', color: '#734F2F' }}>
              <RefreshCw size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Generando Pases de Wallet...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {walletPass?.save_url ? (
                <a
                  href={walletPass.save_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-wallet-google"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#000', color: '#FFF', padding: '10px 16px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#34A853"/>
                    <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V12.5L8.5 7L13.5 12L21 4.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285F4"/>
                    <path d="M21 12.5L13.5 20L8.5 15L3 20.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V12.5Z" fill="#EA4335"/>
                    <path d="M8.5 7L3 12.5V19.5C3 20.33 3.67 21 4.5 21H12.5L8.5 7Z" fill="#FBBC05"/>
                  </svg>
                  <span>Guardar en Google Wallet</span>
                  <ExternalLink size={15} />
                </a>
              ) : (
                <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => fetchWalletPass(user.id)}>
                  Reintentar Pase Google Wallet
                </button>
              )}

              <button 
                className="btn btn-wallet-apple"
                onClick={() => alert('Próximamente: La integración nativa con Apple Wallet (.pkpass) se activará cuando se configure el Certificado de Desarrollador de Apple.')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#000000',
                  color: '#FFFFFF',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: '1px solid #333333',
                  cursor: 'pointer'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.65-.79 1.1-1.9 0.98-3.01-.95.04-2.12.64-2.8 1.44-.6.7-.1.14-1.83 0.98-3.01 1.08-.04 2.22-.68 2.84-1.44z"/>
                </svg>
                <span>Añadir a Apple Wallet</span>
              </button>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};
