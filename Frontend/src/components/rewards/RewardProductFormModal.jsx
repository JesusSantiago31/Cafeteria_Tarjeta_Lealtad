import React, { useState, useEffect } from 'react';
import { X, Gift, Image as ImageIcon, Award, DollarSign, PackageCheck, AlertCircle } from 'lucide-react';
import { productService } from '../../services/api';

export const RewardProductFormModal = ({ productToEdit, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    producto: '',
    puntos_requeridos: 50,
    precio: 0.00,
    piezas_disponibles: 10,
    imagen_url: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        producto: productToEdit.producto || productToEdit.descripcion || '',
        puntos_requeridos: productToEdit.puntos_requeridos || productToEdit.puntos || 50,
        precio: productToEdit.precio || 0.00,
        piezas_disponibles: productToEdit.piezas_disponibles !== undefined ? productToEdit.piezas_disponibles : (productToEdit.disponibles || 10),
        imagen_url: productToEdit.imagen_url || ''
      });
    }
  }, [productToEdit]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.producto.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }

    if (formData.puntos_requeridos <= 0) {
      setError('Los puntos requeridos deben ser mayores a 0.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        producto: formData.producto.trim(),
        puntos_requeridos: parseInt(formData.puntos_requeridos),
        precio: parseFloat(formData.precio) || 0,
        piezas_disponibles: parseInt(formData.piezas_disponibles) || 0,
        imagen_url: formData.imagen_url.trim() || null
      };

      if (productToEdit) {
        const idProd = productToEdit.id_prod || productToEdit.id;
        await productService.updateProduct(idProd, payload);
      } else {
        await productService.createProduct(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Error al guardar el producto.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(30, 20, 10, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          background: '#FFFDF9',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          border: '1px solid #E8DFD1',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, #734F2F 0%, #4A331E 100%)',
          color: '#FFF',
          padding: '20px 24px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '10px',
              borderRadius: '12px',
              display: 'flex'
            }}>
              <Gift size={24} color="#CFD989" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#FFF', fontWeight: '700' }}>
                {productToEdit ? 'Editar Producto de Recompensa' : 'Nuevo Producto de Recompensa'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#E2D5C3' }}>
                {productToEdit ? 'Modifica los valores y stock actual' : 'Agrega un nuevo beneficio al catálogo'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{
              background: 'transparent',
              border: 'none',
              color: '#E2D5C3',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              background: '#FDF2F2',
              border: '1px solid #F8B4B4',
              color: '#9B1C1C',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '18px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre del Producto */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#4A331E', marginBottom: '6px' }}>
              Nombre de la Recompensa *
            </label>
            <input 
              type="text" 
              name="producto" 
              value={formData.producto} 
              onChange={handleChange}
              placeholder="Ej. Capuchino Gratis 350ml, Dona Glaseada..." 
              required 
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #D5C8B5',
                fontSize: '0.9rem',
                background: '#FFF',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Puntos Requeridos y Precio Comercial */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#4A331E', marginBottom: '6px' }}>
                <Award size={16} color="#788C5A" />
                Puntos Necesarios *
              </label>
              <input 
                type="number" 
                name="puntos_requeridos" 
                value={formData.puntos_requeridos} 
                onChange={handleChange}
                min="1"
                required 
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D5C8B5',
                  fontSize: '0.9rem',
                  background: '#FFF',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#4A331E', marginBottom: '6px' }}>
                <DollarSign size={16} color="#788C5A" />
                Precio Ref. ($ MXN)
              </label>
              <input 
                type="number" 
                step="0.50" 
                name="precio" 
                value={formData.precio} 
                onChange={handleChange}
                min="0"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D5C8B5',
                  fontSize: '0.9rem',
                  background: '#FFF',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Stock Piezas Disponibles */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#4A331E', marginBottom: '6px' }}>
              <PackageCheck size={16} color="#788C5A" />
              Piezas Disponibles (Stock)
            </label>
            <input 
              type="number" 
              name="piezas_disponibles" 
              value={formData.piezas_disponibles} 
              onChange={handleChange}
              min="0"
              required 
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #D5C8B5',
                fontSize: '0.9rem',
                background: '#FFF',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* URL de la Imagen */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#4A331E', marginBottom: '6px' }}>
              <ImageIcon size={16} color="#788C5A" />
              URL de la Imagen del Producto
            </label>
            <input 
              type="url" 
              name="imagen_url" 
              value={formData.imagen_url} 
              onChange={handleChange}
              placeholder="https://ejemplo.com/imagen.jpg" 
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #D5C8B5',
                fontSize: '0.9rem',
                background: '#FFF',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid #E8DFD1' }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #D5C8B5',
                background: 'transparent',
                color: '#734F2F',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={saving}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #788C5A 0%, #5E7043 100%)',
                color: '#FFF',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.9rem',
                boxShadow: '0 4px 10px rgba(120, 140, 90, 0.3)'
              }}
            >
              {saving ? 'Guardando...' : productToEdit ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
