import React, { useState, useEffect } from 'react';
import { Gift, Plus, Search, Edit3, Trash2, PackageX, Award, RefreshCw, Sparkles, CheckCircle2, AlertTriangle, Coffee, DollarSign } from 'lucide-react';
import { productService } from '../../services/api';
import { RewardProductFormModal } from '../../components/rewards/RewardProductFormModal';

export const AdminRewardsView = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'venta' | 'recompensa'
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await productService.getProducts();
      setProducts(data || []);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError("No se pudo cargar la lista de productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (prod) => {
    setEditingProduct(prod);
    setIsModalOpen(true);
  };

  const handleDelete = async (prod) => {
    const prodId = prod.id_prod || prod.id;
    const prodName = prod.producto || prod.descripcion || 'este producto';
    
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${prodName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(prodId);
    try {
      await productService.deleteProduct(prodId);
      setProducts(prev => prev.filter(p => (p.id_prod || p.id) !== prodId));
    } catch (err) {
      alert("Error al eliminar el producto: " + (err.response?.data?.detail || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  // Metric computations
  const totalProducts = products.length;
  const ventaCount = products.filter(p => (p.tipo === 'venta' || (!p.tipo && (p.puntos_requeridos || 0) === 0))).length;
  const recompensaCount = products.filter(p => (p.tipo === 'recompensa' || (!p.tipo && (p.puntos_requeridos || 0) > 0))).length;
  const outOfStockCount = products.filter(p => (p.piezas_disponibles ?? p.disponibles ?? 1) <= 0).length;

  // Filtered products by search & tipo
  const filteredProducts = products.filter(p => {
    const name = (p.producto || p.descripcion || '').toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase());
    const itemTipo = p.tipo || ((p.puntos_requeridos || 0) > 0 ? 'recompensa' : 'venta');
    const matchesType = filterType === 'all' || itemTipo === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '8px' }}>
      {/* Metrics Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Catálogo Total */}
        <div style={{
          background: 'linear-gradient(135deg, #FAF7F2 0%, #FFF 100%)',
          border: '1px solid #E8DFD1',
          borderRadius: '16px',
          padding: '18px 20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ background: 'rgba(115, 79, 47, 0.1)', padding: '12px', borderRadius: '14px' }}>
            <Coffee size={28} color="#734F2F" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#7E6B5A', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Catálogo Total
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#4A331E', marginTop: '2px' }}>
              {totalProducts} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#888' }}>items</span>
            </div>
          </div>
        </div>

        {/* Menú a la Venta */}
        <div style={{
          background: 'linear-gradient(135deg, #FAF7F2 0%, #FFF 100%)',
          border: '1px solid #E8DFD1',
          borderRadius: '16px',
          padding: '18px 20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ background: 'rgba(115, 79, 47, 0.12)', padding: '12px', borderRadius: '14px' }}>
            <DollarSign size={28} color="#734F2F" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#7E6B5A', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Menú de Venta
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#734F2F', marginTop: '2px' }}>
              {ventaCount} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#888' }}>en menú</span>
            </div>
          </div>
        </div>

        {/* Recompensas */}
        <div style={{
          background: 'linear-gradient(135deg, #FAF7F2 0%, #FFF 100%)',
          border: '1px solid #E8DFD1',
          borderRadius: '16px',
          padding: '18px 20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ background: 'rgba(120, 140, 90, 0.12)', padding: '12px', borderRadius: '14px' }}>
            <Gift size={28} color="#788C5A" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#7E6B5A', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Recompensas Puntos
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#4A331E', marginTop: '2px' }}>
              {recompensaCount} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#788C5A' }}>canjeables</span>
            </div>
          </div>
        </div>

        {/* Sin Stock */}
        <div style={{
          background: 'linear-gradient(135deg, #FAF7F2 0%, #FFF 100%)',
          border: '1px solid #E8DFD1',
          borderRadius: '16px',
          padding: '18px 20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ background: outOfStockCount > 0 ? 'rgba(217, 83, 79, 0.12)' : 'rgba(120, 140, 90, 0.12)', padding: '12px', borderRadius: '14px' }}>
            <PackageX size={28} color={outOfStockCount > 0 ? '#D9534F' : '#788C5A'} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#7E6B5A', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Sin Stock
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: outOfStockCount > 0 ? '#D9534F' : '#4A331E', marginTop: '2px' }}>
              {outOfStockCount} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#888' }}>agotados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Pestañas de Filtro (Todos / Venta / Recompensa) + Search + Botón Nuevo */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Pestañas de Filtro */}
        <div style={{ display: 'flex', gap: '8px', background: '#F5EFE6', padding: '4px', borderRadius: '14px' }}>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: filterType === 'all' ? '#FFF' : 'transparent',
              color: filterType === 'all' ? '#734F2F' : '#7E6B5A',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: filterType === 'all' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Todos ({totalProducts})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('venta')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: filterType === 'venta' ? '#FFF' : 'transparent',
              color: filterType === 'venta' ? '#734F2F' : '#7E6B5A',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: filterType === 'venta' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <span>Menú de Venta ({ventaCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('recompensa')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: filterType === 'recompensa' ? '#FFF' : 'transparent',
              color: filterType === 'recompensa' ? '#788C5A' : '#7E6B5A',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: filterType === 'recompensa' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <span>Recompensas Puntos ({recompensaCount})</span>
          </button>
        </div>

        {/* Buscador y Botón Agregar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={18} color="#7E6B5A" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              style={{
                width: '100%',
                padding: '9px 14px 9px 40px',
                borderRadius: '12px',
                border: '1px solid #D5C8B5',
                fontSize: '0.88rem',
                background: '#FFF',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button 
            onClick={fetchProducts}
            style={{
              padding: '9px 12px',
              borderRadius: '12px',
              border: '1px solid #D5C8B5',
              background: '#FFF',
              color: '#734F2F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600'
            }}
            title="Recargar catálogo"
          >
            <RefreshCw size={16} />
          </button>

          <button 
            onClick={handleCreateNew}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #788C5A 0%, #5E7043 100%)',
              color: '#FFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '700',
              fontSize: '0.88rem',
              boxShadow: '0 4px 12px rgba(120, 140, 90, 0.35)'
            }}
          >
            <Plus size={18} />
            <span>Nuevo Producto / Menú</span>
          </button>
        </div>
      </div>

      {/* Catalog Content Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#FFFDF9', borderRadius: '16px', border: '1px solid #E8DFD1' }}>
          <RefreshCw size={32} color="#788C5A" className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px', color: '#7E6B5A', fontSize: '0.95rem' }}>Cargando catálogo de productos...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '30px', background: '#FDF2F2', borderRadius: '16px', border: '1px solid #F8B4B4', color: '#9B1C1C' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontWeight: '600' }}>{error}</p>
          <button onClick={fetchProducts} style={{ marginTop: '10px', padding: '8px 16px', borderRadius: '8px', background: '#9B1C1C', color: '#FFF', border: 'none', cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: '#FFFDF9', borderRadius: '16px', border: '1px solid #E8DFD1' }}>
          <Coffee size={48} color="#D5C8B5" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ margin: 0, color: '#4A331E', fontSize: '1.1rem' }}>No hay productos en esta categoría</h4>
          <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '4px' }}>
            {search ? 'No se encontraron resultados para la búsqueda.' : 'Agrega un nuevo producto para esta sección.'}
          </p>
          {!search && (
            <button onClick={handleCreateNew} style={{ marginTop: '14px', padding: '10px 18px', borderRadius: '10px', background: '#788C5A', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
              + Crear Producto
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '20px'
        }}>
          {filteredProducts.map(prod => {
            const id = prod.id_prod || prod.id;
            const title = prod.producto || prod.descripcion || 'Sin nombre';
            const isVenta = prod.tipo === 'venta' || (!prod.tipo && (prod.puntos_requeridos || 0) === 0);
            const points = prod.puntos_requeridos || prod.puntos || 0;
            const stock = prod.piezas_disponibles !== undefined ? prod.piezas_disponibles : prod.disponibles;
            const price = prod.precio || 0;
            const imgUrl = prod.imagen_url;
            const isDeleting = deletingId === id;

            return (
              <div 
                key={id}
                style={{
                  background: '#FFFDF9',
                  border: isVenta ? '1px solid #E8DFD1' : '1.5px solid #CFD989',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  opacity: isDeleting ? 0.5 : 1
                }}
              >
                <div>
                  {/* Image banner */}
                  <div style={{
                    height: '140px',
                    background: '#F5EFE6',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {imgUrl ? (
                      <img 
                        src={imgUrl} 
                        alt={title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <Coffee size={48} color="#D5C8B5" />
                    )}
                    
                    {/* Badge Venta vs Recompensa */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: isVenta ? 'rgba(115, 79, 47, 0.9)' : 'rgba(120, 140, 90, 0.9)',
                      backdropFilter: 'blur(4px)',
                      color: '#FFF',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{isVenta ? ' Menú Venta' : 'Recompensa Pts'}</span>
                    </div>

                    {/* Badge Puntos o Precio */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: isVenta ? '#FFF' : '#CFD989',
                      fontWeight: '800',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.8rem'
                    }}>
                      {isVenta ? `$${price.toFixed(2)} MXN` : `⭐ ${points} pts`}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '16px' }}>
                    <h4 style={{ margin: '0 0 6px', color: '#4A331E', fontSize: '1.05rem', fontWeight: '700' }}>
                      {title}
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#7E6B5A', marginBottom: '8px' }}>
                      <span>Precio Ref: <strong>${price.toFixed(2)}</strong></span>
                      <span style={{ 
                        color: stock > 0 ? '#5E7043' : '#D9534F',
                        fontWeight: '700'
                      }}>
                        {stock > 0 ? `${stock} disp.` : 'Agotado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{
                  padding: '12px 16px',
                  background: '#FAF7F2',
                  borderTop: '1px solid #E8DFD1',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px'
                }}>
                  <button 
                    onClick={() => handleEdit(prod)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D5C8B5',
                      background: '#FFF',
                      color: '#734F2F',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Editar</span>
                  </button>

                  <button 
                    onClick={() => handleDelete(prod)}
                    disabled={isDeleting}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #F5C6CB',
                      background: '#FFF',
                      color: '#D9534F',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <RewardProductFormModal 
          productToEdit={editingProduct}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            fetchProducts();
          }}
        />
      )}
    </div>
  );
};
