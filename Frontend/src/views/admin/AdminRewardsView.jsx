import React, { useState, useEffect } from 'react';
import { Gift, Plus, Search, Edit3, Trash2, PackageX, Award, RefreshCw, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { productService } from '../../services/api';
import { RewardProductFormModal } from '../../components/rewards/RewardProductFormModal';

export const AdminRewardsView = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
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
      console.error("Error al cargar productos de recompensa:", err);
      setError("No se pudo cargar la lista de productos de recompensas.");
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
    
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la recompensa "${prodName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(prodId);
    try {
      await productService.deleteProduct(prodId);
      setProducts(prev => prev.filter(p => (p.id_prod || p.id) !== prodId));
    } catch (err) {
      alert("Error al eliminar la recompensa: " + (err.response?.data?.detail || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  // Metric computations
  const totalProducts = products.length;
  const outOfStockCount = products.filter(p => (p.piezas_disponibles ?? p.disponibles ?? 1) <= 0).length;
  const avgPoints = totalProducts > 0 
    ? Math.round(products.reduce((acc, p) => acc + (p.puntos_requeridos || p.puntos || 0), 0) / totalProducts)
    : 0;

  // Filtered products by search
  const filteredProducts = products.filter(p => {
    const name = (p.producto || p.descripcion || '').toLowerCase();
    return name.includes(search.toLowerCase());
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
            <Gift size={28} color="#734F2F" />
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
            <Award size={28} color="#788C5A" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#7E6B5A', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Promedio de Puntos
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#4A331E', marginTop: '2px' }}>
              {avgPoints} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#788C5A' }}>pts</span>
            </div>
          </div>
        </div>

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

      {/* Control Bar: Search + Create Button */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justify: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '400px' }}>
          <Search size={18} color="#7E6B5A" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar recompensa por nombre..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 42px',
              borderRadius: '12px',
              border: '1px solid #D5C8B5',
              fontSize: '0.9rem',
              background: '#FFF',
              boxSizing: 'border-box',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchProducts}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid #D5C8B5',
              background: '#FFF',
              color: '#734F2F',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}
            title="Recargar catálogo"
          >
            <RefreshCw size={16} />
          </button>

          <button 
            onClick={handleCreateNew}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #788C5A 0%, #5E7043 100%)',
              color: '#FFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '700',
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(120, 140, 90, 0.35)'
            }}
          >
            <Plus size={18} />
            <span>Nueva Recompensa</span>
          </button>
        </div>
      </div>

      {/* Catalog Content Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#FFFDF9', borderRadius: '16px', border: '1px solid #E8DFD1' }}>
          <RefreshCw size={32} color="#788C5A" className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px', color: '#7E6B5A', fontSize: '0.95rem' }}>Cargando catálogo de recompensas...</p>
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
          <Gift size={48} color="#D5C8B5" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ margin: 0, color: '#4A331E', fontSize: '1.1rem' }}>No hay recompensas registradas</h4>
          <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '4px' }}>
            {search ? 'No se encontraron resultados para la búsqueda.' : 'Agrega tu primer producto de recompensa al catálogo.'}
          </p>
          {!search && (
            <button onClick={handleCreateNew} style={{ marginTop: '14px', padding: '10px 18px', borderRadius: '10px', background: '#788C5A', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
              + Crear Recompensa
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
            const points = prod.puntos_requeridos || prod.puntos || 0;
            const stock = prod.piezas_disponibles !== undefined ? prod.piezas_disponibles : prod.disponibles;
            const price = prod.precio;
            const imgUrl = prod.imagen_url;
            const isDeleting = deletingId === id;

            return (
              <div 
                key={id}
                style={{
                  background: '#FFFDF9',
                  border: '1px solid #E8DFD1',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  opacity: isDeleting ? 0.5 : 1
                }}
              >
                <div>
                  {/* Image banner or fallback */}
                  <div style={{
                    height: '140px',
                    background: '#F5EFE6',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center'
                  }}>
                    {imgUrl ? (
                      <img 
                        src={imgUrl} 
                        alt={title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Gift size={48} color="#D5C8B5" />
                    )}
                    
                    {/* Points Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(74, 51, 30, 0.85)',
                      backdropFilter: 'blur(4px)',
                      color: '#CFD989',
                      fontWeight: '800',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}>
                      <span>⭐ {points} pts</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#4A331E', fontWeight: '700', lineHeight: '1.3' }}>
                      {title}
                    </h4>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px dashed #E8DFD1',
                      fontSize: '0.82rem'
                    }}>
                      <div>
                        <span style={{ color: '#888' }}>Stock actual:</span>{' '}
                        <b style={{ color: (stock ?? 1) > 0 ? '#5E7043' : '#D9534F' }}>
                          {stock !== undefined ? `${stock} piezas` : 'Disponible'}
                        </b>
                      </div>

                      {price !== undefined && price !== null && (
                        <div>
                          <span style={{ color: '#888' }}>Precio ref:</span>{' '}
                          <b style={{ color: '#734F2F' }}>${price}</b>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div style={{
                  padding: '12px 16px',
                  background: '#FAF7F2',
                  borderTop: '1px solid #E8DFD1',
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button 
                    onClick={() => handleEdit(prod)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '10px',
                      border: '1px solid #D5C8B5',
                      background: '#FFF',
                      color: '#734F2F',
                      fontWeight: '600',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Editar</span>
                  </button>

                  <button 
                    onClick={() => handleDelete(prod)}
                    disabled={isDeleting}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #F8B4B4',
                      background: '#FFF',
                      color: '#D9534F',
                      fontWeight: '600',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center'
                    }}
                    title="Eliminar recompensa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Form Modal (Create / Edit) */}
      {isModalOpen && (
        <RewardProductFormModal 
          productToEdit={editingProduct}
          onClose={() => setIsModalOpen(false)}
          onSaved={fetchProducts}
        />
      )}
    </div>
  );
};
