import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { useSesion } from './SesionContext';
import { useFinanzas } from './FinanzasContext';
import { useAdmin } from './AdminContext';
import { conserjeriaInicial, conserjeriaVacia, diaISO, fechaHoraLocal } from '../data/conserjeriaMock';
import { residentes } from '../data/finanzasMock';
import { nombreUnidad } from '../utils/formato';
import { tieneModulo } from '../config/modulos';

// Estado de portería de cada comunidad con las filas de la base: `visitantes`, `invitaciones`,
// `registro_accesos`, `vehiculos` y `reservas`. El monitor muestra los ingresos y salidas de
// `registro_accesos`; con la API llegarán por WebSocket en menos de un segundo.
const ConserjeriaContext = createContext(null);

// En la demo, si nadie resuelve antes, el residente acepta desde la app a los 30 segundos
const RESPUESTA_APP_MS = 30000;
const siguienteId = (filas, campo) => filas.reduce((m, f) => Math.max(m, f[campo]), 0) + 1;
// Nombre del visitante como se muestra (un delivery o una empresa tiene apellido vacío)
const nombreVisitante = (v) => (v ? [v.nombre, v.apellido].filter(Boolean).join(' ') : 'Visitante');

function reducer(state, { tipo, id_red, ...p }) {
  const d = state[id_red];
  const con = (cambios) => ({ ...state, [id_red]: { ...d, ...cambios } });
  const ahora = fechaHoraLocal();

  switch (tipo) {
    case 'ingresoInvitacion': {
      const inv = d.invitaciones.find((i) => i.id_invitacion === p.id_invitacion);
      const fila = {
        id_acceso: siguienteId(d.registro_accesos, 'id_acceso'), id_visitante: inv.id_visitante, id_unidad: inv.id_unidad, id_invitacion: inv.id_invitacion,
        categoria: inv.tipo, patente: inv.patente, metodo: p.metodo, fecha_ingreso: ahora, fecha_salida: null,
        estado_autorizacion: 'Aprobado', autorizado_via: 'Invitación', id_usuario_autoriza: null, id_usuario_registra: p.id_usuario,
        codigo_qr_validado: p.metodo === 'QR' ? 1 : 0,
      };
      return con({
        invitaciones: d.invitaciones.map((i) => (i.id_invitacion === inv.id_invitacion ? { ...i, estado: 'Adentro' } : i)),
        registro_accesos: [...d.registro_accesos, fila],
      });
    }
    case 'salidaInvitacion':
      return con({
        invitaciones: d.invitaciones.map((i) => (i.id_invitacion === p.id_invitacion ? { ...i, estado: 'Salió' } : i)),
        registro_accesos: d.registro_accesos.map((a) => (a.id_invitacion === p.id_invitacion && !a.fecha_salida ? { ...a, fecha_salida: ahora } : a)),
      });
    case 'pedirAutorizacion': {
      // Se registra la persona en `visitantes` y su llegada queda esperando al residente
      const id_visitante = siguienteId(d.visitantes, 'id_visitante');
      return con({
        visitantes: [...d.visitantes, { id_visitante, rut: null, nombre: p.nombre, apellido: p.apellido, tipo: 'Esporádico' }],
        registro_accesos: [...d.registro_accesos, {
          id_acceso: p.id_acceso, id_visitante, id_unidad: p.id_unidad, id_invitacion: null, categoria: p.categoria, patente: p.patente || null,
          metodo: 'Manual', fecha_ingreso: ahora, fecha_salida: null, estado_autorizacion: 'Pendiente de Confirmación', autorizado_via: null,
          id_usuario_autoriza: null, id_usuario_registra: p.id_usuario, codigo_qr_validado: 0,
        }],
      });
    }
    case 'resolverAutorizacion': {
      const s = d.registro_accesos.find((x) => x.id_acceso === p.id_acceso);
      if (!s || s.estado_autorizacion !== 'Pendiente de Confirmación') return state;
      return con({
        registro_accesos: d.registro_accesos.map((x) => (x.id_acceso === p.id_acceso ? {
          ...x, estado_autorizacion: p.aprobada ? 'Aprobado' : 'Rechazado', autorizado_via: p.via, id_usuario_autoriza: p.id_usuario_autoriza,
          // Si lo autorizan, la hora de ingreso es cuando pasó la barrera
          fecha_ingreso: p.aprobada ? ahora : x.fecha_ingreso,
        } : x)),
      });
    }
    case 'cambiarReserva':
      return con({ reservas: d.reservas.map((r) => (r.id_reserva === p.id_reserva ? { ...r, ...p.cambios } : r)) });
    default:
      return state;
  }
}

export function ConserjeriaProvider({ children }) {
  const { usuario: yo, comunidad, redes } = useSesion();
  const { acciones: finanzas } = useFinanzas();
  const { ocupantes } = useAdmin();
  const [state, dispatch] = useReducer(reducer, null, () => {
    const inicial = conserjeriaInicial();
    redes.forEach((r) => { inicial[r.id_red] ??= conserjeriaVacia(); });
    return inicial;
  });
  const id_red = comunidad.id_red;
  const d = state[id_red];
  const enVivo = tieneModulo(comunidad, 'conserjeria');
  // Llegadas que en la demo responde el residente desde la app (no es una columna de la base)
  const simularApp = useRef(new Set());

  // Demo: el residente acepta desde la app si nadie resolvió antes. Al resolver, el efecto se
  // limpia y el temporizador de esa llegada desaparece. Con la API llegará su respuesta real.
  useEffect(() => {
    const timers = d.registro_accesos
      .filter((s) => s.estado_autorizacion === 'Pendiente de Confirmación' && simularApp.current.has(s.id_acceso))
      .map((s) => setTimeout(() => {
        const u = comunidad.unidades.find((x) => x.id_unidad === s.id_unidad);
        const persona = nombreVisitante(d.visitantes.find((v) => v.id_visitante === s.id_visitante));
        dispatch({ tipo: 'resolverAutorizacion', id_red, id_acceso: s.id_acceso, aprobada: true, via: 'App', id_usuario_autoriza: ocupantes[s.id_unidad]?.[0]?.id_usuario ?? null });
        finanzas.anotar('Ingreso autorizado por el residente', `${persona} a ${nombreUnidad(u)} (app)`,
          `${residentes[s.id_unidad] ?? nombreUnidad(u)} autorizó en la app. Puede pasar ${persona}.`);
      }, Math.max(0, new Date(s.fecha_ingreso).getTime() + RESPUESTA_APP_MS - Date.now())));
    return () => timers.forEach(clearTimeout);
  }, [d.registro_accesos, d.visitantes, id_red, comunidad.unidades, finanzas, ocupantes]);

  const valor = useMemo(() => {
    const hoy = diaISO();
    const unidadPorId = Object.fromEntries(comunidad.unidades.map((u) => [u.id_unidad, u]));
    // Nombre del espacio de una reserva (con la API vendrá en un JOIN con `espacios_comunes`)
    const espacioDe = (r) => comunidad.espacios_comunes?.find((e) => e.id_espacio === r.id_espacio)?.nombre ?? 'Espacio';
    const visitantePorId = Object.fromEntries(d.visitantes.map((v) => [v.id_visitante, v]));
    const persona = (id_visitante) => nombreVisitante(visitantePorId[id_visitante]);
    const esDeHoy = (fecha) => fecha.slice(0, 10) === hoy;
    // Residente que responde por la unidad (con la API, quien toque «Autorizar» en la app)
    const residenteDe = (id_unidad) => ocupantes[id_unidad]?.[0]?.id_usuario ?? null;

    // Invitaciones con el nombre y RUT de su visitante (con la API, un JOIN con `visitantes`)
    const invitaciones = d.invitaciones.map((i) => ({ ...i, visitante: persona(i.id_visitante), rut: visitantePorId[i.id_visitante]?.rut ?? null }));
    const visitasHoy = invitaciones
      .filter((i) => esDeHoy(i.fecha_desde) || esDeHoy(i.fecha_hasta) || i.estado === 'Adentro')
      .sort((a, b) => a.fecha_desde.localeCompare(b.fecha_desde));

    // Monitor: cada visita aprobada aporta su ingreso y, si ya salió, su salida
    const como = (a) => (a.metodo === 'QR' ? 'QR' : a.autorizado_via === 'App' ? 'Autorizó en la app' : a.autorizado_via === 'Teléfono' ? 'Autorizó por teléfono' : 'Manual');
    const accesos = d.registro_accesos.filter((a) => a.estado_autorizacion === 'Aprobado').flatMap((a) => {
      const base = { id_acceso: a.id_acceso, persona: persona(a.id_visitante), categoria: a.categoria, id_unidad: a.id_unidad, patente: a.patente };
      return [
        { ...base, clave: `${a.id_acceso}-ingreso`, sentido: 'ingreso', fecha: a.fecha_ingreso, metodo: como(a) },
        ...(a.fecha_salida ? [{ ...base, clave: `${a.id_acceso}-salida`, sentido: 'salida', fecha: a.fecha_salida, metodo: 'Salida registrada' }] : []),
      ];
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const porAutorizar = d.registro_accesos
      .filter((a) => a.estado_autorizacion === 'Pendiente de Confirmación')
      .map((a) => ({ ...a, persona: persona(a.id_visitante) }))
      .sort((a, b) => a.fecha_ingreso.localeCompare(b.fecha_ingreso));

    // Vehículos y estacionamiento de cada unidad, para buscar por patente
    const vehiculos = {};
    d.vehiculos.forEach((v) => { (vehiculos[v.id_unidad] ??= []).push(v); });
    const estacionamientos = Object.fromEntries(Object.entries(vehiculos).map(([id, vs]) => [id, vs.find((v) => v.estacionamiento)?.estacionamiento]).filter(([, e]) => e));

    const acciones = {
      ingresoInvitacion: (inv, metodo = 'QR') => {
        dispatch({ tipo: 'ingresoInvitacion', id_red, id_invitacion: inv.id_invitacion, metodo, id_usuario: yo.id_usuario });
        finanzas.anotar('Registró un ingreso', `${inv.visitante} a ${nombreUnidad(unidadPorId[inv.id_unidad])} (${metodo})`,
          `${inv.visitante} ingresó. Se avisó a ${nombreUnidad(unidadPorId[inv.id_unidad])}.`);
      },
      salidaInvitacion: (inv) => {
        dispatch({ tipo: 'salidaInvitacion', id_red, id_invitacion: inv.id_invitacion });
        finanzas.anotar('Registró una salida', `${inv.visitante} de ${nombreUnidad(unidadPorId[inv.id_unidad])}`, `Salida de ${inv.visitante} registrada.`);
      },
      // Ingreso sin invitación: no entra hasta que el residente autoriza. La API le enviará una
      // notificación a la app; mientras, la garita puede escribirle por WhatsApp o llamarle.
      ingresoSinInvitacion: ({ categoria, persona: nombre, id_unidad, patente }) => {
        const u = unidadPorId[id_unidad];
        const id_acceso = siguienteId(d.registro_accesos, 'id_acceso');
        // Un delivery o una empresa se guarda con apellido vacío; una persona, con su primer apellido aparte
        const [primero, ...resto] = nombre.split(' ');
        const partes = categoria === 'Visita' && resto.length ? { nombre: primero, apellido: resto.join(' ') } : { nombre, apellido: '' };
        simularApp.current.add(id_acceso);
        dispatch({ tipo: 'pedirAutorizacion', id_red, id_acceso, ...partes, categoria, id_unidad, patente, id_usuario: yo.id_usuario });
        finanzas.anotar('Pidió autorización de ingreso', `${nombre} a ${nombreUnidad(u)}`,
          `Avisamos a ${residentes[u.id_unidad] ?? nombreUnidad(u)} en la app. Espera su respuesta antes de dejar pasar.`);
      },
      // WhatsApp y llamada quedan como `autorizado_via` = 'Teléfono'
      resolverAutorizacion: (s, aprobada, via = 'Teléfono') => {
        const u = unidadPorId[s.id_unidad];
        dispatch({ tipo: 'resolverAutorizacion', id_red, id_acceso: s.id_acceso, aprobada, via, id_usuario_autoriza: residenteDe(s.id_unidad) });
        finanzas.anotar(aprobada ? 'Registró un ingreso autorizado' : 'Registró un ingreso rechazado',
          `${s.categoria} ${s.persona} a ${nombreUnidad(u)} (${via.toLowerCase()})`,
          aprobada ? `Ingreso de ${s.persona} registrado.` : `${residentes[u.id_unidad] ?? 'El residente'} no autorizó. No dejes pasar a ${s.persona}.`);
      },
      entregarEspacio: (r) => {
        const e = espacioDe(r);
        dispatch({ tipo: 'cambiarReserva', id_red, id_reserva: r.id_reserva, cambios: { estado_reserva: 'Entregado' } });
        finanzas.anotar('Entregó un espacio común', `${e} a ${nombreUnidad(unidadPorId[r.id_unidad])}`, `${e} entregado a ${nombreUnidad(unidadPorId[r.id_unidad])}.`);
      },
      recibirEspacio: (r, observacion) => {
        const e = espacioDe(r);
        dispatch({ tipo: 'cambiarReserva', id_red, id_reserva: r.id_reserva, cambios: { estado_reserva: 'Devuelto', observacion } });
        finanzas.anotar('Recibió un espacio común', `${e} de ${nombreUnidad(unidadPorId[r.id_unidad])} · ${observacion}`, `${e} recibido.`);
      },
      cancelarReserva: (r, motivo) => {
        const e = espacioDe(r);
        dispatch({ tipo: 'cambiarReserva', id_red, id_reserva: r.id_reserva, cambios: { estado_reserva: 'Cancelada', observacion: motivo } });
        finanzas.anotar('Canceló una reserva', `${e} de ${nombreUnidad(unidadPorId[r.id_unidad])} · ${motivo}`, `Reserva cancelada. Se avisó a ${nombreUnidad(unidadPorId[r.id_unidad])}.`);
      },
    };

    return {
      ...d, hoy, enVivo, unidadPorId, invitaciones, visitasHoy, accesos, porAutorizar, vehiculos, estacionamientos,
      esperadas: visitasHoy.filter((i) => i.estado === 'Esperada'),
      adentro: invitaciones.filter((i) => i.estado === 'Adentro'),
      reservasHoy: d.reservas.filter((r) => r.fecha_reserva === hoy && r.estado_reserva !== 'Cancelada'),
      espacioDe,
      acciones,
    };
  }, [d, id_red, comunidad, enVivo, finanzas, yo, ocupantes]);

  return <ConserjeriaContext.Provider value={valor}>{children}</ConserjeriaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConserjeria() {
  return useContext(ConserjeriaContext);
}
