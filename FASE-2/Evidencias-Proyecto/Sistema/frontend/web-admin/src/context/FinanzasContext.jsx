import { createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useSesion } from './SesionContext';
import { finanzasIniciales, finanzasVacia, bitacoraInicial, nombreMes, PERIODO_ACTUAL } from '../data/finanzasMock';
import { CUENTAS } from '../data/cuentasDemo';
import { cargosDe, esPlataforma } from '../config/roles';
import { clp, nombreCorto, nombreUnidad } from '../utils/formato';

// Estado de finanzas y aprobaciones de cada comunidad, con las filas de la base. Simula lo que
// hará la API: cada acción modifica las filas y queda registrada en la bitácora.
const FinanzasContext = createContext(null);

// Nombre de quien validó, solicitó o visó. Con la API vendrá en un JOIN con `usuarios`.
const nombreUsuario = (id) => {
  const c = CUENTAS.find((x) => x.id_usuario === id);
  return c ? nombreCorto(c) : 'Usuario sin cuenta';
};
const nuevoId = (prefijo) => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
// Con la API el id lo pone AUTO_INCREMENT; aquí se usa el mayor + 1
const siguienteId = (filas, campo) => filas.reduce((m, f) => Math.max(m, f[campo]), 0) + 1;
// Fecha y hora local en el formato DATETIME de la base
const ahora = () => {
  const f = new Date();
  return new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
};
const esActual = (fila) => fila.mes === PERIODO_ACTUAL.mes && fila.anio === PERIODO_ACTUAL.anio;
// Sin pagar: Pendiente si es del mes en curso, Atrasado si es de un mes anterior
const estadoSinPagar = (g) => (esActual(g) ? 'Pendiente' : 'Atrasado');

function reducer(state, { tipo, id_red, ...p }) {
  const d = state.datos[id_red];
  const conDatos = (cambios) => ({ ...state, datos: { ...state.datos, [id_red]: { ...d, ...cambios } } });
  const conLog = (s) => (p.log ? { ...s, bitacora: { ...s.bitacora, [id_red]: [p.log, ...(s.bitacora[id_red] ?? [])] } } : s);
  const cambiarGastos = (ids, estado_pago) => d.gastos_comunes.map((g) => (ids.includes(g.id_gasto) ? { ...g, estado_pago: typeof estado_pago === 'function' ? estado_pago(g) : estado_pago } : g));

  switch (tipo) {
    // Pago registrado en el panel: nace Validado. Si el residente ya había avisado su
    // transferencia, se valida ese aviso en vez de crear otro pago.
    case 'registrarPagos': {
      const gastos = d.gastos_comunes.filter((g) => p.idsGastos.includes(g.id_gasto));
      let id_pago = siguienteId(d.pagos, 'id_pago') - 1;
      const validar = { estado_validacion: 'Validado', id_validador: p.id_usuario, fecha_validacion: ahora() };
      const avisados = new Set();
      const pagos = d.pagos.map((pg) => {
        if (p.idsGastos.includes(pg.id_gasto) && pg.estado_validacion === 'Pendiente') {
          avisados.add(pg.id_gasto);
          return { ...pg, ...validar };
        }
        return pg;
      });
      gastos.filter((g) => !avisados.has(g.id_gasto)).forEach((g) => {
        id_pago += 1;
        pagos.push({
          id_pago, id_gasto: g.id_gasto, id_usuario: null, monto_pagado: g.monto_total, fecha_pago: ahora(), metodo_pago: p.metodo_pago ?? 'Transferencia',
          comprobante_url: null, observacion: null, ...validar,
        });
      });
      return conLog(conDatos({ pagos, gastos_comunes: cambiarGastos(p.idsGastos, 'Pagado') }));
    }
    // Desmarcar un pago por error: el pago queda Rechazado (no se borra) y el gasto vuelve a deberse
    case 'anularPago':
      return conLog(conDatos({
        pagos: d.pagos.map((pg) => (pg.id_gasto === p.id_gasto && pg.estado_validacion === 'Validado'
          ? { ...pg, estado_validacion: 'Rechazado', observacion: 'Anulado desde el panel', id_validador: p.id_usuario, fecha_validacion: ahora() } : pg)),
        gastos_comunes: cambiarGastos([p.id_gasto], estadoSinPagar),
      }));
    case 'rechazarAviso':
      return conLog(conDatos({
        pagos: d.pagos.map((pg) => (p.idsGastos.includes(pg.id_gasto) && pg.estado_validacion === 'Pendiente'
          ? { ...pg, estado_validacion: 'Rechazado', id_validador: p.id_usuario, fecha_validacion: ahora() } : pg)),
      }));
    case 'crearCobro': {
      const cobro = { ...p.cobro, id_cobro: siguienteId(d.cobros, 'id_cobro'), id_red, ...PERIODO_ACTUAL };
      let id_gasto = siguienteId(d.gastos_comunes, 'id_gasto') - 1;
      const nuevos = p.idsUnidades.map((id_unidad) => {
        id_gasto += 1;
        return {
          id_gasto, id_cobro: cobro.id_cobro, id_unidad, mes: cobro.mes, anio: cobro.anio, monto_total: cobro.monto_por_unidad,
          fecha_emision: cobro.fecha_emision, fecha_vencimiento: cobro.fecha_vencimiento, estado_pago: 'Pendiente', descripcion: cobro.concepto,
        };
      });
      // Crear un cobro envía el correo a todas las unidades
      const correo = {
        id_correo: siguienteId(d.correos_enviados, 'id_correo'), id_red, tipo: 'Nuevo cobro', asunto: cobro.concepto, id_cobro: cobro.id_cobro, id_votacion: null,
        destinatarios: p.idsUnidades.length, id_usuario_envia: cobro.id_usuario_emite, fecha_envio: ahora(),
      };
      return conLog(conDatos({ cobros: [...d.cobros, cobro], gastos_comunes: [...d.gastos_comunes, ...nuevos], correos_enviados: [...d.correos_enviados, correo] }));
    }
    case 'recordatorio':
      return conLog(conDatos({
        correos_enviados: [...d.correos_enviados, {
          id_correo: siguienteId(d.correos_enviados, 'id_correo'), id_red, tipo: 'Recordatorio de morosidad', asunto: 'Recordatorio de deuda pendiente',
          id_cobro: null, id_votacion: null, destinatarios: p.destinatarios, id_usuario_envia: p.id_usuario, fecha_envio: ahora(),
        }],
      }));
    // P6: Secretaría recuerda una votación a las unidades que no han votado
    case 'recordarVotacion':
      return conLog(conDatos({
        correos_enviados: [...d.correos_enviados, {
          id_correo: siguienteId(d.correos_enviados, 'id_correo'), id_red, tipo: 'Recordatorio de votación', asunto: p.asunto,
          id_cobro: null, id_votacion: p.id_votacion, destinatarios: p.destinatarios, id_usuario_envia: p.id_usuario, fecha_envio: ahora(),
        }],
      }));
    case 'solicitarExencion':
      return conLog(conDatos({
        exenciones: [{
          id_exencion: siguienteId(d.exenciones, 'id_exencion'), id_gasto: p.id_gasto, motivo: p.motivo, id_solicitante: p.id_usuario,
          fecha_solicitud: ahora(), estado: 'Pendiente', id_resuelve: null, fecha_resolucion: null,
        }, ...d.exenciones],
      }));
    case 'resolverExencion': {
      const ex = d.exenciones.find((e) => e.id_exencion === p.id_exencion);
      const exenciones = d.exenciones.map((e) => (e.id_exencion === p.id_exencion
        ? { ...e, estado: p.aprobada ? 'Aprobada' : 'Rechazada', id_resuelve: p.id_usuario, fecha_resolucion: ahora() } : e));
      // La exención solo cambia el gasto cuando el Presidente la aprueba
      return conLog(conDatos({ exenciones, gastos_comunes: p.aprobada ? cambiarGastos([ex.id_gasto], 'Exento') : d.gastos_comunes }));
    }
    case 'resolverEgreso':
      return conLog(conDatos({
        egresos: d.egresos.map((e) => (e.id_egreso === p.id_egreso
          ? { ...e, estado_visado: p.aprobado ? 'Aprobado' : 'Rechazado', id_visador: p.id_usuario, fecha_visado: ahora() } : e)),
      }));
    case 'guardarCategoria': {
      const existe = d.categorias_cobro.some((c) => c.id_categoria === p.categoria.id_categoria);
      const categorias_cobro = existe
        ? d.categorias_cobro.map((c) => (c.id_categoria === p.categoria.id_categoria ? { ...c, ...p.categoria } : c))
        : [...d.categorias_cobro, { ...p.categoria, id_categoria: siguienteId(d.categorias_cobro, 'id_categoria'), id_red, activa: 1 }];
      return conLog(conDatos({ categorias_cobro }));
    }
    case 'anotar':
      return conLog(state);
    default:
      return state;
  }
}

export function FinanzasProvider({ children }) {
  const { usuario, comunidad, redes, cuentas } = useSesion();
  const [state, dispatch] = useReducer(reducer, null, () => {
    const datos = finanzasIniciales();
    const bitacora = { ...bitacoraInicial };
    redes.forEach((r) => { datos[r.id_red] ??= finanzasVacia(r.id_red); bitacora[r.id_red] ??= []; });
    return { datos, bitacora };
  });
  const [aviso, setAviso] = useState(null);

  const id_red = comunidad.id_red;
  const d = state.datos[id_red];
  const id_usuario = usuario.id_usuario;
  const unidadPorId = useMemo(() => Object.fromEntries(comunidad.unidades.map((u) => [u.id_unidad, u])), [comunidad]);

  // Fila nueva de `bitacora`; el id lo pondrá AUTO_INCREMENT
  const registrar = useCallback((accion, detalle) => ({
    id_bitacora: nuevoId('b'), id_red, id_usuario, accion, detalle, fecha: ahora(),
  }), [id_red, id_usuario]);

  const cobrosDelPeriodo = useMemo(() => d.cobros.filter(esActual), [d]);
  const cobroPorId = useMemo(() => Object.fromEntries(d.cobros.map((c) => [c.id_cobro, c])), [d]);
  const gastoPorId = useMemo(() => Object.fromEntries(d.gastos_comunes.map((g) => [g.id_gasto, g])), [d]);
  // Gastos de cada unidad, del mes más reciente al más antiguo y, dentro del mes, en el orden en que se emitieron
  const gastosPorUnidad = useMemo(() => {
    const m = {};
    d.gastos_comunes.forEach((g) => { (m[g.id_unidad] ??= []).push(g); });
    Object.values(m).forEach((l) => l.sort((x, y) => y.anio - x.anio || y.mes - x.mes || x.id_gasto - y.id_gasto));
    return m;
  }, [d]);

  const gastosPorCobro = useMemo(() => {
    const m = {};
    d.gastos_comunes.forEach((g) => { (m[g.id_cobro] ??= []).push(g); });
    return m;
  }, [d]);

  // Estado de cada unidad para el plano
  const estadoUnidad = useCallback((id_unidad) => {
    const gastos = gastosPorUnidad[id_unidad] ?? [];
    if (gastos.some((g) => g.estado_pago === 'Atrasado')) return 'moroso';
    if (d.exenciones.some((e) => e.estado === 'Pendiente' && gastoPorId[e.id_gasto]?.id_unidad === id_unidad)) return 'exencion';
    const delMes = gastos.filter(esActual);
    // Una unidad creada después de emitir los cobros del mes todavía no tiene cobro
    if (delMes.length === 0) return null;
    return delMes.some((g) => g.estado_pago === 'Pendiente') ? 'pendiente' : 'pagado';
  }, [d, gastosPorUnidad, gastoPorId]);

  const valor = useMemo(() => {
    const estadosPlano = Object.fromEntries(comunidad.unidades.map((u) => [u.id_unidad, estadoUnidad(u.id_unidad)]));
    const suma = (gastos) => gastos.reduce((s, g) => s + g.monto_total, 0);
    const morosos = comunidad.unidades
      .map((unidad) => {
        const gastos = gastosPorUnidad[unidad.id_unidad] ?? [];
        const atrasados = gastos.filter((g) => g.estado_pago === 'Atrasado');
        const deudaAnterior = suma(atrasados);
        const pendienteMes = suma(gastos.filter((g) => esActual(g) && g.estado_pago === 'Pendiente'));
        return { unidad, atrasados, deudaAnterior, pendienteMes, total: deudaAnterior + pendienteMes };
      })
      .filter((m) => m.deudaAnterior > 0)
      .sort((a, b) => b.total - a.total);

    const delMes = d.gastos_comunes.filter((g) => esActual(g) && g.estado_pago !== 'Exento');
    const esperado = suma(delMes);
    const recaudado = suma(delMes.filter((g) => g.estado_pago === 'Pagado'));
    const alDia = comunidad.unidades.filter((u) => estadosPlano[u.id_unidad] === 'pagado').length;
    const exencionesPendientes = d.exenciones.filter((e) => e.estado === 'Pendiente');
    const egresosPorVisar = d.egresos.filter((e) => e.requiere_visado && e.estado_visado === 'Pendiente');
    // Transferencias que avisaron los residentes desde la app y falta validar
    const avisosPorValidar = d.pagos.filter((pg) => pg.estado_validacion === 'Pendiente');
    // Bitácora con quién lo hizo y su cargo en la comunidad (la API los traerá con un JOIN a `usuarios` y `membresias`)
    const cuentaPorId = Object.fromEntries(cuentas.map((c) => [c.id_usuario, c]));
    const bitacora = (state.bitacora[id_red] ?? []).map((b) => {
      const quien = cuentaPorId[b.id_usuario];
      return { ...b, usuario: quien ? nombreCorto(quien) : 'Usuario sin cuenta', cargo: cargosDe(quien, id_red)[0] ?? (esPlataforma(quien) ? 'plataforma' : 'residente') };
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
    // Filas de `correos_enviados`, del más reciente al más antiguo
    const correosEnviados = [...d.correos_enviados].sort((a, b) => b.fecha_envio.localeCompare(a.fecha_envio) || b.id_correo - a.id_correo);
    const ultimoRecordatorio = correosEnviados.find((c) => c.tipo === 'Recordatorio de morosidad');
    // Fondo de reserva: lo pagado en cobros de esa categoría menos los egresos aprobados de ella
    const fondo = d.categorias_cobro.find((c) => c.nombre === 'Fondo de reserva');
    const fondoReserva = fondo && {
      saldo: d.pagos.filter((pg) => pg.estado_validacion === 'Validado' && cobroPorId[gastoPorId[pg.id_gasto]?.id_cobro]?.id_categoria === fondo.id_categoria)
        .reduce((s, pg) => s + pg.monto_pagado, 0)
        - d.egresos.filter((e) => e.id_categoria === fondo.id_categoria && (!e.requiere_visado || e.estado_visado === 'Aprobado')).reduce((s, e) => s + e.monto, 0),
    };

    const resumen = {
      alDia, totalUnidades: comunidad.unidades.length, esperado, recaudado,
      deudaMorosa: morosos.reduce((s, m) => s + m.deudaAnterior, 0),
      exencionesPendientes: exencionesPendientes.length,
      // Sin los comunicados por aprobar, que suma el muro
      porAprobar: exencionesPendientes.length + egresosPorVisar.length,
    };

    const nombreCobro = (g) => cobroPorId[g.id_cobro]?.concepto ?? g.descripcion;
    const acciones = {
      // Marca como pagados uno o más gastos (los del mes o toda la deuda anterior)
      registrarPagos: (idsGastos, mensaje) => {
        const gastos = idsGastos.map((id) => gastoPorId[id]);
        const unidad = unidadPorId[gastos[0].id_unidad];
        dispatch({ tipo: 'registrarPagos', id_red, idsGastos, id_usuario,
          log: registrar('Marcó un pago', `${nombreUnidad(unidad)} · ${gastos.map(nombreCobro).join(', ')} · ${clp(suma(gastos))}`) });
        if (mensaje) setAviso(mensaje);
      },
      anularPago: (id_gasto) => {
        const g = gastoPorId[id_gasto];
        dispatch({ tipo: 'anularPago', id_red, id_gasto, id_usuario,
          log: registrar('Desmarcó un pago', `${nombreUnidad(unidadPorId[g.id_unidad])} · ${nombreCobro(g)}`) });
      },
      rechazarAviso: (idsGastos) => {
        const unidad = unidadPorId[gastoPorId[idsGastos[0]].id_unidad];
        dispatch({ tipo: 'rechazarAviso', id_red, idsGastos, id_usuario,
          log: registrar('Rechazó una transferencia avisada', nombreUnidad(unidad)) });
        setAviso(`Transferencia de ${nombreUnidad(unidad)} rechazada. Los cobros siguen pendientes.`);
      },
      crearCobro: (cobro) => {
        const ids = comunidad.unidades.map((u) => u.id_unidad);
        dispatch({ tipo: 'crearCobro', id_red, cobro: { ...cobro, id_usuario_emite: id_usuario }, idsUnidades: ids,
          log: registrar('Creó un cobro', `${cobro.concepto} · ${clp(cobro.monto_por_unidad)} por unidad · aviso a ${ids.length} unidades`) });
        setAviso(`Cobro creado. Se envió un correo a ${ids.length} unidades.`);
      },
      enviarRecordatorio: () => {
        dispatch({ tipo: 'recordatorio', id_red, destinatarios: morosos.length, id_usuario, log: registrar('Envió recordatorio de morosidad', `${morosos.length} unidades`) });
        setAviso(`Recordatorio enviado a ${morosos.length} unidades con deuda.`);
      },
      solicitarExencion: ({ id_gasto, motivo }) => {
        const g = gastoPorId[id_gasto];
        dispatch({ tipo: 'solicitarExencion', id_red, id_gasto, motivo, id_usuario,
          log: registrar('Solicitó una exención', `${nombreUnidad(unidadPorId[g.id_unidad])} · ${motivo}`) });
        setAviso('Exención enviada a Presidencia. El cobro sigue vigente hasta que se apruebe.');
      },
      resolverExencion: (id_exencion, aprobada) => {
        const ex = d.exenciones.find((e) => e.id_exencion === id_exencion);
        dispatch({ tipo: 'resolverExencion', id_red, id_exencion, aprobada, id_usuario,
          log: registrar(aprobada ? 'Aprobó una exención' : 'Rechazó una exención', nombreUnidad(unidadPorId[gastoPorId[ex.id_gasto].id_unidad])) });
        setAviso(aprobada ? 'Exención aprobada.' : 'Exención rechazada.');
      },
      resolverEgreso: (id_egreso, aprobado) => {
        const eg = d.egresos.find((e) => e.id_egreso === id_egreso);
        dispatch({ tipo: 'resolverEgreso', id_red, id_egreso, aprobado, id_usuario,
          log: registrar(aprobado ? 'Visó un gasto extraordinario' : 'Rechazó un gasto extraordinario', `${eg.descripcion} · ${clp(eg.monto)}`) });
        setAviso(aprobado ? 'Gasto visado.' : 'Gasto rechazado.');
      },
      guardarCategoria: (categoria) => {
        dispatch({ tipo: 'guardarCategoria', id_red, categoria, log: registrar('Modificó categorías de cobro', categoria.nombre) });
      },
      // P6: el correo de recordatorio de una votación queda en `correos_enviados`
      recordarVotacion: ({ id_votacion, titulo }, destinatarios) => {
        dispatch({ tipo: 'recordarVotacion', id_red, id_votacion, asunto: titulo, destinatarios, id_usuario,
          log: registrar('Envió recordatorio de votación', `${titulo} · ${destinatarios} unidades`) });
        setAviso(`Recordatorio enviado a las ${destinatarios} unidades que no han votado.`);
      },
      // Para que otras áreas (Secretaría, Administración) dejen su acción en la bitácora
      anotar: (accion, detalle, mensaje) => {
        dispatch({ tipo: 'anotar', id_red, log: registrar(accion, detalle) });
        if (mensaje) setAviso(mensaje);
      },
    };

    return {
      datos: d, periodo: { ...PERIODO_ACTUAL, nombre: `${nombreMes(PERIODO_ACTUAL.mes)} ${PERIODO_ACTUAL.anio}` },
      umbralVisado: comunidad.umbral_visado,
      cobrosDelPeriodo, cobroPorId, gastoPorId, gastosPorUnidad, gastosPorCobro, categoriaPorId: Object.fromEntries(d.categorias_cobro.map((c) => [c.id_categoria, c])),
      estadosPlano, estadoUnidad, morosos, resumen, unidadPorId, fondoReserva,
      exencionesPendientes, egresosPorVisar, avisosPorValidar, correosEnviados, ultimoRecordatorio,
      nombreUsuario, bitacora, acciones,
    };
  }, [comunidad, d, state.bitacora, id_red, cobrosDelPeriodo, cobroPorId, gastoPorId, gastosPorUnidad, gastosPorCobro, estadoUnidad, unidadPorId, id_usuario, registrar, cuentas]);

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
