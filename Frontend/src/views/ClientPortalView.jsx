import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Coffee, QrCode, Wallet, LogIn, UserPlus, ArrowLeft, CheckCircle2, Gift, X, Sparkles, Tag, AlertTriangle } from 'lucide-react';
import { userService, productService } from '../services/api';

export function ClientPortalView() {
  const [view, setView] = useState('register'); // 'register' | 'login' | 'success_qr' | 'loyalty_card'
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registeredClient, setRegisteredClient] = useState(null);

  // Recompensas State
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const [redeemingId, setRedeemingId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const clientPhone = params.get('phone');
    const clientName = params.get('name');
    const clientPoints = params.get('points');
    const clientId = params.get('id');

    if (mode === 'card' && clientPhone) {
      setRegisteredClient({
        id: clientId || null,
        phone: clientPhone,
        phone_number: clientPhone,
        full_name: clientName || 'Cliente',
        puntos: parseInt(clientPoints || '0', 10)
      });
      setView('loyalty_card');
    }
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await productService.getProducts();
      setProducts(data || []);
    } catch (err) {
      console.error("Error al cargar productos:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Wallet Pass State
  const [loadingWallet, setLoadingWallet] = useState(false);

  const handleSaveToWallet = async () => {
    if (!registeredClient) return;
    setLoadingWallet(true);
    try {
      const uId = registeredClient.id || registeredClient.phone || registeredClient.phone_number;
      if (!uId) {
        alert("No se pudo identificar al cliente para generar el pase.");
        return;
      }
      const data = await userService.getGoogleWalletPass(uId);
      if (data && data.save_url) {
        window.open(data.save_url, '_blank', 'noopener,noreferrer');
      } else {
        alert("No se pudo obtener el enlace del pase de Google Wallet.");
      }
    } catch (err) {
      console.error("Error al obtener pase de Google Wallet:", err);
      alert("Error al conectar con Google Wallet. Por favor reintenta.");
    } finally {
      setLoadingWallet(false);
    }
  };

  // Ticket QR de Canje State
  const [redemptionTicket, setRedemptionTicket] = useState(null);
  
  // Historial de Transacciones
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);


  useEffect(() => {
    let intervalId = null;
    if (view === 'loyalty_card' && registeredClient) {
      loadHistoryAndRealtime(false);
      intervalId = setInterval(() => {
        loadHistoryAndRealtime(true);
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [view, registeredClient?.id, registeredClient?.phone]);

  const loadHistoryAndRealtime = async (isSilent = false) => {
    if (!registeredClient) return;
    if (!isSilent) setLoadingHistory(true);
    try {
      const uId = registeredClient.id || registeredClient.phone || registeredClient.phone_number;
      
      // Fetch fresh client profile data to keep points updated in real-time
      let freshUser = null;
      try {
        if (registeredClient.phone || registeredClient.phone_number) {
          freshUser = await userService.getUserByLoyaltyCode(registeredClient.phone || registeredClient.phone_number);
        } else if (registeredClient.id) {
          freshUser = await userService.getUserById(registeredClient.id);
        }
      } catch (err) {
        // Fallback silently if offline or temporary network issue
      }

      if (freshUser) {
        const updatedPoints = freshUser.current_points !== undefined ? freshUser.current_points : registeredClient.puntos;
        setRegisteredClient(prev => prev ? {
          ...prev,
          id: freshUser.id || prev.id,
          puntos: updatedPoints,
          current_points: updatedPoints,
          full_name: `${freshUser.first_name || ''} ${freshUser.last_name || ''}`.trim() || prev.full_name
        } : prev);
      }

      // Fetch transaction & redemption history
      const userKey = freshUser?.id || uId;
      const data = await userService.getUserTransactions(userKey);
      setHistory(data || []);
    } catch (err) {
      console.error("Error al cargar historial y datos en tiempo real:", err);
    } finally {
      if (!isSilent) setLoadingHistory(false);
    }
  };

  const loadHistory = () => loadHistoryAndRealtime(false);


  const handleOpenRewards = () => {
    setRedeemSuccess('');
    setRedeemError('');
    setShowRewardsModal(true);
    loadProducts();
  };

  const handleSelectRedeemProduct = (product) => {
    if (!registeredClient) return;
    const clientPhone = (registeredClient.phone || registeredClient.phone_number || '').replace(/[^0-9]/g, '');
    const qrPayload = `REDEMP:${clientPhone}:${product.id_prod}`;
    
    setRedemptionTicket({
      code: qrPayload,
      product: product,
      clientPhone: clientPhone,
      clientName: registeredClient.full_name
    });
    setShowRewardsModal(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || !username || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }

    const fullNameTrimmed = username.trim();
    const cleanPhone = phone.trim();
    const autoEmail = `${cleanPhone.replace(/[^0-9]/g, '')}@cliente.cafeteria.com`;

    try {
      const newUser = await userService.createUser({
        first_name: fullNameTrimmed,
        last_name: '',
        email: autoEmail,
        phone: cleanPhone,
        loyalty_code: `QR-${cleanPhone}`
      });

      if (newUser) {
        setRegisteredClient({
          ...newUser,
          full_name: `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim() || fullNameTrimmed,
          phone_number: newUser.phone || cleanPhone,
          puntos: newUser.current_points || 0
        });

        setView('success_qr');
      }
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError('Este número de teléfono ya está registrado. Introduce tu contraseña para iniciar sesión.');
        setView('login');
      } else {
        const detail = err.response?.data?.detail;
        if (Array.isArray(detail)) {
          setError(detail.map((item) => item.msg || JSON.stringify(item)).join(', '));
        } else if (typeof detail === 'object' && detail !== null) {
          setError(detail.msg || JSON.stringify(detail));
        } else {
          setError(detail || 'Ocurrió un error al registrarte. Inténtalo de nuevo.');
        }
      }
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('Introduce tu teléfono y contraseña.');
      return;
    }

    try {
      const data = await userService.getUsers({ search: phone });
      const clients = data.items || data;
      if (clients && clients.length > 0) {
        const client = clients[0];
        const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Cliente';
        const clientPhone = client.phone || client.loyalty_code || phone;
        const cardUrl = `${window.location.origin}/cliente?mode=card&id=${client.id}&phone=${encodeURIComponent(clientPhone)}&name=${encodeURIComponent(clientName)}&points=${client.current_points || client.puntos || 0}`;
        window.open(cardUrl, '_blank');
      } else {
        setError('Número de teléfono o contraseña incorrectos.');
      }
    } catch (err) {
      setError('Error al validar las credenciales.');
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      {error && <div className="alert-danger" style={{ background: '#FFE4E6', color: '#E11D48', padding: '12px', borderRadius: '12px', textAlign: 'center', fontWeight: 700, marginBottom: '16px' }}>{error}</div>}

      {/* 1. VISTA DE REGISTRO */}
      {view === 'register' && (
        <div className="card">
          <h2 className="card-title">Regístrate en nuestro Club</h2>
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label>Número de Teléfono</label>
              <input
                type="tel"
                placeholder="Ej. 5512345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Nombre Completo</label>
              <input
                type="text"
                placeholder="Tu Nombre"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
              <UserPlus size={20} />
              Registrarme
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              type="button" 
              onClick={() => { setError(''); setView('login'); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
            >
              ¿Ya tienes una cuenta? Inicia sesión aquí
            </button>
          </div>
        </div>
      )}

      {/* 2. VISTA DE LOGIN */}
      {view === 'login' && (
        <div className="card">
          <h2 className="card-title">Iniciar Sesión</h2>
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Número de Teléfono</label>
              <input
                type="tel"
                placeholder="Ej. 5512345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
              <LogIn size={20} />
              Ingresar a mi Tarjeta
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              type="button" 
              onClick={() => { setError(''); setView('register'); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
            >
              <ArrowLeft size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Volver al Registro
            </button>
          </div>
        </div>
      )}

      {/* 3. VISTA ÉXITO / MOSTRAR QR Y WALLET */}
      {view === 'success_qr' && registeredClient && (
        <div className="card" style={{ textAlign: 'center' }}>
          <CheckCircle2 size={48} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
          <h2 className="card-title" style={{ marginBottom: '6px' }}>¡Registro Exitoso!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Hola <strong>{registeredClient.full_name}</strong>, escanea o guarda tu código QR para acumular puntos en cada visita.
          </p>

          <div style={{ background: 'white', padding: '16px', borderRadius: '14px', display: 'inline-block', border: '2px solid var(--secondary)', margin: '16px 0' }}>
            <QRCodeSVG 
              value={registeredClient.phone_number || phone} 
              size={180}
              level="H"
              includeMargin={true}
            />
            <p style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '8px', color: 'var(--text)' }}>
              {registeredClient.phone_number || phone}
            </p>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              className="btn btn-wallet-google"
              onClick={handleSaveToWallet}
              disabled={loadingWallet}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: '#000000',
                color: '#FFFFFF',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: '1px solid #333333',
                cursor: loadingWallet ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#34A853"/>
                <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V12.5L8.5 7L13.5 12L21 4.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285F4"/>
                <path d="M21 12.5L13.5 20L8.5 15L3 20.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V12.5Z" fill="#EA4335"/>
                <path d="M8.5 7L3 12.5V19.5C3 20.33 3.67 21 4.5 21H12.5L8.5 7Z" fill="#FBBC05"/>
              </svg>
              <span>{loadingWallet ? 'Generando Pase...' : 'Guardar en Google Wallet'}</span>
            </button>

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
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: '1px solid #333333',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.65-.79 1.1-1.9 0.98-3.01-.95.04-2.12.64-2.8 1.44-.6.7-.1.14-1.83 0.98-3.01 1.08-.04 2.22-.68 2.84-1.44z"/>
              </svg>
              <span>Añadir a Apple Wallet</span>
            </button>

            <button 
              className="btn btn-secondary"
              onClick={() => {
                const cardUrl = `${window.location.origin}/cliente?mode=card&id=${registeredClient.id || ''}&phone=${encodeURIComponent(registeredClient.phone_number || phone)}&name=${encodeURIComponent(registeredClient.full_name)}&points=${registeredClient.puntos || 0}`;
                window.open(cardUrl, '_blank');
              }}
            >
              Ver Tarjeta Digital Completa (Pestaña Nueva)
            </button>
          </div>

        </div>
      )}

      {/* 4. VISTA DE TARJETA DE LEALTAD DIGITAL CON QR SIEMPRE VISIBLE */}
      {view === 'loyalty_card' && registeredClient && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* HEADER PRINCIPAL STICKY: CÓDIGO QR SIEMPRE VISIBLE EN LA POSICIÓN SUPERIOR */}
          <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '20px', textAlign: 'center', border: '2px solid var(--secondary)', boxShadow: 'var(--shadow-md)', position: 'sticky', top: '10px', zIndex: 80 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Mi Código de Lealtad
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  {registeredClient.full_name}
                </h2>
              </div>
              <Coffee size={28} color="var(--primary)" />
            </div>

            {/* CÓDIGO QR VISIBLE DESTACADO */}
            <div style={{ background: '#FAFDF7', padding: '16px', borderRadius: '16px', display: 'inline-block', border: '2px solid var(--secondary)' }}>
              <QRCodeSVG 
                value={registeredClient.phone || registeredClient.phone_number} 
                size={160}
                level="H"
                includeMargin={true}
              />
              <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: '0.9rem', marginTop: '6px' }}>
                Tel: {registeredClient.phone || registeredClient.phone_number}
              </div>
            </div>
          </div>

          {/* TARJETA DE PUNTOS Y RECOMPENSAS */}
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #5E7044 100%)', color: 'white', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.9, marginBottom: '4px' }}>
              Puntos Acumulados
            </div>
            
            <div style={{ background: 'var(--secondary)', color: 'var(--text)', fontWeight: 900, fontSize: '2rem', padding: '8px 24px', borderRadius: '14px', display: 'inline-block', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
              {registeredClient.puntos || 0} <span style={{ fontSize: '1rem' }}>PTS</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* BOTÓN RECLAMAR RECOMPENSAS */}
              <button 
                className="btn"
                onClick={handleOpenRewards}
                style={{ background: 'var(--secondary)', color: 'var(--text)', fontSize: '1.05rem', fontWeight: 900, boxShadow: '0 4px 14px rgba(207, 217, 137, 0.4)' }}
              >
                <Gift size={22} color="var(--primary)" />
                Reclamar Recompensas
              </button>

              <button 
                className="btn btn-wallet-google"
                onClick={handleSaveToWallet}
                disabled={loadingWallet}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#000000',
                  color: '#FFFFFF',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  border: '1px solid #333333',
                  cursor: loadingWallet ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#34A853"/>
                  <path d="M19.5 3H4.5C3.67 3 3 3.67 3 4.5V12.5L8.5 7L13.5 12L21 4.5V4.5C21 3.67 20.33 3 19.5 3Z" fill="#4285F4"/>
                  <path d="M21 12.5L13.5 20L8.5 15L3 20.5V19.5C3 20.33 3.67 21 4.5 21H19.5C20.33 21 21 20.33 21 19.5V12.5Z" fill="#EA4335"/>
                  <path d="M8.5 7L3 12.5V19.5C3 20.33 3.67 21 4.5 21H12.5L8.5 7Z" fill="#FBBC05"/>
                </svg>
                <span>{loadingWallet ? 'Generando Pase...' : 'Guardar en Google Wallet'}</span>
              </button>

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
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  border: '1px solid #333333',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.65-.79 1.1-1.9 0.98-3.01-.95.04-2.12.64-2.8 1.44-.6.7-.1.14-1.83 0.98-3.01 1.08-.04 2.22-.68 2.84-1.44z"/>
                </svg>
                <span>Añadir a Apple Wallet</span>
              </button>


            </div>
          </div>
        </div>
      )}

      {/* MODAL / MENÚ DE CATÁLOGO DE RECOMPENSAS */}
      {showRewardsModal && (
        <div className="modal-overlay" onClick={() => setShowRewardsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', maxHeight: '85vh', overflowY: 'auto' }}>
            
            {/* MODAL HEADER */}
            <div style={{ background: 'var(--primary)', color: 'white', padding: '16px 20px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', sticky: 'top' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Gift size={24} color="var(--secondary)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'white' }}>Reclamar Recompensas</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--secondary)' }}>
                    Tienes <strong>{registeredClient?.puntos || 0} PTS</strong> disponibles
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowRewardsModal(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div style={{ padding: '16px' }}>
              {redeemSuccess && (
                <div style={{ background: '#D4EDDA', color: '#155724', padding: '12px', borderRadius: '12px', marginBottom: '14px', fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} />
                  <span>{redeemSuccess}</span>
                </div>
              )}

              {redeemError && (
                <div style={{ background: '#FFE4E6', color: '#9F1239', padding: '12px', borderRadius: '12px', marginBottom: '14px', fontSize: '0.85rem', fontWeight: 700 }}>
                  {redeemError}
                </div>
              )}

              {loadingProducts ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Cargando productos del menú...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {products.map((product) => {
                    const pointsNeeded = product.puntos_requeridos;
                    const userPoints = registeredClient?.puntos || 0;
                    const hasEnoughPoints = userPoints >= pointsNeeded;
                    const stock = product.piezas_disponibles;
                    const isAvailable = stock > 0 && hasEnoughPoints;

                    return (
                      <div 
                        key={product.id_prod} 
                        style={{
                          display: 'flex',
                          gap: '12px',
                          background: '#FAFDF7',
                          border: '2px solid var(--secondary)',
                          borderRadius: '16px',
                          padding: '12px',
                          alignItems: 'center',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        {/* IMAGEN DEL PRODUCTO */}
                        <div style={{ width: '80px', height: '80px', minWidth: '80px', borderRadius: '12px', overflow: 'hidden', background: '#FFF', border: '1px solid var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img 
                            src={product.imagen_url || '/products/cappuccino.png'} 
                            alt={product.producto}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/products/cappuccino.png';
                            }}
                          />
                        </div>

                        {/* DETALLES DEL PRODUCTO */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text)' }}>
                            {product.producto}
                          </h4>

                          {/* PRECIO ORIGINAL TACHADO (AHORRO DEL CLIENTE) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <span style={{ textDecoration: 'line-through', color: '#9E7D5E', fontWeight: 600 }}>
                              ${Number(product.precio).toFixed(2)}
                            </span>
                            <span style={{ background: '#D4EDDA', color: '#155724', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800 }}>
                              ¡GRATIS!
                            </span>
                          </div>

                          {/* PUNTOS REQUERIDOS */}
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)' }}>
                            {pointsNeeded} PTS necesarios
                          </div>

                          {/* ⚠️ PIEZAS RESTANTES: SOLO MOSTRAR SI QUEDAN 5 PIEZAS O MENOS */}
                          {stock <= 5 && stock > 0 && (
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#E11D48', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={13} />
                              <span>¡Solo quedan {stock} piezas restantes!</span>
                            </div>
                          )}

                          {stock === 0 && (
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#E11D48' }}>
                              Agotado temporalmente
                            </div>
                          )}
                        </div>

                        {/* BOTÓN CANJEAR */}
                        <div>
                          <button
                            onClick={() => handleSelectRedeemProduct(product)}
                            disabled={!isAvailable}
                            className="btn"
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              borderRadius: '10px',
                              background: isAvailable ? 'var(--primary)' : '#E2E8F0',
                              color: isAvailable ? '#FFFFFF' : '#94A3B8',
                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                              border: 'none',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {isAvailable ? 'Canjear' : !hasEnoughPoints ? `Faltan ${pointsNeeded - userPoints} pts` : 'Agotado'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TICKET QR DE CANJE GENERADO PARA EL CAJERO */}
      {redemptionTicket && (
        <div className="modal-overlay" onClick={() => setRedemptionTicket(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '16px', borderRadius: '18px 18px 0 0', position: 'relative' }}>
              <Sparkles size={32} color="var(--secondary)" style={{ margin: '0 auto 6px' }} />
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>Ticket de Canje Generado</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--secondary)', margin: '4px 0 0' }}>
                Muestra este código al cajero en el establecimiento
              </p>
              <button 
                onClick={() => setRedemptionTicket(null)}
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ background: '#FAFDF7', border: '2px solid var(--secondary)', borderRadius: '16px', padding: '16px', display: 'inline-block', marginBottom: '16px' }}>
                <QRCodeSVG 
                  value={redemptionTicket.code} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '8px' }}>
                  CÓDIGO DE TICKET TIPO REDEMP
                </div>
              </div>

              <div style={{ background: '#EBF0C8', borderRadius: '14px', padding: '12px', textAlign: 'left', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Detalles del Producto a Entregar:
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                  {redemptionTicket.product.producto}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                  Costo: {redemptionTicket.product.puntos_requeridos} PTS (Precio original: <span style={{ textDecoration: 'line-through' }}>${Number(redemptionTicket.product.precio).toFixed(2)}</span>)
                </div>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '16px' }}>
                📌 <strong>Nota:</strong> Los puntos <u>aún no han sido descontados</u>. El cajero escaneará este código en la caja para entregarte tu pedido y autorizar el descuento de tus puntos.
              </p>

              <button 
                className="btn btn-primary"
                onClick={() => setRedemptionTicket(null)}
              >
                Entendido / Cerrar Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN DE HISTORIAL DE RECOMPENSAS Y MOVIMIENTOS */}
      {view === 'loyalty_card' && registeredClient && (
        <div style={{ marginTop: '20px', background: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1.5px solid var(--secondary)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={20} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>Historial de Recompensas y Puntos</h3>
            </div>
            
          </div>


          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Cargando historial de canjes...
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Aún no tienes historial de canjes registrados.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((tx) => {
                const isRedemption = tx.transaction_type === 'REDEMPTION' || (tx.points_transacted && tx.points_transacted < 0);
                const dateStr = tx.created_at ? new Date(tx.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente';

                return (
                  <div 
                    key={tx.id || Math.random()} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 14px', 
                      background: '#FAFDF7', 
                      borderRadius: '12px', 
                      border: '1px solid var(--secondary)' 
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)' }}>
                        {tx.description || (isRedemption ? 'Canje de Recompensa' : 'Acumulación de Puntos')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {dateStr}
                      </div>
                    </div>
                    <div style={{
                      fontWeight: 900,
                      fontSize: '0.95rem',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: isRedemption ? '#FFE4E6' : '#D4EDDA',
                      color: isRedemption ? '#E11D48' : '#155724'
                    }}>
                      {tx.points_transacted > 0 ? `+${tx.points_transacted}` : tx.points_transacted} PTS
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

