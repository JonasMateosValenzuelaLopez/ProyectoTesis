import { createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useSesion } from './SesionContext';
import { finanzasIniciales, finanzasVacia, bitacoraInicial } from '../data/finanzasMock';
import { roles } from '../tokens';
import { clp, nombreUnidad } from '../utils/formato';

// Estado de finanzas y aprobaciones de cada comunidad. Simula lo que hará la API:
// cada acción modifica los datos y queda registrada en la bitácora de auditoría.
const FinanzasContext = createContext(null);

const nuevoId = (prefijo) => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function reducer(state, { tipo, idRed, ...p }) {
  const d = state.datos[idRed];
  const conDatos = (cambios) => ({ ...state, datos: { ...state.datos, [idRed]: { ...d, ...cambios } } });
  const conLog = (s) => (p.log ? { ...s, bitacora: { ...s.bitacora, [idRed]: [p.log, ...(s.bitacora[idRed] ?? [])] } } : s);

  switch (tipo) {
    case 'marcarPago': {
      const actual = d.cobroUnidades[p.idCobro][p.idUnidad];
      const nuevo = p.pagado ? { estado: 'pagado', marcadoPor: p.actor, marcadoEn: new Date().toISOString() } : { estado: 'pendiente' };
      return conLog(conDatos({
        cobroUnidades: { ...d.cobroUnidades, [p.idCobro]: { ...d.cobroUnidades[p.idCobro], [p.idUnidad]: { ...actual, ...nuevo } } },
      }));
    }
    case 'saldarDeuda': {
      const deudaAnterior = { ...d.deudaAnterior };
      delete deudaAnterior[p.idUnidad];
      return conLog(conDatos({ deudaAnterior }));
    }
    case 'crearCobro': {
      const cobro = { ...p.cobro, id: nuevoId('cb'), periodo: d.periodoActual };
      const unidades = Object.fromEntries(p.idsUnidades.map((id) => [id, { estado: 'pendiente' }]));
      const aviso = { id: nuevoId('n'), tipo: 'cobro', detalle: cobro.concepto, destinatarios: p.idsUnidades.length, fecha: new Date().toISOString() };
      return conLog(conDatos({
        cobros: [...d.cobros, cobro],
        cobroUnidades: { ...d.cobroUnidades, [cobro.id]: unidades },
        notificaciones: [aviso, ...d.notificaciones],
      }));
    }
    case 'recordatorio': {
      const aviso = { id: nuevoId('n'), tipo: 'recordatorio', detalle: 'Recordatorio de morosidad', destinatarios: p.destinatarios, fecha: new Date().toISOString() };
      return conLog(conDatos({ notificaciones: [aviso, ...d.notificaciones] }));
    }
    case 'solicitarExencion':
      return conLog(conDatos({
        exenciones: [{ id: nuevoId('ex'), estado: 'pendiente', fecha: new Date().toISOString().slice(0, 10), ...p.exencion }, ...d.exenciones],
      }));
    case 'resolverExencion': {
      const ex = d.exenciones.find((e) => e.id === p.id);
      const exenciones = d.exenciones.map((e) => (e.id === p.id
        ? { ...e, estado: p.aprobada ? 'aprobada' : 'rechazada', resueltaPor: p.actorNombre, resueltaEn: new Date().toISOString().slice(0, 10) }
        : e));
      // La exención solo cambia el cobro cuando el Presidente la aprueba
      const cobroUnidades = p.aprobada
        ? { ...d.cobroUnidades, [ex.idCobro]: { ...d.cobroUnidades[ex.idCobro], [ex.idUnidad]: { estado: 'exento' } } }
        : d.cobroUnidades;
      return conLog(conDatos({ exenciones, cobroUnidades }));
    }
    case 'resolverEgreso':
      return conLog(conDatos({
        egresos: d.egresos.map((e) => (e.id === p.id ? { ...e, estadoVisado: p.aprobado ? 'aprobado' : 'rechazado', visadoPor: p.actorNombre } : e)),
      }));
    case 'resolverPublicacion':
      return conLog(conDatos({
        porAprobar: d.porAprobar.map((x) => (x.id === p.id ? { ...x, estado: p.aprobada ? 'aprobada' : 'rechazada' } : x)),
      }));
    case 'guardarCategoria': {
      const existe = d.categorias.some((c) => c.id === p.categoria.id);
      const categorias = existe
        ? d.categorias.map((c) => (c.id === p.categoria.id ? { ...c, ...p.categoria } : c))
        : [...d.categorias, { ...p.categoria, id: nuevoId('cat'), activa: true }];
      return conLog(conDatos({ categorias }));
    }
    case 'enviarPublicacion':
      return conLog(conDatos({ porAprobar: [{ ...p.publicacion, id: nuevoId('pa'), fecha: new Date().toISOString().slice(0, 10) }, ...d.porAprobar] }));
    case 'anotar':
      return conLog(state);
    default:
      return state;
  }
}

export function FinanzasProvider({ children }) {
  const { usuario, comunidad, cargo, redes } = useSesion();
  const [state, dispatch] = useReducer(reducer, null, () => {
    const datos = finanzasIniciales();
    const bitacora = { ...bitacoraInicial };
    redes.forEach((r) => { datos[r.id] ??= finanzasVacia(); bitacora[r.id] ??= []; });
    return { datos, bitacora };
  });
  const [aviso, setAviso] = useState(null);

  const idRed = comunidad.id;
  const d = state.datos[idRed];
  const actorNombre = `${usuario.nombre} ${usuario.apellido}`;
  const actor = `${actorNombre} · ${roles[cargo].label}`;
  const unidadPorId = useMemo(() => Object.fromEntries(comunidad.unidades.map((u) => [u.id, u])), [comunidad]);

  const registrar = useCallback((accion, detalle) => ({
    id: nuevoId('b'), fecha: new Date().toISOString(), usuario: actorNombre, cargo, accion, detalle,
  }), [actorNombre, cargo]);

  const cobrosDelPeriodo = useMemo(() => d.cobros.filter((c) => c.periodo === d.periodoActual), [d]);

  // Estado de cada unidad para el plano
  const estadoUnidad = useCallback((idUnidad) => {
    if (d.deudaAnterior[idUnidad] > 0) return 'moroso';
    if (d.exenciones.some((e) => e.idUnidad === idUnidad && e.estado === 'pendiente')) return 'exencion';
    // Una unidad creada después de emitir los cobros del mes todavía no tiene cobro
    if (!cobrosDelPeriodo.some((c) => d.cobroUnidades[c.id]?.[idUnidad])) return null;
    const pendiente = cobrosDelPeriodo.some((c) => d.cobroUnidades[c.id]?.[idUnidad]?.estado === 'pendiente');
    return pendiente ? 'pendiente' : 'pagado';
  }, [d, cobrosDelPeriodo]);

  const valor = useMemo(() => {
    const estadosPlano = Object.fromEntries(comunidad.unidades.map((u) => [u.id, estadoUnidad(u.id)]));
    const pendienteMes = (idUnidad) => cobrosDelPeriodo.reduce(
      (s, c) => s + (d.cobroUnidades[c.id]?.[idUnidad]?.estado === 'pendiente' ? c.montoPorUnidad : 0), 0);
    const morosos = Object.entries(d.deudaAnterior)
      .filter(([, monto]) => monto > 0)
      .map(([idUnidad, monto]) => ({ unidad: unidadPorId[idUnidad], deudaAnterior: monto, pendienteMes: pendienteMes(idUnidad), total: monto + pendienteMes(idUnidad) }))
      .sort((a, b) => b.total - a.total);

    let esperado = 0;
    let recaudado = 0;
    cobrosDelPeriodo.forEach((c) => Object.values(d.cobroUnidades[c.id] ?? {}).forEach((cu) => {
      if (cu.estado === 'exento') return;
      esperado += c.montoPorUnidad;
      if (cu.estado === 'pagado') recaudado += c.montoPorUnidad;
    }));
    const alDia = comunidad.unidades.filter((u) => estadosPlano[u.id] === 'pagado').length;
    const exencionesPendientes = d.exenciones.filter((e) => e.estado === 'pendiente');
    const egresosPorVisar = d.egresos.filter((e) => e.requiereVisado && e.estadoVisado === 'pendiente');
    const publicacionesPorAprobar = d.porAprobar.filter((x) => x.estado === 'pendiente');
    const ultimoRecordatorio = d.notificaciones.find((n) => n.tipo === 'recordatorio');

    const resumen = {
      alDia, totalUnidades: comunidad.unidades.length, esperado, recaudado,
      deudaMorosa: morosos.reduce((s, m) => s + m.deudaAnterior, 0),
      exencionesPendientes: exencionesPendientes.length,
      porAprobar: exencionesPendientes.length + egresosPorVisar.length + publicacionesPorAprobar.length,
    };

    const acciones = {
      marcarPago: (idCobro, idUnidad, pagado) => {
        const cobro = d.cobros.find((c) => c.id === idCobro);
        dispatch({ tipo: 'marcarPago', idRed, idCobro, idUnidad, pagado, actor,
          log: registrar(pagado ? 'Marcó un pago' : 'Desmarcó un pago', `${nombreUnidad(unidadPorId[idUnidad])} · ${cobro.concepto}`) });
      },
      saldarDeuda: (idUnidad) => {
        const monto = d.deudaAnterior[idUnidad];
        dispatch({ tipo: 'saldarDeuda', idRed, idUnidad, log: registrar('Registró pago de deuda anterior', `${nombreUnidad(unidadPorId[idUnidad])} · ${clp(monto)}`) });
        setAviso(`Deuda de ${nombreUnidad(unidadPorId[idUnidad])} registrada como pagada.`);
      },
      crearCobro: (cobro) => {
        const ids = comunidad.unidades.map((u) => u.id);
        dispatch({ tipo: 'crearCobro', idRed, cobro, idsUnidades: ids, log: registrar('Creó un cobro', `${cobro.concepto} · ${clp(cobro.montoPorUnidad)} por unidad`) });
        setAviso(`Cobro creado. Se envió un correo a ${ids.length} unidades.`);
      },
      enviarRecordatorio: () => {
        dispatch({ tipo: 'recordatorio', idRed, destinatarios: morosos.length, log: registrar('Envió recordatorio de morosidad', `${morosos.length} unidades`) });
        setAviso(`Recordatorio enviado a ${morosos.length} unidades con deuda.`);
      },
      solicitarExencion: (exencion) => {
        dispatch({ tipo: 'solicitarExencion', idRed, exencion: { ...exencion, solicitadaPor: actorNombre },
          log: registrar('Solicitó una exención', `${nombreUnidad(unidadPorId[exencion.idUnidad])} · ${exencion.motivo}`) });
        setAviso('Exención enviada a Presidencia. El cobro sigue vigente hasta que se apruebe.');
      },
      resolverExencion: (id, aprobada) => {
        const ex = d.exenciones.find((e) => e.id === id);
        dispatch({ tipo: 'resolverExencion', idRed, id, aprobada, actorNombre,
          log: registrar(aprobada ? 'Aprobó una exención' : 'Rechazó una exención', nombreUnidad(unidadPorId[ex.idUnidad])) });
        setAviso(aprobada ? 'Exención aprobada.' : 'Exención rechazada.');
      },
      resolverEgreso: (id, aprobado) => {
        const eg = d.egresos.find((e) => e.id === id);
        dispatch({ tipo: 'resolverEgreso', idRed, id, aprobado, actorNombre,
          log: registrar(aprobado ? 'Visó un gasto extraordinario' : 'Rechazó un gasto extraordinario', `${eg.descripcion} · ${clp(eg.monto)}`) });
        setAviso(aprobado ? 'Gasto visado.' : 'Gasto rechazado.');
      },
      resolverPublicacion: (id, aprobada) => {
        const x = d.porAprobar.find((e) => e.id === id);
        dispatch({ tipo: 'resolverPublicacion', idRed, id, aprobada,
          log: registrar(aprobada ? `Aprobó ${x.tipo.toLowerCase()}` : `Rechazó ${x.tipo.toLowerCase()}`, x.titulo) });
        setAviso(aprobada ? `${x.tipo} aprobado y publicado en el muro.` : `${x.tipo} devuelto a Secretaría.`);
      },
      guardarCategoria: (categoria) => {
        dispatch({ tipo: 'guardarCategoria', idRed, categoria, log: registrar('Modificó categorías de gasto', categoria.nombre) });
      },
      // Comunicados y normas oficiales: los publica directo el Presidente; los demás los envían a su aprobación
      enviarPublicacion: ({ tipo, titulo, texto }) => {
        const directo = cargo === 'presidente';
        dispatch({ tipo: 'enviarPublicacion', idRed, publicacion: { tipo, titulo, texto, autor: roles[cargo].label, estado: directo ? 'aprobada' : 'pendiente' },
          log: registrar(directo ? `Publicó ${tipo.toLowerCase()}` : `Envió ${tipo.toLowerCase()} a aprobación`, titulo) });
        setAviso(directo ? `${tipo} publicado en el muro.` : `${tipo} enviado al Presidente para su aprobación.`);
      },
      // Para que otras áreas (Secretaría, Administración) dejen su acción en la bitácora
      anotar: (accion, detalle, mensaje) => {
        dispatch({ tipo: 'anotar', idRed, log: registrar(accion, detalle) });
        if (mensaje) setAviso(mensaje);
      },
    };

    return {
      datos: d, cobrosDelPeriodo, estadosPlano, estadoUnidad, morosos, resumen, unidadPorId,
      exencionesPendientes, egresosPorVisar, publicacionesPorAprobar, ultimoRecordatorio,
      bitacora: state.bitacora[idRed] ?? [], acciones,
    };
  }, [comunidad, d, state.bitacora, idRed, cobrosDelPeriodo, estadoUnidad, unidadPorId, actor, actorNombre, registrar, cargo]);

  return (
    <FinanzasContext.Provider value={valor}>
      {children}
      <Snackbar open={Boolean(aviso)} autoHideDuration={4000} onClose={() => setAviso(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setAviso(null)} severity="success" variant="filled" sx={{ width: '100%' }}>{aviso}</Alert>
      </Snackbar>
    </FinanzasContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFinanzas() {
  return useContext(FinanzasContext);
}
