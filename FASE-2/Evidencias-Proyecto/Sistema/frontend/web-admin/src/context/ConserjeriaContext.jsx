import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { useSesion } from './SesionContext';
import { useFinanzas } from './FinanzasContext';
import { conserjeriaInicial, conserjeriaVacia, diaISO, MOVIMIENTOS_SIMULADOS } from '../data/conserjeriaMock';
import { residentes } from '../data/finanzasMock';
import { nombreUnidad } from '../utils/formato';

// Estado de portería de cada comunidad: invitaciones QR, registro de accesos, vehículos y reservas.
// Con el módulo de conserjería activo, simula gente entrando y saliendo para el monitor en vivo;
// con la API esto llegará por WebSocket en menos de un segundo.
const ConserjeriaContext = createContext(null);

const nuevoId = (prefijo) => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const CADA_MS = 12000;

function reducer(state, { tipo, idRed, ...p }) {
  const d = state[idRed];
  const con = (cambios) => ({ ...state, [idRed]: { ...d, ...cambios } });
  const acceso = (a) => ({ id: nuevoId('a'), fecha: new Date().toISOString(), patente: '', ...a });

  switch (tipo) {
    case 'ingresoInvitacion': {
      const inv = d.invitaciones.find((i) => i.id === p.id);
      return con({
        invitaciones: d.invitaciones.map((i) => (i.id === p.id ? { ...i, estado: 'adentro' } : i)),
        accesos: [acceso({ sentido: 'ingreso', persona: inv.visitante, categoria: inv.tipo === 'visita' ? 'visita' : 'proveedor', idUnidad: inv.idUnidad, metodo: p.metodo, patente: inv.patente }), ...d.accesos],
      });
    }
    case 'salidaInvitacion': {
      const inv = d.invitaciones.find((i) => i.id === p.id);
      return con({
        invitaciones: d.invitaciones.map((i) => (i.id === p.id ? { ...i, estado: 'salio' } : i)),
        accesos: [acceso({ sentido: 'salida', persona: inv.visitante, categoria: inv.tipo === 'visita' ? 'visita' : 'proveedor', idUnidad: inv.idUnidad, metodo: 'Manual', patente: inv.patente }), ...d.accesos],
      });
    }
    case 'registrarAcceso':
      return con({ accesos: [acceso(p.acceso), ...d.accesos].slice(0, 200) });
    case 'cambiarReserva':
      return con({ reservas: d.reservas.map((r) => (r.id === p.id ? { ...r, ...p.cambios } : r)) });
    default:
      return state;
  }
}

export function ConserjeriaProvider({ children }) {
  const { comunidad, redes } = useSesion();
  const { acciones: finanzas } = useFinanzas();
  const [state, dispatch] = useReducer(reducer, null, () => {
    const inicial = conserjeriaInicial();
    redes.forEach((r) => { inicial[r.id] ??= conserjeriaVacia(); });
    return inicial;
  });
  const idRed = comunidad.id;
  const d = state[idRed];
  const enVivo = comunidad.modulos.includes('conserjeria');

  // Monitor en vivo simulado: cada pocos segundos alguien entra o sale
  useEffect(() => {
    if (!enVivo) return undefined;
    let i = 0;
    const timer = setInterval(() => {
      const mov = MOVIMIENTOS_SIMULADOS[i % MOVIMIENTOS_SIMULADOS.length];
      const unidad = comunidad.unidades[(i * 7 + 3) % comunidad.unidades.length];
      dispatch({
        tipo: 'registrarAcceso', idRed,
        acceso: { sentido: i % 3 === 1 ? 'salida' : 'ingreso', persona: mov.persona ?? residentes[unidad.id] ?? 'Residente', categoria: mov.categoria, idUnidad: unidad.id, metodo: mov.metodo },
      });
      i += 1;
    }, CADA_MS);
    return () => clearInterval(timer);
  }, [enVivo, idRed, comunidad.unidades]);

  const valor = useMemo(() => {
    const hoy = diaISO();
    const unidadPorId = Object.fromEntries(comunidad.unidades.map((u) => [u.id, u]));
    const esDeHoy = (iso) => diaISO(new Date(iso)) === hoy;
    const visitasHoy = d.invitaciones
      .filter((i) => esDeHoy(i.desde) || esDeHoy(i.hasta) || i.estado === 'adentro')
      .sort((a, b) => a.desde.localeCompare(b.desde));

    const acciones = {
      ingresoInvitacion: (inv, metodo = 'QR') => {
        dispatch({ tipo: 'ingresoInvitacion', idRed, id: inv.id, metodo });
        finanzas.anotar('Registró un ingreso', `${inv.visitante} a ${nombreUnidad(unidadPorId[inv.idUnidad])} (${metodo})`,
          `${inv.visitante} ingresó. Se avisó a ${nombreUnidad(unidadPorId[inv.idUnidad])}.`);
      },
      salidaInvitacion: (inv) => {
        dispatch({ tipo: 'salidaInvitacion', idRed, id: inv.id });
        finanzas.anotar('Registró una salida', `${inv.visitante} de ${nombreUnidad(unidadPorId[inv.idUnidad])}`, `Salida de ${inv.visitante} registrada.`);
      },
      ingresoSinInvitacion: (acceso) => {
        dispatch({ tipo: 'registrarAcceso', idRed, acceso: { ...acceso, sentido: 'ingreso', metodo: 'Manual' } });
        finanzas.anotar('Registró un ingreso sin invitación', `${acceso.persona} a ${nombreUnidad(unidadPorId[acceso.idUnidad])}`,
          `Ingreso registrado. Se avisó a ${nombreUnidad(unidadPorId[acceso.idUnidad])}.`);
      },
      entregarEspacio: (r) => {
        dispatch({ tipo: 'cambiarReserva', idRed, id: r.id, cambios: { estado: 'entregado' } });
        finanzas.anotar('Entregó un espacio común', `${r.espacio} a ${nombreUnidad(unidadPorId[r.idUnidad])}`, `${r.espacio} entregado a ${nombreUnidad(unidadPorId[r.idUnidad])}.`);
      },
      recibirEspacio: (r, observacion) => {
        dispatch({ tipo: 'cambiarReserva', idRed, id: r.id, cambios: { estado: 'devuelto', observacion } });
        finanzas.anotar('Recibió un espacio común', `${r.espacio} de ${nombreUnidad(unidadPorId[r.idUnidad])} · ${observacion}`, `${r.espacio} recibido.`);
      },
      cancelarReserva: (r, motivo) => {
        dispatch({ tipo: 'cambiarReserva', idRed, id: r.id, cambios: { estado: 'cancelada', observacion: motivo } });
        finanzas.anotar('Canceló una reserva', `${r.espacio} de ${nombreUnidad(unidadPorId[r.idUnidad])} · ${motivo}`, `Reserva cancelada. Se avisó a ${nombreUnidad(unidadPorId[r.idUnidad])}.`);
      },
    };

    return {
      ...d, hoy, enVivo, unidadPorId, visitasHoy,
      esperadas: visitasHoy.filter((i) => i.estado === 'esperada'),
      adentro: d.invitaciones.filter((i) => i.estado === 'adentro'),
      reservasHoy: d.reservas.filter((r) => r.fecha === hoy && r.estado !== 'cancelada'),
      acciones,
    };
  }, [d, idRed, comunidad, enVivo, finanzas]);

  return <ConserjeriaContext.Provider value={valor}>{children}</ConserjeriaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConserjeria() {
  return useContext(ConserjeriaContext);
}
