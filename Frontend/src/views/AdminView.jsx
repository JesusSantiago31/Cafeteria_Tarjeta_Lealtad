import React, { useState, useEffect } from 'react';
import { UserPlus, QrCode, Edit, Trash2, Award, RefreshCw, Users, ShieldAlert, Gift } from 'lucide-react';
import { userService } from '../services/api';
import { CustomerModal } from '../components/CustomerModal';
import { CustomerForm } from '../components/CustomerForm';
import { AdminRewardsView } from './admin/AdminRewardsView';

export const AdminView = () => {
  const [activeTab, setActiveTab] = useState(
    window.location.pathname.includes('recompensas') ? 'recompensas' : 'clientes'
  );
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formUser, setFormUser] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getUsers({
        search: search.trim() || undefined,
        limit: 50,
        skip: 0
      });
      setUsers(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error("Error al cargar clientes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDeactivate = async (user) => {
    if (window.confirm(`¿Estás seguro de desactivar a ${user.first_name} ${user.last_name}?`)) {
      try {
        await userService.deleteUser(user.id);
        fetchUsers();
      } catch (err) {
        alert("No se pudo desactivar al cliente.");
      }
    }
  };

  return (
    <div className="container" style={{ maxWidth: activeTab === 'recompensas' ? '1100px' : '750px', transition: 'max-width 0.3s ease' }}>
      {/* Sub-navegación Pestañas Administrativas */}
      <div style={{
        display: 'flex',
        justify: 'center',
        gap: '8px',
        marginBottom: '20px',
        background: '#FAF7F2',
        padding: '6px',
        borderRadius: '14px',
        border: '1px solid #E8DFD1'
      }}>
        <button
          onClick={() => {
            setActiveTab('clientes');
            window.history.pushState({}, '', '/admin');
          }}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'clientes' ? '#734F2F' : 'transparent',
            color: activeTab === 'clientes' ? '#FFF' : '#734F2F',
            fontWeight: '700',
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'clientes' ? '0 4px 10px rgba(115, 79, 47, 0.25)' : 'none'
          }}
        >
          <Users size={18} />
          <span>Directorio de Clientes</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('recompensas');
            window.history.pushState({}, '', '/admin/recompensas');
          }}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'recompensas' ? '#788C5A' : 'transparent',
            color: activeTab === 'recompensas' ? '#FFF' : '#734F2F',
            fontWeight: '700',
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'recompensas' ? '0 4px 10px rgba(120, 140, 90, 0.25)' : 'none'
          }}
        >
          <Gift size={18} />
          <span>Catálogo de Recompensas</span>
        </button>
      </div>

      {activeTab === 'recompensas' ? (
        <AdminRewardsView />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldAlert size={22} color="#788C5A" />
            <h2 style={{ margin: 0 }}>Gestión de Clientes (Admin)</h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#734F2F', textAlign: 'center', marginBottom: '16px', opacity: 0.85 }}>
            Módulo administrativo protegido para el control del directorio, alta de clientes y auditoría.
          </p>

      {/* Tarjetas de Métricas Breves */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div className="card-client" style={{ margin: 0, padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={24} color="#788C5A" />
          <div>
            <span style={{ fontSize: '0.7rem', color: '#734F2F', opacity: 0.8, fontWeight: 700, display: 'block' }}>TOTAL CLIENTES</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#734F2F' }}>{total}</span>
          </div>
        </div>

        {/*<div className="card-client" style={{ margin: 0, padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Award size={24} color="#E2A03F" />
          <div>
            <span style={{ fontSize: '0.7rem', color: '#734F2F', opacity: 0.8, fontWeight: 700, display: 'block' }}>FIDELIZACIÓN</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#788C5A' }}>Activo 24/7</span>
          </div>
        </div>
        /*/}
      </div>

      {/* Controles de Búsqueda y Botón de Alta */}
      <div className="form-group">
        <label>Buscar en el Directorio</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Por nombre o número de teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={fetchUsers} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          <span>Actualizar</span>
        </button>

        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => {
            setFormUser(null);
            setShowFormModal(true);
          }}
        >
          <UserPlus size={16} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Tabla de Clientes Responsiva */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Puntos</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#734F2F' }}>
                  Cargando clientes...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#734F2F' }}>
                  No se encontraron clientes registrados.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: '#734F2F' }}>
                      {user.first_name} {user.last_name}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#734F2F' }}>{user.phone || 'Sin teléfono'}</div>
                  </td>
                  <td>
                    <span className="badge badge-success" style={{ background: '#CFD989', color: '#734F2F' }}>
                      {user.current_points} pts
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem' }}
                        title="Ver Pase Digital Google Wallet"
                        onClick={() => setSelectedUser(user)}
                      >
                        <QrCode size={14} />
                      </button>

                      <button
                        className="btn btn-outline"
                        style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem' }}
                        title="Editar Datos"
                        onClick={() => {
                          setFormUser(user);
                          setShowFormModal(true);
                        }}
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        className="btn btn-danger"
                        style={{ width: 'auto', padding: '6px 10px', fontSize: '0.75rem' }}
                        title="Desactivar"
                        onClick={() => handleDeactivate(user)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Pase Digital QR */}
      {selectedUser && (
        <CustomerModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {/* Modal de Formulario de Cliente */}
      {showFormModal && (
        <CustomerForm
          customerToEdit={formUser}
          onClose={() => setShowFormModal(false)}
          onSaved={() => {
            setShowFormModal(false);
            fetchUsers();
          }}
        />
      )}
        </>
      )}
    </div>
  );
};
