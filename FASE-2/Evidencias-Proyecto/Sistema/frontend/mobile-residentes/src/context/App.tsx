import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CATEGORIAS_MARKETPLACE, COBROS, CUENTAS, ID_CATEGORIA, PERSONAS, ROLES, UNIDADES, comunidadPorId, cuentasIniciales, tieneModulo, tipoUnidad, invitacionesIniciales,
  accesosIniciales, fechaHoraLocal, marketplaceInicial, muroInicial, reportesIniciales, visitantesIniciales, reservasIniciales, solicitudesIniciales, votosIniciales,
  ACTAS, ACTA_ACUERDOS, CONTACTOS, TOTAL_UNIDADES, VOTACIONES, VOTACION_OPCIONES, type VotacionDetalle,
  type Cargo, type CategoriaMarketplace, type Cuenta, type Invitacion, type Pago, type Modulo, type RegistroAcceso, type Reserva, type SolicitudContacto, type Visitante,
} from '@/data/demo';
import { roles } from '@/constants/tokens';
import { estadoCuenta, gastosSinPagar } from '@/utils/cuenta';

// Estado de la app del residente: quién entró, con qué vivienda está actuando y los datos
// de su comunidad. Vive en memoria (se reinicia al cerrar la app), como el panel web.
// Cada acción corresponde a un endpoint de la API que se conectará después.

type Valor = ReturnType<typeof useValor>;

// Una publicación como la muestra la app: la fila de `muro_publicaciones` o de
// `marketplace_publicaciones` con el nombre de quien publicó (lo que traerá la API con un JOIN)
export type Publicacion = {
  clave: string; lugar: 'muro' | 'mercado'; id: number; id_red: number; id_usuario: number; id_unidad: number | null;
  autor: string; titulo: string | null; texto: string | null; fecha: string;
  oficial?: { tipo: 'Comunicado' | 'Norma'; aprobadoPor: string; cargo: Cargo };
  categoria?: CategoriaMarketplace; precio: number | null; telefono: string | null; reportadaPorMi: boolean;
};
const ahora = () => fechaHoraLocal();
const siguiente = <T,>(filas: T[], id: (f: T) => number) => filas.reduce((m, f) => Math.max(m, id(f)), 0) + 1;
// Nombre de una persona (con la API, un JOIN con `usuarios`)
const nombreDe = (id_usuario: number) => {
  const c = CUENTAS.find((x) => x.id_usuario === id_usuario);
  return c ? `${c.nombre} ${c.apellido_paterno}` : PERSONAS[id_usuario]?.nombre ?? 'Vecino';
};
const AppContext = createContext<Valor | null>(null);

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nuevoCodigo = () => `EC-${Array.from({ length: 5 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('')}`;

function useValor() {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [id_unidad, setIdUnidad] = useState<number | null>(null);
  // Filas de `gastos_comunes` y `pagos` de las viviendas (las de cobros vienen fijas en COBROS)
  const [cuentas, setCuentas] = useState(cuentasIniciales);
  // Filas de `visitantes`, `invitaciones` y `registro_accesos` (las de la garita del panel)
  const [visitantes, setVisitantes] = useState<Visitante[]>(visitantesIniciales);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>(invitacionesIniciales);
  const [accesos, setAccesos] = useState<RegistroAcceso[]>(accesosIniciales);
  const [reservas, setReservas] = useState(reservasIniciales);
  const [muro, setMuro] = useState(muroInicial);
  const [productos, setProductos] = useState(marketplaceInicial);
  const [reportes, setReportes] = useState(reportesIniciales);
  const [solicitudes, setSolicitudes] = useState(solicitudesIniciales);
  const [votos, setVotos] = useState(votosIniciales);
  const [aviso, setAviso] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useMemo(() => {
    const unidad = id_unidad ? UNIDADES[id_unidad] : null;
    const comunidad = unidad ? comunidadPorId(unidad.id_red)! : null;
    const tiene = (m: Modulo) => tieneModulo(comunidad, m);
    const membresia = cuenta?.membresias.find((m) => m.estado === 'Vigente' && m.id_red === comunidad?.id_red);
    const cargo = membresia ? ROLES[membresia.id_rol] ?? null : null;
    const relacion = cuenta?.residencias.find((r) => r.id_unidad === id_unidad)?.relacion ?? null;
    // Espacios de la comunidad y nombre del espacio de una reserva (con la API, un JOIN con `espacios_comunes`)
    const idsEspacios = new Set((comunidad?.espacios_comunes ?? []).map((e) => e.id_espacio));
    const espacioDe = (id_espacio: number) => comunidad?.espacios_comunes.find((e) => e.id_espacio === id_espacio)?.nombre ?? 'Espacio';
    const estado = id_unidad ? estadoCuenta(id_unidad, COBROS, cuentas.gastos_comunes, cuentas.pagos) : null;

    const avisar = (texto: string) => {
      setAviso(texto);
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setAviso(null), 3500);
    };

    // Lo que ve el residente: lo aprobado y visible de su comunidad. Lo oculto por moderación
    // o eliminado (estado 0) y los comunicados que aún no aprueba el Presidente no aparecen.
    const id_red = comunidad?.id_red;
    const reporteMio = (tipo: 'muro' | 'marketplace', id: number) => reportes.some((r) => r.tipo_publicacion === tipo && r.id_publicacion === id && r.id_usuario === cuenta?.id_usuario);
    const publicaciones: Publicacion[] = [
      ...muro.filter((m) => m.id_red === id_red && m.estado === 1 && m.estado_aprobacion === 'Aprobada').map((m): Publicacion => {
        const aprobador = m.id_aprobador ? PERSONAS[m.id_aprobador] : undefined;
        return {
          clave: `muro-${m.id_publicacion}`, lugar: 'muro', id: m.id_publicacion, id_red: m.id_red, id_usuario: m.id_usuario, id_unidad: m.id_unidad,
          autor: nombreDe(m.id_usuario), titulo: m.titulo, texto: m.contenido, fecha: m.fecha_creacion,
          oficial: m.tipo === 'Vecino' ? undefined : {
            tipo: m.tipo, cargo: aprobador?.cargo ?? 'presidente',
            aprobadoPor: aprobador ? `${aprobador.nombre}${aprobador.cargo ? ` · ${roles[aprobador.cargo].label}` : ''}` : 'la directiva',
          },
          precio: null, telefono: null, reportadaPorMi: reporteMio('muro', m.id_publicacion),
        };
      }),
      ...productos.filter((x) => x.id_red === id_red && x.estado === 1).map((x): Publicacion => ({
        clave: `mercado-${x.id_producto}`, lugar: 'mercado', id: x.id_producto, id_red: x.id_red, id_usuario: x.id_usuario, id_unidad: x.id_unidad,
        autor: nombreDe(x.id_usuario), titulo: x.titulo, texto: x.descripcion, fecha: x.fecha_publicacion,
        categoria: CATEGORIAS_MARKETPLACE[x.id_categoria], precio: x.precio, telefono: x.telefono_contacto, reportadaPorMi: reporteMio('marketplace', x.id_producto),
      })),
    ];

    // Nombre de la visita (con la API, un JOIN con `visitantes`)
    const nombreVisitante = (id: number) => {
      const v = visitantes.find((x) => x.id_visitante === id);
      return v ? [v.nombre, v.apellido].filter(Boolean).join(' ') : 'Visita';
    };

    const acciones = {
      iniciarSesion: (c: Cuenta) => { setCuenta(c); setIdUnidad(c.residencias.find((r) => r.estado === 'Activa')!.id_unidad); },
      cerrarSesion: () => { setCuenta(null); setIdUnidad(null); },
      cambiarUnidad: (id: number) => { setIdUnidad(id); avisar(`Ahora ves ${tipoUnidad(UNIDADES[id]) === 'Departamento' ? 'el Depto' : 'la Casa'} ${UNIDADES[id].numero_identificador}.`); },
      // Crea un pago Pendiente por cada gasto que cubre la transferencia, del más antiguo al más nuevo.
      // Si el monto no alcanza para todos, el último queda como abono parcial.
      avisarTransferencia: (a: { fecha: string; monto: number; nota: string }) => {
        if (!id_unidad || !estado) return;
        const ya = new Set(cuentas.pagos.filter((p) => p.estado_validacion === 'Pendiente').map((p) => p.id_gasto));
        const gastos = gastosSinPagar(estado).filter((g) => !ya.has(g.id_gasto));
        let resto = a.monto;
        let id_pago = cuentas.pagos.reduce((m, p) => Math.max(m, p.id_pago), 0);
        const nuevos: Pago[] = [];
        gastos.forEach((g, i) => {
          if (resto <= 0) return;
          const monto_pagado = i === gastos.length - 1 ? resto : Math.min(resto, g.monto_total);
          resto -= monto_pagado;
          id_pago += 1;
          nuevos.push({
            id_pago, id_gasto: g.id_gasto, id_usuario: cuenta?.id_usuario ?? null, monto_pagado, fecha_pago: `${a.fecha}T12:00:00`,
            metodo_pago: 'Transferencia', comprobante_url: null, observacion: a.nota || null, estado_validacion: 'Pendiente', id_validador: null, fecha_validacion: null,
          });
        });
        if (!nuevos.length) { avisar('Ya avisaste una transferencia por todo lo que debes.'); return; }
        setCuentas((x) => ({ ...x, pagos: [...x.pagos, ...nuevos] }));
        avisar('Aviso enviado. La administración marcará el pago cuando vea la transferencia.');
      },
      // Crea la invitación y, si la visita es nueva, su fila en `visitantes` (el RUT es único: si ya existe, se reutiliza)
      crearInvitacion: (inv: { nombre: string; rut: string | null; tipo: Invitacion['tipo']; fecha_desde: string; fecha_hasta: string; patente: string | null }) => {
        const existente = inv.rut ? visitantes.find((v) => v.rut === inv.rut) : undefined;
        const [primero, ...resto] = inv.nombre.split(' ');
        const id_visitante = existente?.id_visitante ?? siguiente(visitantes, (v) => v.id_visitante);
        if (!existente) {
          setVisitantes((x) => [...x, inv.tipo === 'Visita' && resto.length
            ? { id_visitante, rut: inv.rut, nombre: primero, apellido: resto.join(' '), tipo: 'Esporádico' }
            : { id_visitante, rut: inv.rut, nombre: inv.nombre, apellido: '', tipo: 'Esporádico' }]);
        }
        const nueva: Invitacion = {
          id_invitacion: siguiente(invitaciones, (i) => i.id_invitacion), codigo: nuevoCodigo(), id_unidad: id_unidad!, id_usuario: cuenta!.id_usuario, id_visitante,
          tipo: inv.tipo, fecha_desde: inv.fecha_desde, fecha_hasta: inv.fecha_hasta, patente: inv.patente, estado: 'Esperada', fecha_creacion: ahora(),
        };
        setInvitaciones((x) => [...x, nueva]);
        return nueva;
      },
      cancelarInvitacion: (id_invitacion: number) => {
        setInvitaciones((x) => x.map((i) => (i.id_invitacion === id_invitacion ? { ...i, estado: 'Cancelada' } : i)));
        avisar('Invitación cancelada. El código ya no abre la entrada.');
      },
      // La respuesta llega a la garita al instante (con la API, por WebSocket). Si autoriza, la hora
      // de ingreso es cuando pasa la barrera.
      responderPorteria: (id_acceso: number, autoriza: boolean) => {
        const v = accesos.find((x) => x.id_acceso === id_acceso);
        setAccesos((x) => x.map((y) => (y.id_acceso === id_acceso ? {
          ...y, estado_autorizacion: autoriza ? 'Aprobado' : 'Rechazado', autorizado_via: 'App', id_usuario_autoriza: cuenta?.id_usuario ?? null,
          fecha_ingreso: autoriza ? ahora() : y.fecha_ingreso,
        } : y)));
        avisar(autoriza ? `Listo. Conserjería dejará pasar a ${v ? nombreVisitante(v.id_visitante) : 'tu visita'}.` : 'Avisamos a conserjería que no autorizas el ingreso.');
      },
      reservar: (r: Pick<Reserva, 'id_espacio' | 'fecha_reserva' | 'hora_inicio' | 'hora_fin' | 'cantidad_invitados'>) => {
        setReservas((x) => [...x, {
          ...r, id_reserva: x.reduce((m, y) => Math.max(m, y.id_reserva), 0) + 1, id_usuario: cuenta!.id_usuario, id_unidad: id_unidad!,
          estado_reserva: 'Aprobada', observacion: null, fecha_solicitud: new Date().toISOString().slice(0, 19),
        }]);
        avisar(`${espacioDe(r.id_espacio)} reservado.`);
      },
      cancelarReserva: (id_reserva: number) => {
        setReservas((x) => x.map((r) => (r.id_reserva === id_reserva ? { ...r, estado_reserva: 'Cancelada' } : r)));
        avisar('Reserva cancelada. El espacio quedó libre para otros vecinos.');
      },
      publicar: (p: { lugar: 'muro'; contenido: string } | { lugar: 'mercado'; titulo: string; descripcion: string | null; categoria: CategoriaMarketplace; precio: number | null }) => {
        if (!cuenta || !id_unidad || !id_red) return;
        if (p.lugar === 'muro') {
          setMuro((x) => [...x, {
            id_publicacion: siguiente(x, (f) => f.id_publicacion), id_red, id_usuario: cuenta.id_usuario, id_unidad, tipo: 'Vecino', titulo: null, contenido: p.contenido,
            fecha_creacion: ahora(), estado_aprobacion: 'Aprobada', id_aprobador: null, fecha_aprobacion: null, estado: 1, id_moderador: null, fecha_moderacion: null,
          }]);
        } else {
          setProductos((x) => [...x, {
            id_producto: siguiente(x, (f) => f.id_producto), id_red, id_usuario: cuenta.id_usuario, id_unidad, id_categoria: ID_CATEGORIA[p.categoria],
            titulo: p.titulo, descripcion: p.descripcion, precio: p.precio, foto_url: null, telefono_contacto: cuenta.telefono,
            fecha_publicacion: ahora(), estado: 1, id_moderador: null, fecha_moderacion: null,
          }]);
        }
        avisar(p.lugar === 'mercado' ? 'Tu aviso ya está en el mercado.' : 'Publicado en el muro.');
      },
      // Quien publicó la elimina: queda con estado 0 y sin moderador
      eliminarPublicacion: (p: Publicacion) => {
        if (p.lugar === 'muro') setMuro((x) => x.map((m) => (m.id_publicacion === p.id ? { ...m, estado: 0 } : m)));
        else setProductos((x) => x.map((m) => (m.id_producto === p.id ? { ...m, estado: 0 } : m)));
        avisar('Publicación eliminada.');
      },
      // El motivo es obligatorio: la administración lo ve al moderar
      reportar: (p: Publicacion, motivo: string) => {
        if (!cuenta) return;
        setReportes((x) => [...x, {
          id_reporte: siguiente(x, (f) => f.id_reporte), tipo_publicacion: p.lugar === 'muro' ? 'muro' : 'marketplace', id_publicacion: p.id,
          id_usuario: cuenta.id_usuario, motivo, fecha: ahora(), estado: 'Pendiente',
        }]);
        avisar('Gracias. La administración revisará la publicación.');
      },
      // Contacto en el mercado: la API notificará a quien publicó y, al responder, al interesado
      pedirContacto: (id_producto: number) => {
        if (!cuenta || !id_unidad) return;
        setSolicitudes((x) => [...x, {
          id_solicitud: siguiente(x, (f) => f.id_solicitud), id_producto, id_usuario: cuenta.id_usuario, id_unidad,
          estado: 'Pendiente', fecha_solicitud: ahora(), fecha_respuesta: null, vista: 0,
        }]);
        const p = productos.find((x) => x.id_producto === id_producto);
        avisar(`Le avisamos a ${p ? nombreDe(p.id_usuario).split(' ')[0] : 'tu vecino'} que te interesa su aviso.`);
      },
      cancelarSolicitud: (id_solicitud: number) => {
        setSolicitudes((x) => x.filter((s) => s.id_solicitud !== id_solicitud));
        avisar('Solicitud cancelada.');
      },
      responderSolicitud: (id_solicitud: number, acepta: boolean) => {
        const s = solicitudes.find((x) => x.id_solicitud === id_solicitud);
        setSolicitudes((x) => x.map((y) => (y.id_solicitud === id_solicitud ? { ...y, estado: acepta ? 'Aceptada' : 'Rechazada', fecha_respuesta: ahora(), vista: 0 } : y)));
        const nombre = s ? nombreDe(s.id_usuario).split(' ')[0] : 'tu vecino';
        avisar(acepta ? `Le enviamos tu teléfono a ${nombre}.` : `Le avisamos a ${nombre} que ya no está disponible.`);
      },
      marcarRespuestaVista: (id_solicitud: number) => setSolicitudes((x) => x.map((y) => (y.id_solicitud === id_solicitud ? { ...y, vista: 1 } : y))),
      // Fila nueva de `votos`: la unidad vota una vez (UNIQUE id_votacion + id_unidad)
      votar: (id_votacion: number, id_opcion: number) => {
        if (!cuenta || !id_unidad) return;
        setVotos((x) => (x.some((v) => v.id_votacion === id_votacion && v.id_unidad === id_unidad) ? x : [...x, {
          id_voto: x.reduce((m, v) => Math.max(m, v.id_voto), 0) + 1, id_votacion, id_opcion, id_unidad, id_usuario: cuenta.id_usuario, fecha: ahora(),
        }]));
        avisar('Voto registrado por tu vivienda.');
      },
      avisar,
    };

    // Solicitudes de avisos que siguen publicados: las que hice yo y las que llegaron a los avisos de esta vivienda
    const enMercado = new Set(publicaciones.filter((p) => p.lugar === 'mercado').map((p) => p.id));
    const avisosMios = new Set(publicaciones.filter((p) => p.lugar === 'mercado' && p.id_unidad === id_unidad).map((p) => p.id));
    const vigentes = solicitudes.filter((s) => enMercado.has(s.id_producto));
    const misSolicitudes = vigentes.filter((s) => s.id_usuario === cuenta?.id_usuario);
    const solicitudesRecibidas = vigentes.filter((s) => avisosMios.has(s.id_producto));

    return {
      cuenta, unidad, comunidad, cargo, relacion, tiene, aviso,
      estado,
      misInvitaciones: invitaciones.filter((i) => i.id_unidad === id_unidad)
        .map((i) => ({ ...i, visitante: nombreVisitante(i.id_visitante), rut: visitantes.find((v) => v.id_visitante === i.id_visitante)?.rut ?? null })),
      reservasComunidad: reservas.filter((r) => idsEspacios.has(r.id_espacio) && r.estado_reserva !== 'Cancelada' && r.estado_reserva !== 'Rechazada'),
      espacioDe,
      misReservas: reservas.filter((r) => r.id_unidad === id_unidad),
      enPorteria: accesos.filter((a) => a.id_unidad === id_unidad && a.estado_autorizacion === 'Pendiente de Confirmación')
        .map((a) => ({ ...a, persona: nombreVisitante(a.id_visitante) })),
      publicaciones,
      nombreDe,
      votaciones: VOTACIONES.filter((v) => v.id_red === comunidad?.id_red).map((v): VotacionDetalle => ({
        ...v, total_unidades: TOTAL_UNIDADES[v.id_red],
        opciones: VOTACION_OPCIONES.filter((o) => o.id_votacion === v.id_votacion).map((o) => ({ ...o, votos: votos.filter((x) => x.id_opcion === o.id_opcion).length })),
      })),
      // Actas publicadas con sus acuerdos, la más nueva primero (la API las traerá con un JOIN)
      actas: ACTAS.filter((a) => a.id_red === comunidad?.id_red && a.estado === 'Publicada').sort((a, b) => b.numero - a.numero)
        .map((a) => ({ ...a, acuerdos: ACTA_ACUERDOS.filter((x) => x.id_acta === a.id_acta) })),
      contactos: CONTACTOS.filter((k) => k.id_red === comunidad?.id_red && k.visible === 1),
      misSolicitudes,
      solicitudesRecibidas,
      solicitudDe: (id_producto: number): SolicitudContacto | null => misSolicitudes.find((s) => s.id_producto === id_producto) ?? null,
      // Globo de la pestaña Mercado: vecinos esperando mi respuesta y respuestas que aún no veo
      pendientesMercado: solicitudesRecibidas.filter((s) => s.estado === 'Pendiente').length + misSolicitudes.filter((s) => s.estado !== 'Pendiente' && !s.vista).length,
      miVoto: (id_votacion: number) => votos.find((v) => v.id_votacion === id_votacion && v.id_unidad === id_unidad)?.id_opcion ?? null,
      acciones,
    };
  }, [cuenta, id_unidad, cuentas, visitantes, invitaciones, accesos, reservas, muro, productos, reportes, solicitudes, votos, aviso]);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const valor = useValor();
  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
}

export function useApp() {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp va dentro de AppProvider');
  return v;
}
