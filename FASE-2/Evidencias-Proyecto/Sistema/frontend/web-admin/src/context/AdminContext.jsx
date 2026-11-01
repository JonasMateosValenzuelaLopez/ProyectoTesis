import { createContext, useContext, useMemo, useReducer } from 'react';
import { useSesion } from './SesionContext';
import { useFinanzas } from './FinanzasContext';
import { adminInicial, adminVacio } from '../data/adminMock';
import { MODULOS, conModulo } from '../config/modulos';
import { ID_ROL, cargoDe, cargosDe, membresiasVigentes, residenciasActivas } from '../config/roles';
import { roles } from '../tokens';
import { nombreCompleto, nombreUnidad } from '../utils/formato';

// Estado de Administración de cada comunidad: usuarios con sus residencias y cargos,
// y solicitudes de acceso. Los datos de la comunidad, sus unidades
// y módulos viven en la sesión para que todo el panel los vea al instante.
const AdminContext = createContext(null);

const nuevoId = () => Date.now() + Math.floor(Math.random() * 1000);
const hoy = () => new Date().toISOString().slice(0, 10);
const ahora = () => new Date().toISOString().slice(0, 19);

// Cargos que solo puede tener una persona a la vez en cada comunidad
// eslint-disable-next-line react-refresh/only-export-components
export const CARGOS_UNICOS = ['presidente', 'tesorero', 'secretario', 'administrador'];
const ORDEN_DIRECTIVA = ['presidente', 'tesorero', 'secretario', 'administrador'];

// Termina las membresías vigentes que cumplen `fn` (quedan en la base como historial)
const terminar = (u, fn) => ({
  ...u,
  membresias: u.membresias.map((m) => (m.estado === 'Vigente' && fn(m) ? { ...m, estado: 'Terminada', fecha_hasta: hoy() } : m)),
});

function reducer(state, { tipo, id_red, ...p }) {
  const d = state[id_red];
  const con = (cambios) => ({ ...state, [id_red]: { ...d, ...cambios } });
  const conUsuario = (id, fn) => con({ usuarios: d.usuarios.map((u) => (u.id_usuario === id ? fn(u) : u)) });

  switch (tipo) {
    case 'asignarCargo': {
      const id_rol = ID_ROL[p.cargo];
      const nueva = { id_membresia: nuevoId(), id_usuario: p.id_usuario, id_red, id_rol, fecha_desde: hoy(), fecha_hasta: p.hasta || null, estado: 'Vigente' };
      const unico = CARGOS_UNICOS.includes(p.cargo);
      return con({
        usuarios: d.usuarios.map((u) => {
          if (u.id_usuario === p.id_usuario) {
            const sin = terminar(u, (m) => m.id_rol === id_rol);
            return { ...sin, membresias: [...sin.membresias, nueva] };
          }
          return unico ? terminar(u, (m) => m.id_rol === id_rol) : u;
        }),
      });
    }
    case 'quitarCargo':
      return conUsuario(p.id_usuario, (u) => terminar(u, (m) => m.id_rol === ID_ROL[p.cargo]));
    case 'cambiarEstado':
      return conUsuario(p.id_usuario, (u) => {
        const conEstado = { ...u, estado: p.estado };
        return p.estado === 'Desactivado' ? terminar(conEstado, () => true) : conEstado;
      });
    case 'invitar': {
      const id_usuario = nuevoId();
      const { residencias, ...datos } = p.usuario;
      return con({
        usuarios: [...d.usuarios, {
          ...datos, id_usuario, estado: 'Invitado', fecha_registro: ahora(), membresias: [],
          residencias: residencias.map((r) => ({
            id_residencia: nuevoId(), id_usuario, ...r, estado: 'Activa', mensaje: null,
            fecha_solicitud: ahora(), id_usuario_resuelve: p.actor, fecha_resolucion: ahora(),
          })),
        }],
      });
    }
    case 'resolverSolicitud': {
      const s = d.solicitudes.find((x) => x.id_residencia === p.id_residencia);
      const solicitudes = d.solicitudes.filter((x) => x.id_residencia !== p.id_residencia);
      if (!p.aprobada) return con({ solicitudes });
      const { usuario, ...fila } = s;
      const res = { ...fila, estado: 'Activa', id_usuario_resuelve: p.actor, fecha_resolucion: ahora() };
      const existe = d.usuarios.some((u) => u.id_usuario === usuario.id_usuario);
      return con({
        solicitudes,
        usuarios: existe
          ? d.usuarios.map((u) => (u.id_usuario === usuario.id_usuario ? { ...u, residencias: [...u.residencias, res] } : u))
          : [...d.usuarios, { ...usuario, residencias: [res], membresias: [] }],
      });
    }
    default:
      return state;
  }
}

export function AdminProvider({ children }) {
  const { usuario: yo, comunidad, actualizarComunidad, redes } = useSesion();
  const { acciones: finanzas } = useFinanzas();
  const [state, dispatch] = useReducer(reducer, null, () => {
    const inicial = adminInicial();
    redes.forEach((r) => { inicial[r.id_red] ??= adminVacio(r); });
    return inicial;
  });
  const id_red = comunidad.id_red;
  const d = state[id_red];

  const valor = useMemo(() => {
    const unidadPorId = Object.fromEntries(comunidad.unidades.map((u) => [u.id_unidad, u]));
    const usuarioPorId = Object.fromEntries(d.usuarios.map((u) => [u.id_usuario, u]));
    const activos = d.usuarios.filter((u) => u.estado !== 'Desactivado');
    const cargos = (u) => cargosDe(u, id_red);

    // Ocupación de cada unidad según las residencias vigentes
    const ocupantes = {};
    activos.forEach((u) => residenciasActivas(u).forEach((r) => { (ocupantes[r.id_unidad] ??= []).push({ ...u, relacion: r.relacion }); }));

    const directiva = ORDEN_DIRECTIVA.flatMap((cargo) => activos
      .filter((u) => cargos(u).includes(cargo))
      .map((u) => {
        const casa = residenciasActivas(u)[0];
        const m = u.membresias.find((x) => x.estado === 'Vigente' && x.id_red === id_red && x.id_rol === ID_ROL[cargo]);
        return {
          cargo, nombre: nombreCompleto(u), id_usuario: u.id_usuario,
          unidad: casa ? nombreUnidad(unidadPorId[casa.id_unidad]) : cargo === 'administrador' ? 'Administración externa' : 'Sin unidad registrada',
          desde: m.fecha_desde, hasta: m.fecha_hasta ?? '',
        };
      }));

    const acciones = {
      asignarCargo: (id_usuario, cargo, hasta) => {
        const anterior = CARGOS_UNICOS.includes(cargo) ? activos.find((u) => u.id_usuario !== id_usuario && cargos(u).includes(cargo)) : null;
        dispatch({ tipo: 'asignarCargo', id_red, id_usuario, cargo, hasta });
        const nombre = nombreCompleto(usuarioPorId[id_usuario]);
        finanzas.anotar('Asignó un cargo', `${nombre} como ${roles[cargo].label}${anterior ? `, en reemplazo de ${nombreCompleto(anterior)}` : ''}`,
          `${nombre} ahora es ${roles[cargo].label}.`);
      },
      quitarCargo: (id_usuario, cargo) => {
        dispatch({ tipo: 'quitarCargo', id_red, id_usuario, cargo });
        finanzas.anotar('Quitó un cargo', `${nombreCompleto(usuarioPorId[id_usuario])} dejó de ser ${roles[cargo].label}`, 'Cargo quitado.');
      },
      cambiarEstado: (id_usuario, estado) => {
        dispatch({ tipo: 'cambiarEstado', id_red, id_usuario, estado });
        const nombre = nombreCompleto(usuarioPorId[id_usuario]);
        finanzas.anotar(estado === 'Desactivado' ? 'Desactivó un usuario' : 'Reactivó un usuario', nombre,
          estado === 'Desactivado' ? `${nombre} ya no puede entrar a la comunidad.` : `${nombre} puede volver a entrar.`);
      },
      reenviarInvitacion: (id_usuario) => {
        finanzas.anotar('Reenvió una invitación', usuarioPorId[id_usuario].correo, `Invitación reenviada a ${usuarioPorId[id_usuario].correo}.`);
      },
      invitar: (usuario) => {
        dispatch({ tipo: 'invitar', id_red, usuario, actor: yo.id_usuario });
        finanzas.anotar('Invitó a un residente', `${nombreCompleto(usuario)} · ${nombreUnidad(unidadPorId[usuario.residencias[0].id_unidad])}`,
          `Invitación enviada a ${usuario.correo}.`);
      },
      resolverSolicitud: (id_residencia, aprobada) => {
        const s = d.solicitudes.find((x) => x.id_residencia === id_residencia);
        dispatch({ tipo: 'resolverSolicitud', id_red, id_residencia, aprobada, actor: yo.id_usuario });
        const nombre = nombreCompleto(s.usuario);
        finanzas.anotar(aprobada ? 'Aprobó una solicitud de acceso' : 'Rechazó una solicitud de acceso', `${nombre} · ${nombreUnidad(unidadPorId[s.id_unidad])}`,
          aprobada ? `${nombre} ya puede entrar a la app.` : 'Solicitud rechazada. Se le avisó por correo.');
      },
      guardarComunidad: (cambios) => {
        actualizarComunidad(cambios);
        finanzas.anotar('Editó los datos de la comunidad', Object.keys(cambios).join(', '), 'Datos de la comunidad guardados.');
      },
      cambiarModulo: (modulo, activo) => {
        actualizarComunidad((c) => ({ red_modulos: conModulo(c, modulo, activo) }));
        finanzas.anotar('Cambió los módulos', `${activo ? 'Activó' : 'Desactivó'} ${MODULOS[modulo]}`, `${MODULOS[modulo]}: ${activo ? 'activado' : 'desactivado'}.`);
      },
      crearUnidades: (nuevas) => {
        // Mientras no exista la API, los ids siguen la numeración de la comunidad
        actualizarComunidad((c) => {
          const base = Math.max(c.id_red * 1000, ...c.unidades.map((u) => u.id_unidad));
          return { unidades: [...c.unidades, ...nuevas.map((u, i) => ({ ...u, id_unidad: base + i + 1 }))] };
        });
        finanzas.anotar('Creó unidades', `${nuevas.length} unidades: ${nombreUnidad(nuevas[0])} a ${nombreUnidad(nuevas.at(-1))}`, `${nuevas.length} unidades creadas.`);
      },
      editarUnidad: (unidad) => {
        actualizarComunidad((c) => ({ unidades: c.unidades.map((u) => (u.id_unidad === unidad.id_unidad ? { ...u, ...unidad } : u)) }));
        finanzas.anotar('Editó una unidad', nombreUnidad(unidad), 'Unidad guardada.');
      },
    };

    // Cargos vigentes de una persona en esta comunidad, con su periodo
    const cargosVigentes = (u) => membresiasVigentes(u, id_red)
      .map((m) => ({ cargo: cargoDe(m), desde: m.fecha_desde, hasta: m.fecha_hasta ?? '' }));

    return {
      ...d, unidadPorId, usuarioPorId, ocupantes, directiva, cargosVigentes,
      solicitudesPendientes: d.solicitudes,
      acciones,
    };
  }, [d, id_red, comunidad, actualizarComunidad, finanzas, yo]);

  return <AdminContext.Provider value={valor}>{children}</AdminContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin() {
  return useContext(AdminContext);
}
