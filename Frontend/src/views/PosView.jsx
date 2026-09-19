import React, { useState, useEffect, useRef } from 'react';
import { Search, Camera, AlertCircle, PlusCircle, Gift, X, QrCode, ShieldCheck, Sparkles, CheckCircle2, Video } from 'lucide-react';
import { userService, productService } from '../services/api';
import { CustomerModal } from '../components/CustomerModal';
import jsQR from 'jsqr';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const PosView = () => {
  const [scanCode, setScanCode] = useState('');
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // Live Camera Scanner Modal State
  const [showLiveScanner, setShowLiveScanner] = useState(false);

  // Redemption Ticket Confirmation Modal
  const [redemptionModalData, setRedemptionModalData] = useState(null);
  const [confirmingRedemption, setConfirmingRedemption] = useState(false);

  // Modalidades de Acumulación
  const [modalidad, setModalidad] = useState('monto');
  const [valorAcumular, setValorAcumular] = useState('0.00');
  const [puntosCalculados, setPuntosCalculados] = useState(0);
  const [procesandoPuntos, setProcesandoPuntos] = useState(false);

  // Catálogo de Canje
  const [showCanje, setShowCanje] = useState(false);
  const [productos, setProductos] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const val = parseFloat(valorAcumular) || 0;
    if (modalidad === 'monto') {
      setPuntosCalculados(Math.floor(val / 10));
    } else if (modalidad === 'directo') {
      setPuntosCalculados(parseInt(val) || 0);
    } else if (modalidad === 'visita') {
      setPuntosCalculados(parseInt(val) || 0);
    }
  }, [modalidad, valorAcumular]);

  // Manejador del escáner con cámara en vivo
  useEffect(() => {
    let scanner = null;
    if (showLiveScanner) {
      setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            "reader-live-camera",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );

          scanner.render((decodedText) => {
            const text = decodedText.trim();
            setScanCode(text);
            setShowLiveScanner(false);
            if (scanner) {
              scanner.clear().catch(console.error);
            }
            processScannedCode(text);
          }, (scanErr) => {
            // escaneo en progreso
          });
        } catch (err) {
          console.error("Error al iniciar cámara:", err);
        }
      }, 100);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [showLiveScanner]);

  const processScannedCode = async (queryText) => {
    const query = queryText.trim();
    if (!query) return;

    setLoading(true);
    setError('');
    setCustomer(null);

    // Detección de Ticket de Canje de Recompensa (REDEMP:phone:productId)
    if (query.startsWith('REDEMP:')) {
      const parts = query.split(':');
      const targetPhone = parts[1];
      const targetProductId = parts[2];

      try {
        const usersData = await userService.getUsers({ search: targetPhone, limit: 1 });
        const targetCustomer = usersData?.items?.[0] || null;

        if (!targetCustomer) {
          setError(`No se encontró al cliente asociado al ticket de canje (${targetPhone}).`);
          setLoading(false);
          return;
        }

        const productsData = await productService.getProducts();
        const targetProduct = productsData.find(p => String(p.id_prod) === String(targetProductId));

        if (!targetProduct) {
          setError("No se encontró el producto especificado en el ticket de canje.");
          setLoading(false);
          return;
        }

        setCustomer(targetCustomer);
        setRedemptionModalData({
          customer: targetCustomer,
          product: targetProduct
        });
        setLoading(false);
        return;
      } catch (err) {
        console.error("Error al procesar ticket de canje:", err);
        setError("Error al procesar el código del ticket de canje.");
        setLoading(false);
        return;
      }
    }

    try {
      const codeClean = query.replace(/^QR-/, '');
      let data = null;
      try {
        data = await userService.getUserByLoyaltyCode(codeClean);
      } catch (err1) {
        const searchRes = await userService.getUsers({ search: query, limit: 1 });
        if (searchRes?.items?.length > 0) {
          data = searchRes.items[0];
        }
      }

      if (data) {
        setCustomer(data);
      } else {
        setError(`No se encontró ningún cliente registrado con el código "${query}".`);
      }
    } catch (err) {
      console.error("Error al buscar cliente:", err);
      setError(`No se encontró ningún cliente registrado con el código "${query}".`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    processScannedCode(scanCode);
  };

  // DECODIFICACIÓN REAL DE CÓDIGO QR DESDE FOTO O ARCHIVO SELECCIONADO
  const handleQrFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);

          // Decodificar el código QR usando jsQR
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            const decodedText = code.data.trim();
            setScanCode(decodedText);
            processScannedCode(decodedText);
          } else {
            setLoading(false);
            setError("No se pudo detectar un código QR legible en la imagen. Por favor asegúrate de que la foto tenga buena luz o usa la cámara en vivo.");
          }
        } catch (err) {
          console.error("Error procesando imagen QR:", err);
          setLoading(false);
          setError("Ocurrió un error al analizar el código QR de la imagen.");
        }
      };
      img.onerror = () => {
        setLoading(false);
        setError("Error al cargar el archivo de imagen seleccionado.");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmOrderRedemption = async () => {
    if (!redemptionModalData) return;
    const { customer: c, product: p } = redemptionModalData;

    if (c.current_points < p.puntos_requeridos) {
      alert(`Puntos insuficientes. El cliente tiene ${c.current_points} pts y se requieren ${p.puntos_requeridos} pts.`);
      return;
    }

    setConfirmingRedemption(true);
    try {
      const res = await productService.redeemProduct(c.id, p.id_prod);
      
      // Actualizar puntos del cliente
      const newPoints = res.remaining_points !== undefined ? res.remaining_points : (c.current_points - p.puntos_requeridos);
      const updatedCustomer = {
        ...c,
        current_points: newPoints
      };
      
      setCustomer(updatedCustomer);
      setRedemptionModalData(null);
      alert(`¡Pedido Confirmado! Se ha entregado "${p.producto}" y se descontaron ${p.puntos_requeridos} pts. Nuevo saldo: ${newPoints} pts.`);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Error al confirmar la entrega de la recompensa.";
      alert(msg);
    } finally {
      setConfirmingRedemption(false);
    }
  };

  const seleccionarModalidad = (mod) => {
    setModalidad(mod);
    if (mod === 'monto') setValorAcumular('0.00');
    else if (mod === 'directo') setValorAcumular('10');
    else if (mod === 'visita') setValorAcumular('5');
  };

  const handleAcumularPuntos = async () => {
    if (!customer) return;
    if (puntosCalculados <= 0) {
      alert("El valor ingresado resulta en 0 puntos a sumar.");
      return;
    }

    setProcesandoPuntos(true);
    try {
      const nuevosPuntosActuales = (customer.current_points || 0) + puntosCalculados;
      const nuevosTotalEarned = (customer.total_points_earned || 0) + puntosCalculados;

      const updated = await userService.updateUser(customer.id, {
        current_points: nuevosPuntosActuales,
        total_points_earned: nuevosTotalEarned,
      });

      setCustomer(updated);
      alert(`¡Puntos acumulados con éxito! +${puntosCalculados} pts. Nuevo Saldo: ${updated.current_points} pts.`);
      setValorAcumular('0.00');
    } catch (err) {
      alert("Error al acumular puntos: " + err.message);
    } finally {
      setProcesandoPuntos(false);
    }
  };

  const handleCanjearProducto = async (producto) => {
    if (!customer) return;
    if (customer.current_points < producto.puntos) {
      alert(`Puntos insuficientes. Se requieren ${producto.puntos} pts y el cliente tiene ${customer.current_points} pts.`);
      return;
    }

    if (!window.confirm(`¿Confirmar canje de "${producto.descripcion}" por ${producto.puntos} pts?`)) return;

    try {
      const nuevosPuntosActuales = customer.current_points - producto.puntos;
      const nuevosTotalSpent = (customer.total_points_spent || 0) + producto.puntos;

      const updated = await userService.updateUser(customer.id, {
        current_points: nuevosPuntosActuales,
        total_points_spent: nuevosTotalSpent
      });

      setCustomer(updated);
      setProductos(prev => prev.map(p => p.id === producto.id ? { ...p, disponibles: Math.max(0, p.disponibles - 1) } : p));
      alert(`¡Canje realizado con éxito! Nuevo saldo: ${updated.current_points} pts.`);
    } catch (err) {
      alert("Error al procesar canje: " + err.message);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
        <QrCode size={24} color="#788C5A" />
        <h2 style={{ margin: 0 }}>Busqueda de Clientes</h2>
      </div>
      <p style={{ fontSize: '0.8rem', color: '#734F2F', textAlign: 'center', marginBottom: '16px', opacity: 0.85 }}>
        Escanee el QR o ingrese el número de celular para buscar al cliente.
      </p>

      {/* Buscador y Escáner */}
      <form onSubmit={handleSearch} className="form-group">
        <label htmlFor="buscarTelefono">Ingresar número de celular</label>
        <input
          type="tel"
          id="buscarTelefono"
          placeholder="Ejemplo: 5512345678"
          value={scanCode}
          onChange={(e) => setScanCode(e.target.value)}
        />

        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Search size={18} />
          <span>{loading ? 'Buscando...' : 'Buscar Cliente'}</span>
        </button>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            className="btn"
            style={{ flex: 1, background: '#788C5A', color: 'white', fontSize: '0.85rem' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={16} />
            <span>Seleccionar Foto QR</span>
          </button>

          <button
            type="button"
            className="btn"
            style={{ flex: 1, background: '#734F2F', color: 'white', fontSize: '0.85rem' }}
            onClick={() => setShowLiveScanner(true)}
          >
            <Video size={16} />
            <span>Cámara en Vivo</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          id="qr-input-file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleQrFileSelected}
        />
      </form>

      {/* Alerta de Error */}
      {error && (
        <div className="card-client" style={{ background: '#FFE4E6', borderColor: '#FDA4AF', color: '#9F1239', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Tarjeta Información del Cliente */}
      {customer && (
        <div id="infoCliente" className="card-client">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span id="badgeEstado" className="badge badge-success">
              <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Cliente Encontrado
            </span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#734F2F', opacity: 0.7, fontWeight: 700 }}>SALDO ACTUAL</span>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#788C5A' }}>
                <span id="lblPuntos">{customer.current_points}</span> pts
              </div>
            </div>
          </div>

          <h3 id="lblNombre" style={{ textAlign: 'left', marginTop: '10px', fontSize: '18px' }}>
            {customer.first_name} {customer.last_name}
          </h3>
          <p style={{ fontSize: '13px', color: '#734F2F', opacity: 0.8, marginTop: '4px' }}>
            Tel: <span id="lblTelefono" className="badge-code">{customer.phone}</span>
          </p>

          <hr style={{ border: 0, borderTop: '1.5px solid #CFD989', margin: '15px 0' }} />

          <label>MODALIDAD DE ACUMULACIÓN</label>
          <div className="tab-group">
            <div
              className={`tab-btn ${modalidad === 'monto' ? 'active' : ''}`}
              id="tabMonto"
              onClick={() => seleccionarModalidad('monto')}
            >
              $ Por Monto ($)
            </div>
            <div
              className={`tab-btn ${modalidad === 'directo' ? 'active' : ''}`}
              id="tabDirecto"
              onClick={() => seleccionarModalidad('directo')}
            >
              ★ Puntos Directos
            </div>
            <div
              className={`tab-btn ${modalidad === 'visita' ? 'active' : ''}`}
              id="tabVisita"
              onClick={() => seleccionarModalidad('visita')}
            >
              📍 Por Visita
            </div>
          </div>

          <div className="form-group">
            <label id="lblInputMonto">
              {modalidad === 'monto' ? 'Monto consumido ($)' : modalidad === 'visita' ? 'Puntos fijos por visita' : 'Cantidad de puntos directos'}
            </label>
            <input
              type="number"
              id="valorAcumular"
              value={valorAcumular}
              onChange={(e) => setValorAcumular(e.target.value)}
            />
          </div>

          <p id="reglaTexto" style={{ fontSize: '12px', textAlign: 'center', color: '#734F2F', marginBottom: '12px' }}>
            {modalidad === 'monto' ? 'Regla: $10 MXN = 1 Punto' : 'Acumulación de Puntos'} | Puntos a sumar: <b id="lblPuntosCalculados" style={{ color: '#788C5A' }}>{puntosCalculados} pts</b>
          </p>

          <button className="btn btn-primary" onClick={handleAcumularPuntos} disabled={procesandoPuntos}>
            <PlusCircle size={18} />
            <span>{procesandoPuntos ? 'Procesando...' : 'Acumular Puntos'}</span>
          </button>

          <button className="btn btn-accent"  style={{ marginTop: '12px' }}  onClick={() => setShowCanje(true)}>
            <Gift size={18} />
            <span>Canjear Puntos</span>
          </button>

         
        </div>
      )}

      {/* Modal / Sección de Canje de Productos */}
      {showCanje && customer && (
        <div id="seccionCanje" style={{ marginTop: '20px', borderTop: '2px solid #CFD989', paddingTop: '15px' }}>
          <h3>Catálogo de Canje</h3>
          <div id="listaProductos" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {productos.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#FAFDF7', border: '1px solid #CFD989', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#734F2F' }}>{p.descripcion}</div>
                  <div style={{ fontSize: '12px', color: '#788C5A', fontWeight: 'bold' }}>{p.puntos} pts | Disponibles: {p.disponibles}</div>
                </div>
                <button className="btn btn-primary" style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }} onClick={() => handleCanjearProducto(p)}>
                  Canjear
                </button>
              </div>
            ))}
          </div>
          <button className="btn btn-outline" style={{ marginTop: '10px' }} onClick={() => setShowCanje(false)}>
            Cancelar
          </button>
        </div>
      )}

      {/* Modal de Pase Digital QR */}
      {showQrModal && customer && (
        <CustomerModal user={customer} onClose={() => setShowQrModal(false)} />
      )}

      {/* MODAL DE CONFIRMACIÓN DE PEDIDO Y ENTREGAR RECOMPENSA EN CAJA */}
      {redemptionModalData && (
        <div className="modal-overlay" onClick={() => setRedemptionModalData(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '16px', borderRadius: '18px 18px 0 0', position: 'relative' }}>
              <Gift size={32} color="var(--secondary)" style={{ margin: '0 auto 6px' }} />
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>Confirmación de Pedido de Canje</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--secondary)', margin: '4px 0 0' }}>
                Revisar detalles antes de autorizar el descuento de puntos
              </p>
              <button 
                onClick={() => setRedemptionModalData(null)}
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', textAlign: 'left' }}>
              {/* DETALLES DEL CLIENTE */}
              <div style={{ background: '#FAFDF7', border: '1.5px solid var(--secondary)', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Datos del Cliente:
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                  {redemptionModalData.customer.first_name} {redemptionModalData.customer.last_name}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Teléfono: <strong>{redemptionModalData.customer.phone}</strong>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                  Saldo Actual de Puntos: {redemptionModalData.customer.current_points} PTS
                </div>
              </div>

              {/* DETALLES DEL PRODUCTO */}
              <div style={{ background: '#FFFDF9', border: '2px solid var(--primary)', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Producto a Entregar al Cliente:
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                  <img 
                    src={redemptionModalData.product.imagen_url || '/products/cappuccino.png'} 
                    alt={redemptionModalData.product.producto}
                    style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--secondary)' }}
                  />
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text)' }}>
                      {redemptionModalData.product.producto}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#E11D48' }}>
                      Costo: -{redemptionModalData.product.puntos_requeridos} PTS
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Valor comercial: <span style={{ textDecoration: 'line-through' }}>${Number(redemptionModalData.product.precio).toFixed(2)} MXN</span> (¡GRATIS para cliente!)
                    </div>
                  </div>
                </div>
              </div>

              {/* VALIDACIÓN DE SALDO */}
              {redemptionModalData.customer.current_points < redemptionModalData.product.puntos_requeridos ? (
                <div style={{ background: '#FFE4E6', color: '#9F1239', padding: '10px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
                  ⚠️ El cliente no cuenta con suficientes puntos. (Saldo: {redemptionModalData.customer.current_points} PTS | Requiere: {redemptionModalData.product.puntos_requeridos} PTS)
                </div>
              ) : (
                <div style={{ background: '#D4EDDA', color: '#155724', padding: '10px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
                  ✅ Saldo suficiente. Nuevo saldo tras canje: <strong>{redemptionModalData.customer.current_points - redemptionModalData.product.puntos_requeridos} PTS</strong>.
                </div>
              )}

              {/* BOTONES DE ACCIÓN */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                  onClick={() => setRedemptionModalData(null)}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={confirmingRedemption || redemptionModalData.customer.current_points < redemptionModalData.product.puntos_requeridos}
                  onClick={handleConfirmOrderRedemption}
                >
                  <CheckCircle2 size={18} />
                  <span>{confirmingRedemption ? 'Confirmando...' : 'Confirmar Pedido'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CÁMARA EN VIVO HTML5 QR SCANNER */}
      {showLiveScanner && (
        <div className="modal-overlay" onClick={() => setShowLiveScanner(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '14px 18px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={22} color="var(--secondary)" />
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Escáner de Cámara en Vivo</h3>
              </div>
              <button 
                onClick={() => setShowLiveScanner(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Apunta la cámara al código QR del cliente o del ticket de canje.
              </p>
              
              <div id="reader-live-camera" style={{ width: '100%', minHeight: '280px', borderRadius: '12px', overflow: 'hidden' }}></div>

              <button 
                className="btn btn-outline"
                style={{ marginTop: '14px' }}
                onClick={() => setShowLiveScanner(false)}
              >
                Cerrar Escáner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
