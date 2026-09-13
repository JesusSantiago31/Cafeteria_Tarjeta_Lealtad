import React, { useState } from 'react';
import { QrCode, Search, Award, CheckCircle, AlertCircle, ShoppingBag, Coffee, ArrowRight, UserCheck } from 'lucide-react';
import { userService } from '../services/api';
import { CustomerModal } from '../components/CustomerModal';

export const PosView = () => {
  const [scanCode, setScanCode] = useState('');
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanCode.trim()) return;

    setLoading(true);
    setError('');
    setCustomer(null);

    try {
      const data = await userService.getUserByLoyaltyCode(scanCode.trim());
      setCustomer(data);
    } catch (err) {
      console.error("Error scanning loyalty QR:", err);
      setError(`No se encontró ningún cliente registrado con el código "${scanCode}".`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #2C1810 0%, #1E120B 100%)', color: '#FFF', textAlign: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ background: 'rgba(212, 163, 115, 0.15)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <QrCode size={34} color="#D4A373" />
        </div>
        <h2 style={{ color: '#FFF', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Escáner de Tarjetas de Lealtad en Caja (POS)
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.95rem', maxWidth: '550px', margin: '0 auto' }}>
          Escanea el código QR desde el pase digital de Google Wallet o el teléfono del cliente para consultar su saldo de puntos instantáneamente.
        </p>

        {/* QR Code Input / Scanner Box */}
        <form onSubmit={handleScan} style={{ maxWidth: '500px', margin: '1.75rem auto 0', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            required
            placeholder="Escribe o escanea el código (ej. CAF-89A2B4)..."
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            style={{
              flex: 1,
              padding: '0.9rem 1.2rem',
              borderRadius: '12px',
              border: '2px solid #D4A373',
              fontSize: '1.1rem',
              fontWeight: 700,
              background: '#FFF',
              color: '#2C1810'
            }}
          />
          <button type="submit" className="btn btn-accent" style={{ padding: '0.9rem 1.5rem', borderRadius: '12px', fontSize: '1rem' }} disabled={loading}>
            <span>{loading ? 'Consultando...' : 'Buscar'}</span>
            <ArrowRight size={20} />
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="card" style={{ background: '#FFE3E3', borderColor: '#FFA8A8', color: '#C92A2A', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={24} />
          <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Customer Profile Result Card */}
      {customer && (
        <div className="card" style={{ animation: 'slideUp 0.3s ease-out', borderLeft: '6px solid #D4A373' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span className="badge-code" style={{ fontSize: '0.95rem' }}>{customer.loyalty_code}</span>
                <span style={{ fontSize: '0.8rem', background: '#D8F3DC', color: '#2D6A4F', padding: '0.2rem 0.6rem', borderRadius: '99px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <UserCheck size={14} /> Cliente Activo
                </span>
              </div>
              <h3 style={{ fontSize: '1.6rem', color: '#2C1810', marginBottom: '0.25rem' }}>
                {customer.first_name} {customer.last_name}
              </h3>
              <p style={{ color: '#786C65', fontSize: '0.9rem' }}>{customer.email} {customer.phone ? `• ${customer.phone}` : ''}</p>
            </div>

            <div style={{ textAlign: 'right', background: '#FAF7F2', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #E8DFD5' }}>
              <span style={{ fontSize: '0.78rem', color: '#786C65', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                SALDO PUNTOS DISPONIBLES
              </span>
              <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#E5A93C' }}>
                {customer.current_points} <span style={{ fontSize: '1rem', color: '#B47B16' }}>Pts</span>
              </span>
            </div>
          </div>

          <hr style={{ margin: '1.5rem 0', borderColor: '#E8DFD5', borderStyle: 'dashed' }} />

          {/* Quick Actions in Cash Register */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '0.85rem' }} onClick={() => setShowQrModal(true)}>
              <QrCode size={18} />
              <span>Ver QR & Pase Google Wallet</span>
            </button>

            <button className="btn btn-accent" style={{ flex: 1, padding: '0.85rem' }} onClick={() => alert("Registrar compra de puntos estará disponible en el Hito 2!")}>
              <ShoppingBag size={18} />
              <span>Abonar Puntos en Compra</span>
            </button>
          </div>
        </div>
      )}

      {/* QR Modal for Scanned Customer */}
      {showQrModal && customer && (
        <CustomerModal user={customer} onClose={() => setShowQrModal(false)} />
      )}
    </div>
  );
};
