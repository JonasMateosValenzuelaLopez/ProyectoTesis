import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  COBROS, CUENTAS, PERSONAS, ROLES, TELEFONOS, UNIDADES, comunidadPorId, cuentasIniciales, tieneModulo, tipoUnidad, invitacionesIniciales,
  MAX_AVISOS_DISPONIBLES, MAX_DESCRIPCION_AVISO, MAX_TITULO_AVISO, MIN_TITULO_AVISO, PRECIO_MAXIMO, type ProductoMarketplace, type TipoAviso,
  accesosIniciales, fechaHoraLocal, marketplaceInicial, muroInicial, reportesIniciales, visitantesIniciales, reservasIniciales, solicitudesIniciales, votosIniciales,
  ACTAS, ACTA_ACUERDOS, CONTACTOS, TOTAL_UNIDADES, VOTACIONES, VOTACION_OPCIONES, type VotacionDetalle,
  EMERGENCIAS, GUIAS, diaISO, diaSemanaHoy, diasDe, espaciosActivos, fichasIniciales, type HogarFicha,
  HORAS_PARA_CANCELAR, MAX_BLOQUES_POR_DIA, puedeCancelarResidente, yaPaso, titularDe,
  type Cargo, type Cuenta, type Invitacion, type Pago, type Modulo, type RegistroAcceso, type Reserva, type SolicitudContacto, type Visitante,
} from '@/data/demo';
import { roles } from '@/constants/tokens';
import { estadoCuenta, gastosSinPagar } from '@/utils/cuenta';
import { diasHasta } from '@/utils/formato';

// Estado de la app del residente: quién entró, con qué vivienda está actuando y los datos
// de su comunidad. Vive en memoria (se reinicia al cerrar la app), como el panel web.
// Cada acción corresponde a un endpoint de la API que se conectará después.

type Valor = ReturnType<typeof useValor>;

// Una publicación como la muestra la app: la fila de `muro_publicaciones` o de
// `marketplace_publicaciones` con el nombre de quien publicó (lo que traerá la API con un JOIN).
// `mia`: la publicó esta persona (como la API, por usuario y no por vivienda).
// En el mercado: `cerrado` (vendido o ya no disponible), `oculto` (lo ocultó la administración; solo
// lo ve quien lo publicó) y `telefono`, que solo llega si quien publicó aceptó mi solicitud.
export type Publicacion = {
  clave: string; lugar: 'muro' | 'mercado'; id: number; id_red: number; id_usuario: number; id_unidad: number | null;
  autor: string; titulo: string | null; texto: string | null; fecha: string; mia: boolean;
  oficial?: { tipo: 'Comunicado' | 'Norma'; aprobadoPor: string; cargo: Cargo };
  tipo?: TipoAviso; precio: number | null; cerrado: boolean; cerradoEn: string | null; oculto: boolean; telefono: string | null; reportadaPorMi: boolean;
};
type DatosAviso = { titulo: string; descripcion: string | null; precio: number | null };
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
  // Correo y teléfono que cada vecino cambió desde Perfil (columnas `correo` y `telefono` de `usuarios`)
  const [datosEditados, setDatosEditados] = useState<Record<number, Pick<Cuenta, 'correo' | 'telefono'>>>({});
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
  // P7: filas de `hogar_fichas`. P8: filas de `guias_comunidad` (las edita el panel web; aquí solo se leen)
  const [fichas, setFichas] = useState<HogarFicha[]>(fichasIniciales);
  // P9: `residencias.fecha_guia_vista` que se marcó en esta sesión (id_residencia → fecha)
  const [guiasVistas, setGuiasVistas] = useState<Record<number, string>>({});
  // Quién ya vio el tutorial de la app en esta sesión. No va en la base: con la API se sabrá porque
  // la persona ya tiene alguna residencia con `fecha_guia_vista`.
  const [tutorialesVistos, setTutorialesVistos] = useState<Record<number, true>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useMemo(() => {
    const unidad = id_unidad ? UNIDADES[id_unidad] : null;
    const comunidad = unidad ? comunidadPorId(unidad.id_red)! : null;
    const tiene = (m: Modulo) => tieneModulo(comunidad, m);
    const membresia = cuenta?.membresias.find((m) => m.estado === 'Vigente' && m.id_red === comunidad?.id_red);
    const cargo = membresia ? ROLES[membresia.id_rol] ?? null : null;
    const relacion = cuenta?.residencias.find((r) => r.id_unidad === id_unidad)?.relacion ?? null;
    // Solo el titular vota por la vivienda (la API responde 403 a los demás)
    const esTitular = cuenta?.residencias.some((r) => r.id_unidad === id_unidad && r.titular === 1) ?? false;
    const titularVivienda = id_unidad ? titularDe(id_unidad) : null;
    const nombreTitular = titularVivienda ? `${titularVivienda.nombre} ${titularVivienda.apellido_paterno}` : null;
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
    // Teléfono de una cuenta (`usuarios.telefono`), con lo que cada vecino cambió desde Perfil
    const telefonoDe = (id_usuario: number): string | null => {
      if (id_usuario === cuenta?.id_usuario) return cuenta.telefono;
      if (datosEditados[id_usuario]) return datosEditados[id_usuario].telefono;
      return CUENTAS.find((c) => c.id_usuario === id_usuario)?.telefono ?? TELEFONOS[id_usuario] ?? null;
    };
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
          mia: m.id_usuario === cuenta?.id_usuario, precio: null, cerrado: false, cerradoEn: null, oculto: false, telefono: null, reportadaPorMi: reporteMio('muro', m.id_publicacion),
        };
      }),
      // Avisos publicados (abiertos o cerrados) y todos los míos, también los ocultos. Lo eliminado no aparece.
      // La lista del mercado muestra solo los abiertos; los cerrados y ocultos se ven en «Mis avisos».
      ...productos.filter((x) => x.id_red === id_red && !x.fecha_eliminacion && (x.estado === 1 || x.id_usuario === cuenta?.id_usuario)).map((x): Publicacion => {
        const aceptada = solicitudes.some((s) => s.id_producto === x.id_producto && s.id_usuario === cuenta?.id_usuario && s.estado === 'Aceptada');
        return {
          clave: `mercado-${x.id_producto}`, lugar: 'mercado', id: x.id_producto, id_red: x.id_red, id_usuario: x.id_usuario, id_unidad: x.id_unidad,
          autor: nombreDe(x.id_usuario), titulo: x.titulo, texto: x.descripcion, fecha: x.fecha_publicacion, mia: x.id_usuario === cuenta?.id_usuario,
          tipo: x.tipo, precio: x.precio, cerrado: !!x.cerrado_en, cerradoEn: x.cerrado_en, oculto: x.estado === 0,
          telefono: aceptada && x.estado === 1 ? telefonoDe(x.id_usuario) : null, reportadaPorMi: reporteMio('marketplace', x.id_producto),
        };
      }),
    ];
    // Mis avisos publicados y sin cerrar: la API permite hasta MAX_AVISOS_DISPONIBLES
    const misDisponibles = productos.filter((x) => x.id_red === id_red && x.id_usuario === cuenta?.id_usuario && !x.fecha_eliminacion && x.estado === 1 && !x.cerrado_en).length;
    // El aviso propio que se quiere editar, cerrar o reabrir (la API responde 404 si no es de quien lo pide)
    const avisoPropio = (id_producto: number) => productos.find((x) => x.id_producto === id_producto && x.id_usuario === cuenta?.id_usuario && !x.fecha_eliminacion);
    const cambiarAviso = (id_producto: number, cambios: Partial<ProductoMarketplace>) =>
      setProductos((x) => x.map((y) => (y.id_producto === id_producto ? { ...y, ...cambios } : y)));
    // Lo que valida la API al publicar y editar: título de 3 a 100, descripción hasta 500, precio hasta 99.999.999
    const errorAviso = (a: DatosAviso, tipo: TipoAviso) =>
      a.titulo.trim().length < MIN_TITULO_AVISO || a.titulo.length > MAX_TITULO_AVISO ? `El título debe tener entre ${MIN_TITULO_AVISO} y ${MAX_TITULO_AVISO} caracteres.`
        : (a.descripcion?.length ?? 0) > MAX_DESCRIPCION_AVISO ? `La descripción admite hasta ${MAX_DESCRIPCION_AVISO} caracteres.`
          : tipo === 'Busco' && a.precio != null ? 'Un aviso de «Busco» no lleva precio.'
            : a.precio != null && (a.precio < 0 || a.precio > PRECIO_MAXIMO) ? `El precio puede ser hasta ${PRECIO_MAXIMO.toLocaleString('es-CL')}.`
              : null;

    // Nombre de la visita (con la API, un JOIN con `visitantes`)
    const nombreVisitante = (id: number) => {
      const v = visitantes.find((x) => x.id_visitante === id);
      return v ? [v.nombre, v.apellido].filter(Boolean).join(' ') : 'Visita';
    };

    // La residencia con la que actúa (para saber si ya vio la guía de bienvenida de esta unidad)
    const miResidencia = cuenta?.residencias.find((r) => r.id_unidad === id_unidad && r.estado === 'Activa') ?? null;
    const guiaVista = miResidencia ? guiasVistas[miResidencia.id_residencia] ?? miResidencia.fecha_guia_vista : null;
    const filaGuia = GUIAS.find((g) => g.id_red === id_red) ?? null;
    const diasBasura = diasDe(filaGuia);
    // La guía como la armará la API: su fila más los espacios (si hay reservas) y los contactos visibles
    const guia = comunidad ? {
      ...filaGuia,
      firma: filaGuia?.id_usuario_actualiza ? `${PERSONAS[filaGuia.id_usuario_actualiza]?.nombre ?? 'La administración'}${PERSONAS[filaGuia.id_usuario_actualiza]?.cargo ? ` · ${roles[PERSONAS[filaGuia.id_usuario_actualiza]!.cargo!].label}` : ''}` : null,
      diasBasura,
      tieneBasura: !!(diasBasura.length || filaGuia?.basura_lugar || filaGuia?.reciclaje_lugar),
      espacios: tieneModulo(comunidad, 'reservas') ? espaciosActivos(comunidad) : [],
      contactos: CONTACTOS.filter((k) => k.id_red === comunidad.id_red && k.visible === 1),
      emergencias: EMERGENCIAS,
    } : null;
    const misFichas = fichas.filter((f) => f.id_unidad === id_unidad);

    const acciones = {
      iniciarSesion: (c: Cuenta) => { setCuenta({ ...c, ...datosEditados[c.id_usuario] }); setIdUnidad(c.residencias.find((r) => r.estado === 'Activa')!.id_unidad); },
      cerrarSesion: () => { setCuenta(null); setIdUnidad(null); },
      // La API hará UPDATE de `usuarios` (el correo es único: si ya lo usa otra cuenta, responde con error)
      actualizarDatos: (datos: Pick<Cuenta, 'correo' | 'telefono'>) => {
        if (!cuenta) return;
        setCuenta({ ...cuenta, ...datos });
        setDatosEditados((x) => ({ ...x, [cuenta.id_usuario]: datos }));
        avisar('Tus datos quedaron actualizados.');
      },
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
      // Como la API: el horario no puede haber pasado ni estar tomado, y la vivienda tiene hasta 2 horarios por día en un espacio
      reservar: (r: Pick<Reserva, 'id_espacio' | 'fecha_reserva' | 'hora_inicio' | 'hora_fin' | 'cantidad_invitados'>) => {
        const activa = (y: Reserva) => y.estado_reserva !== 'Cancelada' && y.estado_reserva !== 'Rechazada';
        const delDia = reservas.filter((y) => activa(y) && y.id_espacio === r.id_espacio && y.fecha_reserva === r.fecha_reserva);
        if (yaPaso(r.fecha_reserva, r.hora_inicio)) { avisar('Ese horario ya pasó.'); return; }
        if (delDia.some((y) => y.hora_inicio < r.hora_fin && r.hora_inicio < y.hora_fin)) { avisar('Ese horario ya está reservado.'); return; }
        if (delDia.filter((y) => y.id_unidad === id_unidad).length >= MAX_BLOQUES_POR_DIA) {
          avisar(`Tu vivienda ya tiene ${MAX_BLOQUES_POR_DIA} horarios de ${espacioDe(r.id_espacio)} ese día.`);
          return;
        }
        setReservas((x) => [...x, {
          ...r, id_reserva: x.reduce((m, y) => Math.max(m, y.id_reserva), 0) + 1, id_usuario: cuenta!.id_usuario, id_unidad: id_unidad!,
          estado_reserva: 'Aprobada', motivo_cancelacion: null, observaciones_recepcion: null, fecha_solicitud: new Date().toISOString().slice(0, 19),
        }]);
        avisar(`${espacioDe(r.id_espacio)} reservado.`);
      },
      // Solo hasta 24 horas antes y si no se entregó el espacio; el residente cancela sin motivo
      cancelarReserva: (id_reserva: number) => {
        const r = reservas.find((y) => y.id_reserva === id_reserva);
        if (!r || !puedeCancelarResidente(r)) {
          avisar(`Ya no puedes cancelarla: faltan menos de ${HORAS_PARA_CANCELAR} horas. Habla con la administración.`);
          return;
        }
        setReservas((x) => x.map((y) => (y.id_reserva === id_reserva ? { ...y, estado_reserva: 'Cancelada' } : y)));
        avisar('Reserva cancelada. El espacio quedó libre para otros vecinos.');
      },
      // Devuelve si se publicó. En el mercado, como la API: hace falta un teléfono en el perfil (es lo
      // que se comparte al aceptar a un vecino) y se pueden tener hasta 20 avisos disponibles.
      publicar: (p: { lugar: 'muro'; contenido: string } | ({ lugar: 'mercado'; tipo: TipoAviso } & DatosAviso)): boolean => {
        if (!cuenta || !id_unidad || !id_red) return false;
        if (p.lugar === 'muro') {
          setMuro((x) => [...x, {
            id_publicacion: siguiente(x, (f) => f.id_publicacion), id_red, id_usuario: cuenta.id_usuario, id_unidad, tipo: 'Vecino', titulo: null, contenido: p.contenido,
            fecha_creacion: ahora(), estado_aprobacion: 'Aprobada', id_aprobador: null, fecha_aprobacion: null, estado: 1, id_moderador: null, fecha_moderacion: null,
          }]);
          avisar('Publicado en el muro.');
          return true;
        }
        if (!cuenta.telefono) { avisar('Agrega tu teléfono en Mis datos antes de publicar: es el dato que se comparte cuando aceptas a un vecino.'); return false; }
        if (misDisponibles >= MAX_AVISOS_DISPONIBLES) {
          avisar(`Puedes tener hasta ${MAX_AVISOS_DISPONIBLES} avisos disponibles. Marca alguno como vendido o elimínalo para publicar otro.`);
          return false;
        }
        const error = errorAviso(p, p.tipo);
        if (error) { avisar(error); return false; }
        setProductos((x) => [...x, {
          id_producto: siguiente(x, (f) => f.id_producto), id_red, id_usuario: cuenta.id_usuario, id_unidad, tipo: p.tipo,
          titulo: p.titulo, descripcion: p.descripcion, precio: p.tipo === 'Busco' ? null : p.precio, fecha_publicacion: ahora(), cerrado_en: null,
          estado: 1, id_moderador: null, fecha_moderacion: null, fecha_eliminacion: null,
        }]);
        avisar('Tu aviso ya está en el mercado.');
        return true;
      },
      // Solo título, descripción y precio (el tipo no cambia). No se edita si está oculto o cerrado.
      editarAviso: (id_producto: number, a: DatosAviso): boolean => {
        const x = avisoPropio(id_producto);
        if (!x) return false;
        if (x.estado === 0) { avisar('El aviso está oculto por la administración: no puedes editarlo.'); return false; }
        if (x.cerrado_en) { avisar('Reabre el aviso para editarlo.'); return false; }
        const error = errorAviso(a, x.tipo);
        if (error) { avisar(error); return false; }
        cambiarAviso(id_producto, { titulo: a.titulo, descripcion: a.descripcion, precio: a.precio });
        avisar('Aviso actualizado.');
        return true;
      },
      // Vendido o ya no disponible: las solicitudes que esperaban respuesta quedan rechazadas
      cerrarAviso: (id_producto: number) => {
        const x = avisoPropio(id_producto);
        if (!x) return;
        if (x.cerrado_en) { avisar('El aviso ya está marcado como cerrado.'); return; }
        const cuando = ahora();
        cambiarAviso(id_producto, { cerrado_en: cuando });
        setSolicitudes((s) => s.map((y) => (y.id_producto === id_producto && y.estado === 'Pendiente' ? { ...y, estado: 'Rechazada', fecha_respuesta: cuando, vista: 0 } : y)));
        avisar(x.tipo === 'Vendo' ? 'Marcado como vendido. Ya no aparece en el mercado.' : 'Aviso cerrado. Ya no aparece en el mercado.');
      },
      // Vuelve al mercado; las solicitudes que se rechazaron al cerrarlo vuelven a esperar respuesta
      reabrirAviso: (id_producto: number) => {
        const x = avisoPropio(id_producto);
        if (!x) return;
        if (!x.cerrado_en) { avisar('El aviso no está cerrado.'); return; }
        if (misDisponibles >= MAX_AVISOS_DISPONIBLES) {
          avisar(`Puedes tener hasta ${MAX_AVISOS_DISPONIBLES} avisos disponibles. Marca alguno como vendido o elimínalo para reabrir este.`);
          return;
        }
        cambiarAviso(id_producto, { cerrado_en: null });
        setSolicitudes((s) => s.map((y) => (y.id_producto === id_producto && y.estado === 'Rechazada' && y.fecha_respuesta === x.cerrado_en ? { ...y, estado: 'Pendiente', fecha_respuesta: null, vista: 0 } : y)));
        avisar(x.estado === 1 ? 'Aviso disponible otra vez en el mercado.' : 'Aviso reabierto. Sigue oculto por la administración.');
      },
      // Quien publicó la elimina. En el muro queda con estado 0 y sin moderador; en el mercado, con fecha de eliminación
      eliminarPublicacion: (p: Publicacion) => {
        if (p.lugar === 'muro') setMuro((x) => x.map((m) => (m.id_publicacion === p.id ? { ...m, estado: 0 } : m)));
        else if (avisoPropio(p.id)) cambiarAviso(p.id, { fecha_eliminacion: ahora() });
        avisar('Publicación eliminada.');
      },
      // El motivo es obligatorio: la administración lo ve al moderar. No se reporta lo propio ni dos veces.
      reportar: (p: Publicacion, motivo: string) => {
        if (!cuenta) return;
        if (p.mia) { avisar('No puedes reportar tu propia publicación.'); return; }
        if (p.reportadaPorMi) { avisar('Ya reportaste esta publicación.'); return; }
        setReportes((x) => [...x, {
          id_reporte: siguiente(x, (f) => f.id_reporte), tipo_publicacion: p.lugar === 'muro' ? 'muro' : 'marketplace', id_publicacion: p.id,
          id_usuario: cuenta.id_usuario, motivo, fecha: ahora(), estado: 'Pendiente',
        }]);
        avisar('Gracias. La administración revisará la publicación.');
      },
      // Contacto en el mercado: la API notificará a quien publicó y, al responder, al interesado
      // Como la API: no en avisos propios ni cerrados, y una sola solicitud por aviso
      pedirContacto: (id_producto: number) => {
        if (!cuenta || !id_unidad) return;
        const p = productos.find((x) => x.id_producto === id_producto && x.id_red === id_red && x.estado === 1 && !x.fecha_eliminacion);
        if (!p) { avisar('Este aviso ya no está disponible.'); return; }
        if (p.id_usuario === cuenta.id_usuario) { avisar('No puedes pedir contacto por tu propio aviso.'); return; }
        if (p.cerrado_en) { avisar('Este aviso ya no está disponible.'); return; }
        const existente = solicitudes.find((s) => s.id_producto === id_producto && s.id_usuario === cuenta.id_usuario);
        if (existente) {
          avisar(existente.estado === 'Pendiente' ? 'Ya le pediste contacto por este aviso. Espera su respuesta.'
            : existente.estado === 'Aceptada' ? 'Ya tienes el contacto de este aviso.' : 'Este aviso ya no está disponible.');
          return;
        }
        setSolicitudes((x) => [...x, {
          id_solicitud: siguiente(x, (f) => f.id_solicitud), id_producto, id_usuario: cuenta.id_usuario, id_unidad,
          estado: 'Pendiente', fecha_solicitud: ahora(), fecha_respuesta: null, vista: 0,
        }]);
        avisar(`Le avisamos a ${nombreDe(p.id_usuario).split(' ')[0]} que te interesa su aviso.`);
      },
      // Solo mientras espera respuesta
      cancelarSolicitud: (id_solicitud: number) => {
        const s = solicitudes.find((x) => x.id_solicitud === id_solicitud);
        if (!s || s.estado !== 'Pendiente') { avisar('Solo puedes cancelar una solicitud que aún no tiene respuesta.'); return; }
        setSolicitudes((x) => x.filter((y) => y.id_solicitud !== id_solicitud));
        avisar('Solicitud cancelada.');
      },
      // Para aceptar hay que tener teléfono (es lo que se comparte). No se responde si el aviso está oculto o cerrado.
      responderSolicitud: (id_solicitud: number, acepta: boolean) => {
        const s = solicitudes.find((x) => x.id_solicitud === id_solicitud);
        const p = s ? avisoPropio(s.id_producto) : undefined;
        if (!s || !p) return;
        if (s.estado !== 'Pendiente') { avisar('Esta solicitud ya fue respondida.'); return; }
        if (acepta && !cuenta?.telefono) { avisar('Agrega tu teléfono en Mis datos antes de aceptar: es el dato que se comparte con tu vecino.'); return; }
        if (p.estado === 0) { avisar('El aviso está oculto por la administración: no puedes responder solicitudes.'); return; }
        if (p.cerrado_en) { avisar('El aviso está cerrado: reábrelo para responder solicitudes.'); return; }
        setSolicitudes((x) => x.map((y) => (y.id_solicitud === id_solicitud ? { ...y, estado: acepta ? 'Aceptada' : 'Rechazada', fecha_respuesta: ahora(), vista: 0 } : y)));
        const nombre = nombreDe(s.id_usuario).split(' ')[0];
        avisar(acepta ? `Le enviamos tu teléfono a ${nombre}.` : `Le avisamos a ${nombre} que ya no está disponible.`);
      },
      marcarRespuestaVista: (id_solicitud: number) => setSolicitudes((x) => x.map((y) => (y.id_solicitud === id_solicitud ? { ...y, vista: 1 } : y))),
      // Fila nueva de `votos`: la unidad vota una vez (UNIQUE id_votacion + id_unidad)
      votar: (id_votacion: number, id_opcion: number) => {
        if (!cuenta || !id_unidad) return;
        if (!esTitular) {
          avisar(nombreTitular ? `En tu vivienda vota ${nombreTitular}, la persona titular.` : 'Solo la persona titular de la vivienda puede votar.');
          return;
        }
        setVotos((x) => (x.some((v) => v.id_votacion === id_votacion && v.id_unidad === id_unidad) ? x : [...x, {
          id_voto: x.reduce((m, v) => Math.max(m, v.id_voto), 0) + 1, id_votacion, id_opcion, id_unidad, id_usuario: cuenta.id_usuario, fecha: ahora(),
        }]));
        avisar('Voto registrado por tu vivienda.');
      },
      // La API hará INSERT o UPDATE de `hogar_fichas`; solo lo permite a residentes activos de la unidad
      guardarFicha: (f: Omit<HogarFicha, 'id_ficha' | 'id_unidad' | 'id_usuario_crea' | 'fecha_registro'> & { id_ficha?: number }) => {
        if (!cuenta || !id_unidad) return null;
        const id_ficha = f.id_ficha ?? siguiente(fichas, (x) => x.id_ficha);
        if (f.id_ficha) setFichas((x) => x.map((y) => (y.id_ficha === f.id_ficha ? { ...y, ...f, id_ficha } : y)));
        else setFichas((x) => [...x, { ...f, id_ficha, id_unidad, id_usuario_crea: cuenta.id_usuario, fecha_registro: ahora() }]);
        avisar(f.id_ficha ? 'Ficha actualizada.' : 'Ficha guardada en Mi hogar.');
        return id_ficha;
      },
      eliminarFicha: (id_ficha: number) => {
        setFichas((x) => x.filter((y) => y.id_ficha !== id_ficha));
        avisar('Ficha eliminada.');
      },
      // Una mantención hecha hoy: la fecha pasa a hoy y la próxima se corre lo mismo que el intervalo anterior
      registrarMantencion: (id_ficha: number) => {
        const hoy = diaISO();
        setFichas((x) => x.map((y) => {
          if (y.id_ficha !== id_ficha) return y;
          const meses = y.fecha && y.fecha_vence ? Math.max(1, Math.round((new Date(y.fecha_vence).getTime() - new Date(y.fecha).getTime()) / (30.44 * 86400000))) : 12;
          const prox = new Date(); prox.setMonth(prox.getMonth() + meses);
          return { ...y, fecha: hoy, fecha_vence: diaISO(prox) };
        }));
        avisar('Mantención registrada. Te avisaremos antes de la próxima.');
      },
      // UPDATE `residencias` SET fecha_guia_vista = NOW() (también al saltarla)
      marcarTutorialVisto: () => {
        if (cuenta) setTutorialesVistos((x) => ({ ...x, [cuenta.id_usuario]: true }));
      },
      marcarGuiaVista: () => {
        if (miResidencia && !guiaVista) setGuiasVistas((x) => ({ ...x, [miResidencia.id_residencia]: ahora() }));
      },
      avisar,
    };

    // Como la API: solicitudes de avisos publicados (abiertos o cerrados, no ocultos ni eliminados):
    // las que hice yo y las que llegaron a mis avisos
    const enMercado = new Set(publicaciones.filter((p) => p.lugar === 'mercado' && !p.oculto).map((p) => p.id));
    const avisosMios = new Set(publicaciones.filter((p) => p.lugar === 'mercado' && p.mia).map((p) => p.id));
    const vigentes = solicitudes.filter((s) => enMercado.has(s.id_producto));
    const misSolicitudes = vigentes.filter((s) => s.id_usuario === cuenta?.id_usuario);
    const solicitudesRecibidas = vigentes.filter((s) => avisosMios.has(s.id_producto));

    return {
      cuenta, unidad, comunidad, cargo, relacion, esTitular, nombreTitular, tiene, aviso,
      estado,
      misInvitaciones: invitaciones.filter((i) => i.id_unidad === id_unidad)
        .map((i) => ({ ...i, visitante: nombreVisitante(i.id_visitante), rut: visitantes.find((v) => v.id_visitante === i.id_visitante)?.rut ?? null })),
      reservasComunidad: reservas.filter((r) => idsEspacios.has(r.id_espacio) && r.estado_reserva !== 'Cancelada' && r.estado_reserva !== 'Rechazada'),
      espacioDe,
      misReservas: reservas.filter((r) => r.id_unidad === id_unidad),
      enPorteria: accesos.filter((a) => a.id_unidad === id_unidad && a.estado_autorizacion === 'Pendiente de Confirmación')
        .map((a) => ({ ...a, persona: nombreVisitante(a.id_visitante) })),
      publicaciones,
      misDisponibles,
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
      misFichas,
      // Mantenciones y garantías que vencen en 30 días o menos (y las vencidas hace poco), la más próxima primero
      fichasPorVencer: misFichas.filter((f) => f.fecha_vence && Math.abs(diasHasta(f.fecha_vence)) <= 30)
        .sort((a, b) => a.fecha_vence!.localeCompare(b.fecha_vence!)),
      guia,
      guiaPendiente: !!miResidencia && !guiaVista,
      // El tutorial de la app va antes de la primera guía de bienvenida de la persona (no al cambiarse de vivienda)
      tutorialPendiente: !!miResidencia && !guiaVista && !!cuenta && !tutorialesVistos[cuenta.id_usuario]
        && !cuenta.residencias.some((r) => guiasVistas[r.id_residencia] ?? r.fecha_guia_vista),
      // Aviso de Inicio: solo si la basura pasa algunos días (si es todos los días no es noticia)
      basuraHoy: diasBasura.length > 0 && diasBasura.length < 7 && diasBasura.includes(diaSemanaHoy()),
      miVoto: (id_votacion: number) => votos.find((v) => v.id_votacion === id_votacion && v.id_unidad === id_unidad)?.id_opcion ?? null,
      acciones,
    };
  }, [cuenta, datosEditados, id_unidad, cuentas, visitantes, invitaciones, accesos, reservas, muro, productos, reportes, solicitudes, votos, fichas, guiasVistas, tutorialesVistos, aviso]);
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
