import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Image as ImageIcon, Award, CheckCircle, RefreshCw } from 'lucide-react';
import { loyaltyService } from '../../services/api';

export const AdminLoyaltyView = () => {
  const [rules, setRules] = useState([]);
  const [stampImages, setStampImages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for new point rule
  const [newMonto, setNewMonto] = useState('');
  const [newPuntos, setNewPuntos] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');

  // Form states for editing stamp images
  const [editingStamp, setEditingStamp] = useState(null);
  const [stampCountInput, setStampCountInput] = useState(0);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [msg, setMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesData, stampsData] = await Promise.all([
        loyaltyService.getRules(),
        loyaltyService.getStampLevels()
      ]);
      setRules(rulesData || []);
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
        descripcion: newDescripcion || `Por cada $${newMonto} consumidos se otorgan ${newPuntos} puntos`,
        is_active: true
      });
      setNewMonto('');
      setNewPuntos('');
      setNewDescripcion('');
      setMsg("¡Regla de bonificación guardada con éxito!");
      setTimeout(() => setMsg(null), 3000);
      fetchData();
    } catch (err) {
      alert("Error al guardar la regla. Verifica los datos.");
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
        <p>Cargando datos desde la base de datos Supabase...</p>
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

      {/* SECCIÓN 1: Reglas de Bonificación de Puntos x Consumo */}
      <div className="card-client" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Award size={22} color="#734F2F" />
          <h3 style={{ margin: 0, color: '#734F2F' }}>Reglas de Puntos por Consumo</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 0 }}>
          Configura cuántos <strong>PUNTOS</strong> se bonificarán a un cliente según la cantidad de dinero consumido en su compra.
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
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#734F2F', display: 'block', marginBottom: '4px' }}>Puntos a Bonificar</label>
            <input
              type="number"
              placeholder="Ej. 10"
              value={newPuntos}
              onChange={(e) => setNewPuntos(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#734F2F', display: 'block', marginBottom: '4px' }}>Descripción Opcional</label>
            <input
              type="text"
              placeholder="Ej. Bonificación de 10 pts por cada $50"
              value={newDescripcion}
              onChange={(e) => setNewDescripcion(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} />
            <span>Agregar Regla</span>
          </button>
        </form>

        {/* Tabla de Reglas Existentes */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Monto de Compra ($)</th>
                <th>Puntos Bonificados</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#999', padding: '1.5rem' }}>
                    No hay reglas de puntos configuradas en la base de datos.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td><strong>${parseFloat(rule.monto_dinero).toFixed(2)} MXN</strong></td>
                    <td><span className="badge badge-success">+{rule.puntos_otorgados} Pts</span></td>
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

      {/* SECCIÓN 2: Galería de Imágenes de Sellos ImgBB (0 a 10 Sellos) */}
      <div className="card-client" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <ImageIcon size={22} color="#E2A03F" />
          <h3 style={{ margin: 0, color: '#734F2F' }}>Imágenes de Sellos (Google Wallet & Web)</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 0 }}>
          Visualiza y actualiza las imágenes alojadas en <strong>ImgBB</strong> para cada estado de la tarjeta (de 0 a 10 sellos acumulados).
        </p>

        {/* Modal / Formulario flotante rápido para editar imagen de sello */}
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

        {/* Galería de Tarjetas de Sellos (0 a 10) */}
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
                  justify: 'center',
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
