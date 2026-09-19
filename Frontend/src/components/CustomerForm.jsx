import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, User, Phone } from 'lucide-react';
import { userService } from '../services/api';

export const CustomerForm = ({ customerToEdit, onClose, onSaved }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customerToEdit) {
      const full = `${customerToEdit.first_name || ''} ${customerToEdit.last_name || ''}`.trim();
      setFullName(full);
      setPhone(customerToEdit.phone || customerToEdit.loyalty_code || '');
    }
  }, [customerToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Por favor completa el Nombre Completo y el Número de Teléfono.');
      return;
    }

    setLoading(true);
    setError('');

    // Nombre Completo guardado íntegramente en first_name
    const fullNameTrimmed = fullName.trim();
    const cleanPhone = phone.trim();
    const autoEmail = `${cleanPhone.replace(/[^0-9]/g, '')}@cliente.cafeteria.com`;

    try {
      if (customerToEdit) {
        // Actualizar cliente existente
        await userService.updateUser(customerToEdit.id, {
          first_name: fullNameTrimmed,
          last_name: '',
          phone: cleanPhone,
        });
      } else {
        // Registrar cliente simplificado
        await userService.createUser({
          first_name: fullNameTrimmed,
          last_name: '',
          email: autoEmail,
          phone: cleanPhone,
          loyalty_code: `QR-${cleanPhone}`
        });
      }
      onSaved();

    } catch (err) {
      console.error("Error al guardar cliente:", err);
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
          <h3>{customerToEdit ? 'Editar Cliente' : 'Registro Rápido de Cliente'}</h3>
          <button onClick={onClose} style={{ color: '#FFF', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <p style={{ fontSize: '0.82rem', color: '#734F2F', opacity: 0.85, marginBottom: '1.25rem' }}>
            Proceso simplificado: Ingresa únicamente el Nombre Completo y Teléfono para dar de alta al cliente en segundos.
          </p>

          {error && (
            <div style={{ background: '#FFE4E6', color: '#9F1239', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Nombre Completo *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Número de Teléfono *</label>
            <input
              type="tel"
              required
              placeholder="Ej. 5512345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} />
              <span>{loading ? 'Guardando...' : 'Guardar Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
