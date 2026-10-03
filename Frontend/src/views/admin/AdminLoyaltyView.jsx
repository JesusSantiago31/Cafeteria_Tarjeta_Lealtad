import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, Image as ImageIcon, Award, CheckCircle, RefreshCw } from 'lucide-react';
import { loyaltyService } from '../../services/api';

export const AdminLoyaltyView = () => {
  const [rules, setRules] = useState([]);
  const [stampImages, setStampImages] = useState([]);
  const [maxStamps, setMaxStamps] = useState(10);
  const [loading, setLoading] = useState(true);

  // Form states for new point rule
  const [newMonto, setNewMonto] = useState('');
  const [newPuntos, setNewPuntos] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');

  // Form states for editing stamp images
  const [editingStamp, setEditingStamp] = useState(null);
  const [stampCountInput, setStampCountInput] = useState(0);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [savingSettings, setSavingSettings] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesData, settingsData, stampsData] = await Promise.all([
        loyaltyService.getRules(),
        loyaltyService.getSettings(),
        loyaltyService.getStampLevels()
      ]);
      setRules(rulesData || []);
      if (settingsData && settingsData.max_sellos) {
        setMaxStamps(settingsData.max_sellos);
      }
      setStampImages(stampsData || []);
    } catch (err) {
      console.error("Error al obtener datos de lealtad:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newMonto || !newPuntos) {
      alert("Por favor llena los campos de monto y puntos.");
      return;
    }

    try {
      await loyaltyService.createRule({
        monto_dinero: parseFloat(newMonto),
        puntos_otorgados: parseInt(newPuntos, 10),
        descripcion: newDescripcion || `Por cada $${newMonto} se otorgan ${newPuntos} pts/sellos`,
        is_active: true
      });
      setNewMonto('');
      setNewPuntos('');
      setNewDescripcion('');
      setMsg("¡Regla guardada con éxito!");
      setTimeout(() => setMsg(null), 3000);
      fetchData();
    } catch (err) {
      alert("Error al guardar la regla.");
    }
  };

  const handleDeleteRule = async (id) => {
    if (window.confirm("¿Seguro de eliminar esta regla?")) {
      try {
        await loyaltyService.deleteRule(id);
        fetchData();
      } catch (err) {
        alert("No se pudo eliminar la regla.");
      }
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await loyaltyService.updateSettings({ max_sellos: parseInt(maxStamps, 10), is_active: true });
      setMsg("¡Configuración de sello máximo actualizada!");
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      alert("Error al guardar la configuración.");
    } finally {
      setSavingSettings(false);
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
        <p>Cargando reglas y configuración de sellos...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Mensaje de Éxito */}
      {msg && (
        <div style={{
          background: '#EAF3DE',
          color: '#3B621D',
          padding: '12px 16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 700,
          border: '1px solid #C0DD97'
        }}>
          <CheckCircle size={18} />
          <span>{msg}</span>
        </div>
      )}

      {/* SECCIÓN 1: Reglas de Bonificación de Puntos / Dinero */}
      <div className="card-client" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Award size={22} color="#734F2F" />
          <h3 style={{ margin: 0, color: '#734F2F' }}>Reglas de Bonificación (Puntos x Consumo)</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 0 }}>
          Define la cantidad de dinero consumido para recibir determinada cantidad de puntos o sellos.
        </p>

        {/* Formulario Nueva Regla */}
        <form onSubmit={handleAddRule} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr auto', gap: '10px', marginBottom: '20px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#734F2F', display: 'block', marginBottom: '4px' }}>Monto ($ MXN)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Ej. 50.00"
              value={newMonto}
              onChange={(e) => setNewMonto(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#734F2F', display: 'block', marginBottom: '4px' }}>Puntos / Sellos</label>
            <input
              type="number"
              placeholder="Ej. 1"
              value={newPuntos}
              onChange={(e) => setNewPuntos(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#734F2F', display: 'block', marginBottom: '4px' }}>Descripción Opcional</label>
            <input
              type="text"
              placeholder="Ej. 1 sello por cada $50 de compra"
              value={newDescripcion}
              onChange={(e) => setNewDescripcion(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} />
            <span>Agregar</span>
          </button>
        </form>

        {/* Tabla de Reglas Existentes */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Monto de Compra ($)</th>
                <th>Puntos / Sellos Otorgados</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#999', padding: '1.5rem' }}>
                    No hay reglas configuradas aún.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td><strong>${parseFloat(rule.monto_dinero).toFixed(2)} MXN</strong></td>
                    <td><span className="badge badge-success">+{rule.puntos_otorgados} pts/sellos</span></td>
                    <td style={{ fontSize: '0.85rem', color: '#555' }}>{rule.descripcion || 'Sin descripción'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px' }}
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 2: Límite Máximo de Sellos en Tarjeta */}
      <div className="card-client" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Settings size={22} color="#788C5A" />
          <h3 style={{ margin: 0, color: '#734F2F' }}>Límite Máximo de Sellos</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#734F2F', display: 'block', marginBottom: '4px' }}>Máximo de sellos</label>
            <input
              type="number"
              min="1"
              max="20"
              value={maxStamps}
              onChange={(e) => setMaxStamps(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: '20px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleSaveSettings}
            disabled={savingSettings}
          >
            <Save size={16} />
            <span>{savingSettings ? "Guardando..." : "Guardar Límite"}</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 3: Mapeo de Imágenes de ImgBB por Nivel de Sello (0 a 10) */}
      <div className="card-client" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <ImageIcon size={22} color="#E2A03F" />
          <h3 style={{ margin: 0, color: '#734F2F' }}>Imágenes Dinámicas de Google Wallet / Web (ImgBB)</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 0 }}>
          Asigna la URL de la imagen guardada en ImgBB para cada cantidad de sellos acumulados (0 hasta {maxStamps}).
        </p>

        {/* Modal / Formulario flotante rápido para editar imagen */}
        {editingStamp !== null && (
          <form onSubmit={handleSaveStampImage} style={{
            background: '#FAF7F2',
            padding: '16px',
            borderRadius: '12px',
            border: '2px solid #788C5A',
            marginBottom: '16px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#734F2F' }}>Editar Imagen para {stampCountInput} Sello(s)</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="url"
                placeholder="https://i.ibb.co/ejemplo.png"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>Guardar</button>
              <button type="button" className="btn btn-outline" style={{ padding: '8px 16px' }} onClick={() => setEditingStamp(null)}>Cancelar</button>
            </div>
          </form>
        )}

        {/* Galería de Tarjetas de Sellos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '16px'
        }}>
          {Array.from({ length: parseInt(maxStamps, 10) + 1 }, (_, i) => i).map((count) => {
            const levelData = stampImages.find(s => s.stamp_count === count || s.nivel_sello === count);
            const currentUrl = levelData ? (levelData.image_url || levelData.imagen_url) : null;

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
                  border: '1px dashed #CCC'
                }}>
                  {currentUrl ? (
                    <img src={currentUrl} alt={`Sello ${count}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#999', textAlign: 'center', padding: '8px' }}>Sin Imagen</span>
                  )}
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
                  {currentUrl ? 'Cambiar Imagen ImgBB' : '+ Agregar Imagen'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
