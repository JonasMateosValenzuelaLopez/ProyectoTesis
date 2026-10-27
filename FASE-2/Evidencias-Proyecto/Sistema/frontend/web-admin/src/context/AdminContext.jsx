import { createContext, useContext, useMemo, useReducer } from 'react';
import { useSesion } from './SesionContext';
import { useFinanzas } from './FinanzasContext';
import { adminInicial, adminVacio } from '../data/adminMock';
import { MODULOS } from '../config/modulos';
import { roles } from '../tokens';
import { nombreUnidad } from '../utils/formato';

// Estado de Administración de cada comunidad: usuarios con sus residencias y cargos,
// solicitudes de acceso y moderación del muro. Los datos de la comunidad, sus unidades
// y módulos viven en la sesión para que todo el panel los vea al instante.
const AdminContext = createContext(null);

const nuevoId = (prefijo) => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const hoy = () => new Date().toISOString().slice(0, 10);

// Cargos que solo puede tener una persona a la vez en cada comunidad
// eslint-disable-next-line react-refresh/only-export-components
export const CARGOS_UNICOS = ['presidente', 'tesorero', 'secretario', 'administrador'];
const ORDEN_DIRECTIVA = ['presidente', 'tesorero', 'secretario', 'administrador'];

function reducer(state, { tipo, idRed, ...p }) {
  const d = state[idRed];
  const con = (cambios) => ({ ...state, [idRed]: { ...d, ...cambios } });
  const conUsuario = (id, fn) => con({ usuarios: d.usuarios.map((u) => (u.id === id ? fn(u) : u)) });

  switch (tipo) {
    case 'asignarCargo': {
      const nuevo = { cargo: p.cargo, desde: hoy(), hasta: p.hasta ?? '' };
      const unico = CARGOS_UNICOS.includes(p.cargo);
      return con({
        usuarios: d.usuarios.map((u) => {
          if (u.id === p.idUsuario) return { ...u, cargos: [...u.cargos.filter((c) => c.cargo !== p.cargo), nuevo] };
          return unico ? { ...u, cargos: u.cargos.filter((c) => c.cargo !== p.cargo) } : u;
        }),
      });
    }
    case 'quitarCargo':
      return conUsuario(p.idUsuario, (u) => ({ ...u, cargos: u.cargos.filter((c) => c.cargo !== p.cargo) }));
    case 'cambiarEstado':
      return conUsuario(p.idUsuario, (u) => ({ ...u, estado: p.estado, ...(p.estado === 'desactivado' ? { cargos: [] } : {}) }));
    case 'invitar':
      return con({ usuarios: [...d.usuarios, { ...p.usuario, id: nuevoId('u'), estado: 'invitado', cargos: [], registro: hoy() }] });
    case 'resolverSolicitud': {
      const s = d.solicitudes.find((x) => x.id === p.id);
      const solicitudes = d.solicitudes.filter((x) => x.id !== p.id);
      if (!p.aprobada) return con({ solicitudes });
      const usuario = {
        id: nuevoId('u'), nombre: s.nombre, rut: s.rut, correo: s.correo, telefono: '', estado: 'activo',
        residencias: [{ idUnidad: s.idUnidad, relacion: s.relacion }], cargos: [], registro: hoy(),
      };
      return con({ solicitudes, usuarios: [...d.usuarios, usuario] });
    }
    case 'moderar':
      return con({
        publicaciones: d.publicaciones.map((x) => {
          if (x.id !== p.id) return x;
          if (p.accion === 'descartar') return { ...x, reportes: [] };
          return { ...x, estado: p.accion === 'ocultar' ? 'oculta' : 'visible', moderadaPor: p.actor };
        }),
      });
    default:
      return state;
  }
}

export function AdminProvider({ children }) {
  const { usuario: yo, comunidad, actualizarComunidad, redes } = useSesion();
  const { acciones: finanzas } = useFinanzas();
  const [state, dispatch] = useReducer(reducer, null, () => {
    const inicial = adminInicial();
    redes.forEach((r) => { inicial[r.id] ??= adminVacio(r); });
    return inicial;
  });
  const idRed = comunidad.id;
  const d = state[idRed];

  const valor = useMemo(() => {
    const unidadPorId = Object.fromEntries(comunidad.unidades.map((u) => [u.id, u]));
    const usuarioPorId = Object.fromEntries(d.usuarios.map((u) => [u.id, u]));
    const activos = d.usuarios.filter((u) => u.estado !== 'desactivado');

    // Ocupación de cada unidad según las residencias vigentes
    const ocupantes = {};
    activos.forEach((u) => u.residencias.forEach((r) => { (ocupantes[r.idUnidad] ??= []).push({ ...u, relacion: r.relacion }); }));

    const directiva = ORDEN_DIRECTIVA.flatMap((cargo) => activos
      .filter((u) => u.cargos.some((c) => c.cargo === cargo))
      .map((u) => ({
        cargo, nombre: u.nombre, idUsuario: u.id,
        unidad: u.residencias[0] ? nombreUnidad(unidadPorId[u.residencias[0].idUnidad]) : cargo === 'administrador' ? 'Administración externa' : 'Sin unidad registrada',
        ...u.cargos.find((c) => c.cargo === cargo),
      })));

    const reportadas = d.publicaciones.filter((x) => x.estado === 'visible' && x.reportes.length > 0);

    const acciones = {
      asignarCargo: (idUsuario, cargo, hasta) => {
        const anterior = CARGOS_UNICOS.includes(cargo) ? activos.find((u) => u.id !== idUsuario && u.cargos.some((c) => c.cargo === cargo)) : null;
        dispatch({ tipo: 'asignarCargo', idRed, idUsuario, cargo, hasta });
        const nombre = usuarioPorId[idUsuario].nombre;
        finanzas.anotar('Asignó un cargo', `${nombre} como ${roles[cargo].label}${anterior ? `, en reemplazo de ${anterior.nombre}` : ''}`,
          `${nombre} ahora es ${roles[cargo].label}.`);
      },
      quitarCargo: (idUsuario, cargo) => {
        dispatch({ tipo: 'quitarCargo', idRed, idUsuario, cargo });
        finanzas.anotar('Quitó un cargo', `${usuarioPorId[idUsuario].nombre} dejó de ser ${roles[cargo].label}`, 'Cargo quitado.');
      },
      cambiarEstado: (idUsuario, estado) => {
        dispatch({ tipo: 'cambiarEstado', idRed, idUsuario, estado });
        const nombre = usuarioPorId[idUsuario].nombre;
        finanzas.anotar(estado === 'desactivado' ? 'Desactivó un usuario' : 'Reactivó un usuario', nombre,
          estado === 'desactivado' ? `${nombre} ya no puede entrar a la comunidad.` : `${nombre} puede volver a entrar.`);
      },
      reenviarInvitacion: (idUsuario) => {
        finanzas.anotar('Reenvió una invitación', usuarioPorId[idUsuario].correo, `Invitación reenviada a ${usuarioPorId[idUsuario].correo}.`);
      },
      invitar: (usuario) => {
        dispatch({ tipo: 'invitar', idRed, usuario });
        finanzas.anotar('Invitó a un residente', `${usuario.nombre} · ${nombreUnidad(unidadPorId[usuario.residencias[0].idUnidad])}`,
          `Invitación enviada a ${usuario.correo}.`);
      },
      resolverSolicitud: (id, aprobada) => {
        const s = d.solicitudes.find((x) => x.id === id);
        dispatch({ tipo: 'resolverSolicitud', idRed, id, aprobada });
        finanzas.anotar(aprobada ? 'Aprobó una solicitud de acceso' : 'Rechazó una solicitud de acceso', `${s.nombre} · ${nombreUnidad(unidadPorId[s.idUnidad])}`,
          aprobada ? `${s.nombre} ya puede entrar a la app.` : 'Solicitud rechazada. Se le avisó por correo.');
      },
      moderar: (pub, accion) => {
        dispatch({ tipo: 'moderar', idRed, id: pub.id, accion, actor: `${yo.nombre} ${yo.apellido}` });
        const textos = { ocultar: ['Ocultó una publicación', 'Publicación oculta. Su autor recibió un aviso.'], restaurar: ['Restauró una publicación', 'Publicación visible otra vez.'], descartar: ['Descartó reportes', 'Reportes descartados. La publicación sigue visible.'] };
        finanzas.anotar(textos[accion][0], `«${pub.texto.slice(0, 60)}${pub.texto.length > 60 ? '…' : ''}» de ${nombreUnidad(unidadPorId[pub.idUnidad])}`, textos[accion][1]);
      },
      guardarComunidad: (cambios) => {
        actualizarComunidad(cambios);
        finanzas.anotar('Editó los datos de la comunidad', Object.keys(cambios).join(', '), 'Datos de la comunidad guardados.');
      },
      cambiarModulo: (modulo, activo) => {
        actualizarComunidad((c) => ({ modulos: activo ? [...c.modulos, modulo] : c.modulos.filter((m) => m !== modulo) }));
        finanzas.anotar('Cambió los módulos', `${activo ? 'Activó' : 'Desactivó'} ${MODULOS[modulo]}`, `${MODULOS[modulo]}: ${activo ? 'activado' : 'desactivado'}.`);
      },
      crearUnidades: (nuevas) => {
        actualizarComunidad((c) => ({ unidades: [...c.unidades, ...nuevas] }));
        finanzas.anotar('Creó unidades', `${nuevas.length} unidades: ${nombreUnidad(nuevas[0])} a ${nombreUnidad(nuevas.at(-1))}`, `${nuevas.length} unidades creadas.`);
      },
      editarUnidad: (unidad) => {
        actualizarComunidad((c) => ({ unidades: c.unidades.map((u) => (u.id === unidad.id ? { ...u, ...unidad } : u)) }));
        finanzas.anotar('Editó una unidad', nombreUnidad(unidad), 'Unidad guardada.');
      },
    };

    return {
      ...d, unidadPorId, usuarioPorId, ocupantes, directiva, reportadas,
      solicitudesPendientes: d.solicitudes,
      acciones,
    };
  }, [d, idRed, comunidad, actualizarComunidad, finanzas, yo]);

  return <AdminContext.Provider value={valor}>{children}</AdminContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin() {
  return useContext(AdminContext);
}
