import { createContext, useContext, useMemo, useReducer } from 'react';
import { useSesion } from './SesionContext';
import { useFinanzas } from './FinanzasContext';
import { useAdmin } from './AdminContext';
import { CATEGORIAS_MARKETPLACE, muroInicial, muroVacio } from '../data/muroMock';
import { cargosDe, residenciasActivas } from '../config/roles';
import { roles } from '../tokens';
import { nombreCorto, nombreUnidad } from '../utils/formato';

// Muro y marketplace de cada comunidad con las filas de la base: `muro_publicaciones`,
// `marketplace_publicaciones` y `reportes_publicacion`. Administración modera; la directiva
// redacta comunicados y normas, y el Presidente los aprueba.
const MuroContext = createContext(null);

const ahora = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
};
const siguienteId = (filas, campo) => filas.reduce((m, f) => Math.max(m, f[campo]), 0) + 1;
const TABLA = { muro: 'muro_publicaciones', marketplace: 'marketplace_publicaciones' };
const ID = { muro: 'id_publicacion', marketplace: 'id_producto' };

function reducer(state, { tipo, id_red, ...p }) {
  const d = state[id_red];
  const con = (cambios) => ({ ...state, [id_red]: { ...d, ...cambios } });
  switch (tipo) {
    case 'enviarPublicacion': {
      const fila = {
        id_publicacion: siguienteId(d.muro_publicaciones, 'id_publicacion'), id_red, id_usuario: p.id_usuario, id_unidad: null,
        tipo: p.tipo_publicacion, titulo: p.titulo, contenido: p.contenido, fecha_creacion: ahora(),
        estado_aprobacion: p.directo ? 'Aprobada' : 'Pendiente', id_aprobador: p.directo ? p.id_usuario : null, fecha_aprobacion: p.directo ? ahora() : null,
        estado: 1, id_moderador: null, fecha_moderacion: null,
      };
      return con({ muro_publicaciones: [...d.muro_publicaciones, fila] });
    }
    case 'resolverPublicacion':
      return con({
        muro_publicaciones: d.muro_publicaciones.map((x) => (x.id_publicacion === p.id_publicacion
          ? { ...x, estado_aprobacion: p.aprobada ? 'Aprobada' : 'Rechazada', id_aprobador: p.id_usuario, fecha_aprobacion: ahora() } : x)),
      });
    case 'moderar': {
      const tabla = TABLA[p.lugar];
      const esta = (r) => r.tipo_publicacion === p.lugar && r.id_publicacion === p.id && r.estado === 'Pendiente';
      // Ocultar atiende los reportes; descartarlos deja la publicación visible
      const reportes_publicacion = p.accion === 'restaurar' ? d.reportes_publicacion
        : d.reportes_publicacion.map((r) => (esta(r) ? { ...r, estado: p.accion === 'ocultar' ? 'Atendido' : 'Descartado' } : r));
      if (p.accion === 'descartar') return con({ reportes_publicacion });
      return con({
        reportes_publicacion,
        [tabla]: d[tabla].map((x) => (x[ID[p.lugar]] === p.id
          ? { ...x, estado: p.accion === 'ocultar' ? 0 : 1, id_moderador: p.id_usuario, fecha_moderacion: ahora() } : x)),
      });
    }
    default:
      return state;
  }
}

export function MuroProvider({ children }) {
  const { usuario: yo, comunidad, cargo, redes } = useSesion();
  const { acciones: finanzas } = useFinanzas();
  const { usuarioPorId, unidadPorId } = useAdmin();
  const [state, dispatch] = useReducer(reducer, null, () => {
    const inicial = muroInicial();
    redes.forEach((r) => { inicial[r.id_red] ??= muroVacio(); });
    return inicial;
  });
  const id_red = comunidad.id_red;
  const d = state[id_red] ?? muroVacio();

  const valor = useMemo(() => {
    const persona = (id) => usuarioPorId[id];
    const nombreUsuario = (id) => nombreCorto(persona(id)) || 'Vecino';
    // «Andrea Lagos · Secretario/a»: quien redacta o aprueba, con su cargo en la comunidad
    const conCargo = (id) => {
      const c = cargosDe(persona(id), id_red)[0];
      return c ? `${nombreUsuario(id)} · ${roles[c].label}` : nombreUsuario(id);
    };
    // Quien reporta se muestra con su vivienda
    const viviendaDe = (id) => nombreUnidad(unidadPorId[residenciasActivas(persona(id))[0]?.id_unidad]);
    const categoriaPorId = Object.fromEntries(CATEGORIAS_MARKETPLACE.map((c) => [c.id_categoria, c.nombre_categoria]));
    const reportesDe = (lugar, id) => d.reportes_publicacion.filter((r) => r.tipo_publicacion === lugar && r.id_publicacion === id);

    // Lo que publicaron los vecinos en el muro y el marketplace, en una sola lista para moderar.
    // Lo que eliminó su autor (estado 0 sin moderador) ya no aparece.
    const visibleParaModerar = (x) => x.estado === 1 || x.id_moderador;
    const vecinos = [
      ...d.muro_publicaciones.filter((x) => x.tipo === 'Vecino' && visibleParaModerar(x)).map((x) => ({
        lugar: 'muro', id: x.id_publicacion, fila: x, fecha: x.fecha_creacion, titulo: null, contenido: x.contenido,
      })),
      ...d.marketplace_publicaciones.filter(visibleParaModerar).map((x) => ({
        lugar: 'marketplace', id: x.id_producto, fila: x, fecha: x.fecha_publicacion, titulo: x.titulo, contenido: x.descripcion,
        categoria: categoriaPorId[x.id_categoria], precio: x.precio,
      })),
    ].map((x) => ({ ...x, reportes: reportesDe(x.lugar, x.id).filter((r) => r.estado === 'Pendiente') }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const reportadas = vecinos.filter((x) => x.fila.estado === 1 && x.reportes.length > 0);

    const oficiales = d.muro_publicaciones.filter((x) => x.tipo !== 'Vecino').sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion));
    const publicacionesPorAprobar = oficiales.filter((x) => x.estado_aprobacion === 'Pendiente');

    const acciones = {
      // Comunicados y normas oficiales: los publica directo el Presidente; los demás los envían a su aprobación
      enviarPublicacion: ({ tipo, titulo, contenido }) => {
        const directo = cargo === 'presidente';
        dispatch({ tipo: 'enviarPublicacion', id_red, id_usuario: yo.id_usuario, directo, tipo_publicacion: tipo, titulo, contenido });
        finanzas.anotar(directo ? `Publicó ${tipo.toLowerCase()}` : `Envió ${tipo.toLowerCase()} a aprobación`, titulo,
          directo ? `${tipo} publicado en el muro.` : `${tipo} enviado a la Presidencia para su aprobación.`);
      },
      resolverPublicacion: (id_publicacion, aprobada) => {
        const x = d.muro_publicaciones.find((e) => e.id_publicacion === id_publicacion);
        dispatch({ tipo: 'resolverPublicacion', id_red, id_publicacion, aprobada, id_usuario: yo.id_usuario });
        finanzas.anotar(aprobada ? `Aprobó ${x.tipo.toLowerCase()}` : `Rechazó ${x.tipo.toLowerCase()}`, x.titulo,
          aprobada ? `${x.tipo} aprobado y publicado en el muro.` : `${x.tipo} devuelto a quien lo redactó.`);
      },
      moderar: (pub, accion) => {
        dispatch({ tipo: 'moderar', id_red, lugar: pub.lugar, id: pub.id, accion, id_usuario: yo.id_usuario });
        const textos = { ocultar: ['Ocultó una publicación', 'Publicación oculta. Su autor recibió un aviso.'], restaurar: ['Restauró una publicación', 'Publicación visible otra vez.'], descartar: ['Descartó reportes', 'Reportes descartados. La publicación sigue visible.'] };
        const texto = pub.titulo ?? pub.contenido;
        finanzas.anotar(textos[accion][0], `«${texto.slice(0, 60)}${texto.length > 60 ? '…' : ''}» de ${nombreUnidad(unidadPorId[pub.fila.id_unidad])}`, textos[accion][1]);
      },
    };

    return {
      ...d, categorias_marketplace: CATEGORIAS_MARKETPLACE,
      vecinos, reportadas, oficiales, publicacionesPorAprobar,
      nombreUsuario, conCargo, viviendaDe, acciones,
    };
  }, [d, id_red, yo, cargo, usuarioPorId, unidadPorId, finanzas]);

  return <MuroContext.Provider value={valor}>{children}</MuroContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useMuro = () => useContext(MuroContext);
