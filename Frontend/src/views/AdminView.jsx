import React, { useState, useEffect } from 'react';
import { Search, UserPlus, QrCode, Edit, Trash2, Award, RefreshCw, Users, Coffee } from 'lucide-react';
import { userService } from '../services/api';
import { CustomerModal } from '../components/CustomerModal';
import { CustomerForm } from '../components/CustomerForm';

export const AdminView = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // For QR/Wallet Modal
  const [formUser, setFormUser] = useState(null); // For edit
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
      console.error("Error loading users:", err);
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
    <div>
      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ background: '#F1E9E0', padding: '0.85rem', borderRadius: '12px', color: '#2C1810' }}>
            <Users size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.82rem', color: '#786C65', fontWeight: 600, display: 'block' }}>TOTAL CLIENTES</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2C1810' }}>{total}</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ background: '#FEF6E4', padding: '0.85rem', borderRadius: '12px', color: '#B47B16' }}>
            <Award size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.82rem', color: '#786C65', fontWeight: 600, display: 'block' }}>SISTEMA DE LEALTAD</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2C1810' }}>Google Wallet & QR</span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o código QR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            <span>Actualizar</span>
          </button>

          <button
            className="btn btn-accent"
            onClick={() => {
              setFormUser(null);
              setShowFormModal(true);
            }}
          >
            <UserPlus size={18} />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Código QR Lealtad</th>
              <th>Puntos Actuales</th>
              <th>Histórico Ganado</th>
              <th style={{ textAlign: 'right' }}>Acciones & Pase Digital</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#786C65' }}>
                  Cargando clientes...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#786C65' }}>
                  No se encontraron clientes registrados.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#2C1810' }}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#786C65' }}>{user.email}</div>
                  </td>
                  <td>{user.phone || 'N/A'}</td>
                  <td>
                    <span className="badge-code">{user.loyalty_code}</span>
                  </td>
                  <td>
                    <span className="badge-points">
                      <Award size={14} />
                      {user.current_points} Pts
                    </span>
                  </td>
                  <td>{user.total_points_earned} Pts</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-accent"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                        title="Ver Código QR y Pase de Google Wallet"
                        onClick={() => setSelectedUser(user)}
                      >
                        <QrCode size={16} />
                        <span>QR & Wallet</span>
                      </button>

                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.45rem 0.65rem' }}
                        title="Editar Datos"
                        onClick={() => {
                          setFormUser(user);
                          setShowFormModal(true);
                        }}
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.45rem 0.65rem' }}
                        title="Desactivar Cliente"
                        onClick={() => handleDeactivate(user)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer QR & Google Wallet Modal */}
      {selectedUser && (
        <CustomerModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {/* Customer Form Modal */}
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
    </div>
  );
};
