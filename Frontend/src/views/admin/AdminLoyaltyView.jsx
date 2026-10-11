import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Image as ImageIcon, Award, CheckCircle, RefreshCw, 
  Calendar, Clock, Gift, Bell, Send, Share2, Globe, ShieldCheck, Sparkles 
} from 'lucide-react';
import { loyaltyService } from '../../services/api';

const DIAS_SEMANA_DEFAULT = [
  { dia_semana: 1, dia_nombre: "Lunes", monto_dinero: 500.0, puntos_otorgados: 50, descripcion: "Lunes de Energía: Bonificación de 50 pts por cada $500", is_active: true },
  { dia_semana: 2, dia_nombre: "Martes", monto_dinero: 300.0, puntos_otorgados: 40, descripcion: "Martes Gourmet: Bonificación de 40 pts por cada $300", is_active: true },
  { dia_semana: 3, dia_nombre: "Miércoles", monto_dinero: 200.0, puntos_otorgados: 25, descripcion: "Miércoles Mitad de Semana: Bonificación de 25 pts por cada $200", is_active: true },
  { dia_semana: 4, dia_nombre: "Jueves", monto_dinero: 250.0, puntos_otorgados: 30, descripcion: "Jueves Especial: Bonificación de 30 pts por cada $250", is_active: true },
  { dia_semana: 5, dia_nombre: "Viernes", monto_dinero: 350.0, puntos_otorgados: 45, descripcion: "Viernes Casual: Bonificación de 45 pts por cada $350", is_active: true },
  { dia_semana: 6, dia_nombre: "Sábado", monto_dinero: 400.0, puntos_otorgados: 50, descripcion: "Sábado Dulce: Bonificación de 50 pts por cada $400", is_active: true },
  { dia_semana: 7, dia_nombre: "Domingo", monto_dinero: 300.0, puntos_otorgados: 35, descripcion: "Domingo Familiar: Bonificación de 35 pts por cada $300", is_active: true },
];

const DEFAULT_BASE_RULE = {
  id: null,
  dia_semana: null,
  dia_nombre: "Por Defecto",
  monto_dinero: 10.0,
  puntos_otorgados: 1,
  descripcion: "Regla Base Estándar: 1 punto por cada $10.00 MXN",
  is_active: true
};

export const AdminLoyaltyView = () => {
  const [defaultRule, setDefaultRule] = useState(DEFAULT_BASE_RULE);
  const [weeklyRules, setWeeklyRules] = useState(DIAS_SEMANA_DEFAULT);
  const [stampImages, setStampImages] = useState([]);
  const [walletSettings, setWalletSettings] = useState({
    max_sellos: 10,
    dias_caducidad_puntos: 90,
    recompensa_sellos_descripcion: "Bebida de cortesía a elegir",
    instagram_url: "https://instagram.com/cafeteria",
    facebook_url: "https://facebook.com/cafeteria",
    terminos_url: "https://cafeteria.com/terminos"
  });

  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // Notificación personalizada
  const [notifHeader, setNotifHeader] = useState('');
  const [notifBody, setNotifBody] = useState('');

  // Form states for editing stamp images
  const [editingStamp, setEditingStamp] = useState(null);
  const [stampCountInput, setStampCountInput] = useState(0);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [msg, setMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesData, stampsData, settingsData] = await Promise.all([
        loyaltyService.getRules(),
        loyaltyService.getStampLevels(),
        loyaltyService.getSettings()
      ]);

      // Mapear regla por defecto y los 7 días de la semana
      if (rulesData && rulesData.length > 0) {
        const foundDefault = rulesData.find(r => r.dia_semana === null || r.dia_semana === undefined);
        if (foundDefault) {
          setDefaultRule({ ...DEFAULT_BASE_RULE, ...foundDefault });
        } else {
          setDefaultRule(DEFAULT_BASE_RULE);
        }

        const mergedWeekly = DIAS_SEMANA_DEFAULT.map(def => {
          const found = rulesData.find(r => r.dia_semana === def.dia_semana);
          return found ? { ...def, ...found } : def;
        });
        setWeeklyRules(mergedWeekly);
      } else {
        setDefaultRule(DEFAULT_BASE_RULE);
        setWeeklyRules(DIAS_SEMANA_DEFAULT);
      }

      setStampImages(stampsData || []);
      if (settingsData) {
        setWalletSettings(prev => ({ ...prev, ...settingsData }));
      }
    } catch (err) {
      console.error("Error al obtener datos de lealtad:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDefaultRuleChange = (field, value) => {
    setDefaultRule(prev => ({ ...prev, [field]: value }));
  };

  const handleWeeklyRuleChange = (index, field, value) => {
    setWeeklyRules(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveWeeklyRules = async (e) => {
    if (e) e.preventDefault();
    setSavingRules(true);
    try {
      const allToSave = [defaultRule, ...weeklyRules];
      await loyaltyService.saveWeeklyRules(allToSave);
      setMsg("¡Reglas dinámicas y regla por defecto guardadas exitosamente!");
      setTimeout(() => setMsg(null), 3500);
      fetchData();
    } catch (err) {
      alert("Error al guardar reglas: " + (err.response?.data?.detail || err.message));
    } finally {
      setSavingRules(false);
    }
  };

  const handleSaveWalletSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      await loyaltyService.updateSettings(walletSettings);
      setMsg("¡Configuración de caducidad, recompensa y redes sociales guardada!");
      setTimeout(() => setMsg(null), 3500);
      fetchData();
    } catch (err) {
      alert("Error al guardar configuración de billetera: " + (err.response?.data?.detail || err.message));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendCustomNotification = async (e) => {
    e.preventDefault();
    if (!notifHeader.trim() || !notifBody.trim()) {
      alert("Por favor ingresa tanto el título como el mensaje de la oferta.");
      return;
    }

    setBroadcasting(true);
    try {
      await loyaltyService.broadcastNotification({
        header: notifHeader.trim(),
        body: notifBody.trim()
      });
      setNotifHeader('');
      setNotifBody('');
      setMsg("¡Notificación push transmitida a las billeteras de Google Wallet de los clientes!");
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      alert("Error al transmitir notificación: " + (err.response?.data?.detail || err.message));
    } finally {
      setBroadcasting(false);
    }
  };

  const handleNotifyDayOffer = async (rule) => {
    const confirm = window.confirm(`¿Deseas enviar a los clientes la promoción de ${rule.dia_nombre}: "${rule.descripcion}"?`);
    if (!confirm) return;

    setBroadcasting(true);
    try {
      await loyaltyService.broadcastNotification({
        header: `Oferta de Hoy (${rule.dia_nombre})`,
        body: rule.descripcion || `Por cada $${rule.monto_dinero} de compra recibe ${rule.puntos_otorgados} puntos de regalo.`
      });
      setMsg(`¡Oferta del ${rule.dia_nombre} enviada a Google Wallet!`);
      setTimeout(() => setMsg(null), 3500);
    } catch (err) {
      alert("Error al transmitir oferta: " + (err.response?.data?.detail || err.message));
    } finally {
      setBroadcasting(false);
    }
  };

  const handleSaveStampImage = async (e) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) {
      alert("Proporciona una URL válida de ImgBB.");
      return;
    }

    try {
      await loyaltyService.saveStampLevel({
        nivel_sello: parseInt(stampCountInput, 10),
        imagen_url: imageUrlInput.trim()
      });
      setEditingStamp(null);
      setImageUrlInput('');
      setMsg("¡Imagen de sello guardada!");
      setTimeout(() => setMsg(null), 3000);
      fetchData();
    } catch (err) {
      alert("Error al guardar la imagen.");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#734F2F' }}>
        <RefreshCw size={24} className="spin" />
        <p>Cargando configuración de lealtad y billetera...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Alerta de Notificación / Éxito */}
      {msg && (
        <div style={{
          background: '#EAF3DE',
          color: '#3B621D',
          padding: '14px 18px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700,
          border: '1px solid #C0DD97',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <CheckCircle size={20} />
          <span>{msg}</span>
        </div>
      )}

      {/* SECCIÓN 1: Reglas de Bonificación de Puntos Dinámicas */}
      <div className="card-client" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={22} color="#734F2F" />
            <h3 style={{ margin: 0, color: '#734F2F' }}>Reglas Dinámicas y Base de Puntos</h3>
          </div>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSaveWeeklyRules}
            disabled={savingRules}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontWeight: 800 }}
          >
            {savingRules ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />}
            <span>{savingRules ? 'Guardando...' : 'Guardar Todas las Reglas'}</span>
          </button>
        </div>

        {/* CAMPO REGLA BASE POR DEFECTO */}
        <div style={{
          background: '#FBFDF9',
          border: '1.5px solid #C0DD97',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Award size={20} color="#2e7d32" />
            <h4 style={{ margin: 0, color: '#2e7d32', fontSize: '1rem', fontWeight: 800 }}>
              ⭐ Regla Base por Defecto (Estándar)
            </h4>
          </div>
          <p style={{ fontSize: '0.84rem', color: '#666', margin: '0 0 14px 0' }}>
            Se aplica automáticamente cuando un día de la semana <strong>no tiene promoción activa</strong> o para compras generales.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#444' }}>Por cada:</label>
              <span style={{ color: '#777', fontWeight: 700 }}>$</span>
              <input 
                type="number"
                step="0.01"
                value={defaultRule.monto_dinero}
                onChange={(e) => handleDefaultRuleChange('monto_dinero', parseFloat(e.target.value) || 0)}
                style={{ width: '100px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #C0DD97' }}
              />
              <span style={{ fontSize: '0.82rem', color: '#666' }}>MXN</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#444' }}>Otorga:</label>
              <input 
                type="number"
                value={defaultRule.puntos_otorgados}
                onChange={(e) => handleDefaultRuleChange('puntos_otorgados', parseInt(e.target.value, 10) || 0)}
                style={{ width: '80px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #C0DD97' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#2e7d32', fontWeight: 800 }}>pts</span>
            </div>

            <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#444' }}>Descripción:</label>
              <input 
                type="text"
                value={defaultRule.descripcion || ''}
                onChange={(e) => handleDefaultRuleChange('descripcion', e.target.value)}
                placeholder="Regla Base Estándar"
                style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #C0DD97' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#444' }}>Activo:</label>
              <input 
                type="checkbox"
                checked={defaultRule.is_active !== false}
                onChange={(e) => handleDefaultRuleChange('is_active', e.target.checked)}
                style={{ cursor: 'pointer', transform: 'scale(1.3)' }}
              />
            </div>
          </div>
        </div>

        <h4 style={{ margin: '0 0 8px 0', color: '#734F2F', fontSize: '0.98rem' }}>
          📅 Reglas Dinámicas de Puntos por Día de la Semana
        </h4>
        <p style={{ fontSize: '0.88rem', color: '#666', marginTop: 0 }}>
          Define cuántos puntos gana el cliente según el día que compre. Por ejemplo: <em>Lunes al comprar $500 se bonifican 50 puntos; Martes al comprar $300 se bonifican 40 puntos</em>, etc.
        </p>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Día</th>
                <th style={{ width: '150px' }}>Monto Compra ($ MXN)</th>
                <th style={{ width: '150px' }}>Puntos a Otorgar</th>
                <th>Nombre / Descripción de la Oferta</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Estado</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Wallet Push</th>
              </tr>
            </thead>
            <tbody>
              {weeklyRules.map((rule, idx) => (
                <tr key={rule.dia_semana || idx}>
                  <td>
                    <strong style={{ color: '#734F2F', fontSize: '0.95rem' }}>{rule.dia_nombre}</strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#777', fontWeight: 600 }}>$</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={rule.monto_dinero}
                        onChange={(e) => handleWeeklyRuleChange(idx, 'monto_dinero', parseFloat(e.target.value) || 0)}
                        style={{ width: '100px', padding: '6px 8px' }}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input 
                        type="number"
                        value={rule.puntos_otorgados}
                        onChange={(e) => handleWeeklyRuleChange(idx, 'puntos_otorgados', parseInt(e.target.value, 10) || 0)}
                        style={{ width: '80px', padding: '6px 8px' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#2e7d32', fontWeight: 700 }}>pts</span>
                    </div>
                  </td>
                  <td>
                    <input 
                      type="text"
                      value={rule.descripcion || ''}
                      onChange={(e) => handleWeeklyRuleChange(idx, 'descripcion', e.target.value)}
                      placeholder={`Oferta del ${rule.dia_nombre}`}
                      style={{ width: '100%', padding: '6px 8px' }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={rule.is_active !== false}
                      onChange={(e) => handleWeeklyRuleChange(idx, 'is_active', e.target.checked)}
                      style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      title="Transmitir esta oferta a Google Wallet"
                      onClick={() => handleNotifyDayOffer(rule)}
                      disabled={broadcasting}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Bell size={13} color="#788C5A" />
                      <span>Notificar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 2: Caducidad de Puntos, Recompensa de Sellos y Redes Sociales */}
      <div className="card-client" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Gift size={22} color="#788C5A" />
          <h3 style={{ margin: 0, color: '#734F2F' }}>Configuración de Caducidad, Premio de Sellos y Billetera</h3>
        </div>

        <form onSubmit={handleSaveWalletSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#734F2F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Clock size={16} /> Caducidad de Puntos (Días)
            </label>
            <input 
              type="number"
              min="0"
              placeholder="Ej. 90 (0 = sin caducidad)"
              value={walletSettings.dias_caducidad_puntos ?? 90}
              onChange={(e) => setWalletSettings({ ...walletSettings, dias_caducidad_puntos: parseInt(e.target.value, 10) || 0 })}
              required
            />
            <small style={{ color: '#777', fontSize: '0.75rem' }}>Días tras los cuales expiran los puntos del cliente (ej. 30, 60, 90).</small>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#734F2F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Award size={16} /> Recompensa de los 10 Sellos (Premio Estático)
            </label>
            <input 
              type="text"
              placeholder="Ej. Café Americano o Latte de cortesía"
              value={walletSettings.recompensa_sellos_descripcion || ''}
              onChange={(e) => setWalletSettings({ ...walletSettings, recompensa_sellos_descripcion: e.target.value })}
              required
            />
            <small style={{ color: '#777', fontSize: '0.75rem' }}>Premio que el cajero entregará al completar la tarjeta de sellos.</small>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#734F2F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Share2 size={16} /> Instagram de la Cafetería
            </label>
            <input 
              type="url"
              placeholder="https://instagram.com/tucafeteria"
              value={walletSettings.instagram_url || ''}
              onChange={(e) => setWalletSettings({ ...walletSettings, instagram_url: e.target.value })}
            />
            <small style={{ color: '#777', fontSize: '0.75rem' }}>Enlace incluido en Google Wallet y Portal del Cliente.</small>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#734F2F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Globe size={16} /> Facebook de la Cafetería
            </label>
            <input 
              type="url"
              placeholder="https://facebook.com/tucafeteria"
              value={walletSettings.facebook_url || ''}
              onChange={(e) => setWalletSettings({ ...walletSettings, facebook_url: e.target.value })}
            />
            <small style={{ color: '#777', fontSize: '0.75rem' }}>Página oficial de Facebook de la cafetería.</small>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#734F2F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <ShieldCheck size={16} /> Enlace de Términos y Condiciones
            </label>
            <input 
              type="url"
              placeholder="https://tucafeteria.com/terminos"
              value={walletSettings.terminos_url || ''}
              onChange={(e) => setWalletSettings({ ...walletSettings, terminos_url: e.target.value })}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={savingSettings} style={{ padding: '8px 20px' }}>
              {savingSettings ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN 3: Centro de Notificaciones y Ofertas a Google Wallet */}
      <div className="card-client" style={{ margin: 0, background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)', border: '1.5px solid #E2A03F' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Bell size={22} color="#E2A03F" />
          <h3 style={{ margin: 0, color: '#734F2F' }}>Centro de Notificaciones y Ofertas (Google Wallet)</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 0 }}>
          Envía una notificación push instantánea a las tarjetas instaladas en los dispositivos móviles de tus clientes (Google Pay / Google Wallet) para anunciar promociones, horarios especiales o descuentos.
        </p>

        <form onSubmit={handleSendCustomNotification} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#734F2F', display: 'block', marginBottom: '4px' }}>
                Título / Encabezado de la Notificación
              </label>
              <input 
                type="text"
                placeholder="Ej. ¡2x1 en Cappuccinos hoy!"
                value={notifHeader}
                onChange={(e) => setNotifHeader(e.target.value)}
                maxLength={90}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#734F2F', display: 'block', marginBottom: '4px' }}>
                Mensaje de la Oferta o Promoción
              </label>
              <input 
                type="text"
                placeholder="Ej. Visítanos antes de las 6:00 PM y obtén el doble de puntos en todas tus bebidas."
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                maxLength={250}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: '#777' }}>
              También se notifica automáticamente a los clientes al estar cerca del local (Geofencing activo).
            </span>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={broadcasting} 
              style={{ background: '#E2A03F', borderColor: '#D49232', color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
            >
              {broadcasting ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
              <span>{broadcasting ? 'Transmitiendo...' : 'Transmitir Notificación a Clientes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN 4: Galería de Imágenes de Sellos ImgBB (0 a 10 Sellos) */}
      <div className="card-client" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <ImageIcon size={22} color="#788C5A" />
          <h3 style={{ margin: 0, color: '#734F2F' }}>Imágenes de Sellos Dinámicas (Google Wallet & Web)</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 0 }}>
          Visualiza y actualiza las imágenes alojadas en <strong>ImgBB</strong> para cada estado de la tarjeta (de 0 a 10 sellos acumulados).
        </p>

        {editingStamp !== null && (
          <form onSubmit={handleSaveStampImage} style={{
            background: '#FAF7F2',
            padding: '16px',
            borderRadius: '12px',
            border: '2px solid #788C5A',
            marginBottom: '16px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#734F2F' }}>Editar URL de Imagen ImgBB para {stampCountInput} Sello(s)</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="url"
                placeholder="https://i.ibb.co/ejemplo.png"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>Guardar URL</button>
              <button type="button" className="btn btn-outline" style={{ padding: '8px 16px' }} onClick={() => setEditingStamp(null)}>Cancelar</button>
            </div>
          </form>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '16px'
        }}>
          {Array.from({ length: 11 }, (_, count) => {
            const levelData = stampImages.find(s => s.stamp_count === count || s.nivel_sello === count);
            const currentUrl = levelData ? (levelData.image_url || levelData.wallet_hero_url || levelData.imagen_url) : null;
            const stampName = levelData ? (levelData.nombre_sello || `${count} Sello(s)`) : `${count} Sello(s)`;

            return (
              <div key={count} style={{
                background: '#FFF',
                border: '1px solid #E8DFD1',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <span className="badge badge-success" style={{ background: count === 0 ? '#E8DFD1' : '#CFD989', color: '#734F2F', fontWeight: 800 }}>
                  {count === 0 ? 'Estado Inicial (0 Sellos)' : `${count} Sello(s)`}
                </span>

                <div style={{
                  width: '100%',
                  height: '110px',
                  background: '#FAF7F2',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px dashed #CCC',
                  position: 'relative'
                }}>
                  {currentUrl ? (
                    <img 
                      src={currentUrl} 
                      alt={stampName} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#999', textAlign: 'center', padding: '8px' }}>Sin Imagen Registrada</span>
                  )}
                </div>

                <div style={{ fontSize: '0.72rem', color: '#666', fontWeight: 600, width: '100%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  {stampName}
                </div>

                <button
                  className="btn btn-outline"
                  style={{ width: '100%', padding: '6px', fontSize: '0.75rem' }}
                  onClick={() => {
                    setEditingStamp(count);
                    setStampCountInput(count);
                    setImageUrlInput(currentUrl || '');
                  }}
                >
                  {currentUrl ? 'Cambiar Imagen ImgBB' : '+ Configurar URL ImgBB'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
