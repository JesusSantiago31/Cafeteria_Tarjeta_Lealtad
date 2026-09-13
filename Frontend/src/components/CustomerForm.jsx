import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { userService } from '../services/api';

export const CustomerForm = ({ customerToEdit, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    loyalty_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        first_name: customerToEdit.first_name || '',
        last_name: customerToEdit.last_name || '',
        email: customerToEdit.email || '',
        phone: customerToEdit.phone || '',
        loyalty_code: customerToEdit.loyalty_code || ''
      });
    }
  }, [customerToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (customerToEdit) {
        // Update user
        const updatePayload = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || null
        };
        await userService.updateUser(customerToEdit.id, updatePayload);
      } else {
        // Create user
        const createPayload = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || null,
          loyalty_code: formData.loyalty_code.trim() || undefined
        };
        await userService.createUser(createPayload);
      }
      onSaved();
    } catch (err) {
      console.error("Error saving customer:", err);
      const msg = err.response?.data?.detail || "Ocurrió un error al guardar el cliente.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{customerToEdit ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h3>
          <button onClick={onClose} style={{ color: '#FFF' }}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div style={{ background: '#FFE3E3', color: '#C92A2A', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A2B1D', marginBottom: '0.35rem' }}>
                Nombre *
              </label>
              <input
                type="text"
                name="first_name"
                required
                placeholder="Ej. Juan"
                value={formData.first_name}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #E8DFD5' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A2B1D', marginBottom: '0.35rem' }}>
                Apellido *
              </label>
              <input
                type="text"
                name="last_name"
                required
                placeholder="Ej. Pérez"
                value={formData.last_name}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #E8DFD5' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A2B1D', marginBottom: '0.35rem' }}>
              Correo Electrónico *
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="cliente@ejemplo.com"
              value={formData.email}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #E8DFD5' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A2B1D', marginBottom: '0.35rem' }}>
              Teléfono (Opcional)
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="+52 55 1234 5678"
              value={formData.phone}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #E8DFD5' }}
            />
          </div>

          {!customerToEdit && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4A2B1D', marginBottom: '0.35rem' }}>
                Código de Lealtad / QR (Opcional)
              </label>
              <input
                type="text"
                name="loyalty_code"
                placeholder="Ej. CAF-89A2B4 (Vacío = Auto-generar)"
                value={formData.loyalty_code}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #E8DFD5' }}
              />
              <span style={{ fontSize: '0.78rem', color: '#9E9188', marginTop: '0.25rem', display: 'block' }}>
                Si se deja vacío, el sistema generará un código de lealtad único automáticamente.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-accent" disabled={loading}>
              <Save size={18} />
              <span>{loading ? 'Guardando...' : 'Guardar Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
