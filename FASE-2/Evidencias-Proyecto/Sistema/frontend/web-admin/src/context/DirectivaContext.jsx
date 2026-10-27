import { createContext, useContext, useMemo, useReducer } from 'react';
import { useSesion } from './SesionContext';
import { useFinanzas } from './FinanzasContext';
import { directivaInicial, directivaVacia } from '../data/directivaMock';
import { resultado } from '../utils/votaciones';

// Estado de la Secretaría de cada comunidad: libro de actas, votaciones y directorio oficial.
// Igual que en finanzas, simula la API y cada acción queda en la bitácora.
const DirectivaContext = createContext(null);

const nuevoId = (prefijo) => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const hoy = () => new Date().toISOString().slice(0, 10);

function reducer(state, { tipo, idRed, ...p }) {
  const d = state[idRed];
  const con = (cambios) => ({ ...state, [idRed]: { ...d, ...cambios } });
  const reemplazar = (lista, item) => lista.map((x) => (x.id === item.id ? { ...x, ...item } : x));

  switch (tipo) {
    case 'guardarActa': {
      if (p.acta.id) return con({ actas: reemplazar(d.actas, p.acta) });
      const numero = Math.max(0, ...d.actas.map((a) => a.numero)) + 1;
      return con({ actas: [{ ...p.acta, id: nuevoId('ac'), numero, estado: 'borrador', redactadaPor: p.autor }, ...d.actas] });
    }
    case 'publicarActa':
      return con({ actas: d.actas.map((a) => (a.id === p.id ? { ...a, estado: 'publicada', publicadaEn: hoy() } : a)) });
    case 'eliminarActa':
      return con({ actas: d.actas.filter((a) => a.id !== p.id) });
    case 'crearVotacion': {
      const opciones = p.votacion.opciones.map((texto, i) => ({ id: `o${i + 1}`, texto, votos: 0 }));
      return con({ votaciones: [{ ...p.votacion, opciones, id: nuevoId('vo'), estado: 'abierta', inicio: hoy(), recordatorios: 0 }, ...d.votaciones] });
    }
    case 'cerrarVotacion':
      return con({ votaciones: d.votaciones.map((v) => (v.id === p.id ? { ...v, estado: 'cerrada', cierre: hoy() } : v)) });
    case 'recordarVotacion':
      return con({ votaciones: d.votaciones.map((v) => (v.id === p.id ? { ...v, recordatorios: v.recordatorios + 1 } : v)) });
    case 'guardarContacto':
      return con({
        contactos: p.contacto.id
          ? reemplazar(d.contactos, p.contacto)
          : [...d.contactos, { ...p.contacto, id: nuevoId('k'), visible: true }],
      });
    case 'eliminarContacto':
      return con({ contactos: d.contactos.filter((k) => k.id !== p.id) });
    default:
      return state;
  }
}

export function DirectivaProvider({ children }) {
  const { usuario, comunidad, redes } = useSesion();
  const { acciones: finanzas } = useFinanzas();
  const [state, dispatch] = useReducer(reducer, null, () => {
    const inicial = directivaInicial();
    redes.forEach((r) => { inicial[r.id] ??= directivaVacia(); });
    return inicial;
  });
  const idRed = comunidad.id;
  const d = state[idRed];
  const autor = `${usuario.nombre} ${usuario.apellido}`;

  const valor = useMemo(() => {
    const totalUnidades = comunidad.unidades.length;
    const acciones = {
      guardarActa: (acta) => {
        dispatch({ tipo: 'guardarActa', idRed, acta, autor });
        finanzas.anotar(acta.id ? 'Editó un acta' : 'Redactó un acta', `${acta.tipo} del ${acta.fecha}`, 'Acta guardada como borrador.');
      },
      publicarActa: (acta) => {
        dispatch({ tipo: 'publicarActa', idRed, id: acta.id });
        finanzas.anotar('Publicó un acta', `Acta N° ${acta.numero} · ${acta.tipo}`, `Acta N° ${acta.numero} publicada. Los residentes ya la ven en la app.`);
      },
      eliminarActa: (acta) => {
        dispatch({ tipo: 'eliminarActa', idRed, id: acta.id });
        finanzas.anotar('Eliminó un borrador de acta', `Acta N° ${acta.numero}`, 'Borrador eliminado.');
      },
      crearVotacion: (votacion) => {
        dispatch({ tipo: 'crearVotacion', idRed, votacion });
        const que = votacion.tipo === 'votacion' ? 'Votación' : 'Encuesta';
        finanzas.anotar(`Abrió una ${que.toLowerCase()}`, votacion.titulo, `${que} abierta. Se avisó a las ${totalUnidades} unidades.`);
      },
      cerrarVotacion: (v) => {
        dispatch({ tipo: 'cerrarVotacion', idRed, id: v.id });
        finanzas.anotar('Cerró una votación antes de plazo', v.titulo, 'Votación cerrada. El resultado ya es visible para los residentes.');
      },
      recordarVotacion: (v) => {
        const { faltan } = resultado(v, totalUnidades);
        dispatch({ tipo: 'recordarVotacion', idRed, id: v.id });
        finanzas.anotar('Envió recordatorio de votación', `${v.titulo} · ${faltan} unidades`, `Recordatorio enviado a las ${faltan} unidades que no han votado.`);
      },
      guardarContacto: (contacto) => {
        dispatch({ tipo: 'guardarContacto', idRed, contacto });
        finanzas.anotar('Actualizó el directorio oficial', contacto.nombre, 'Directorio actualizado.');
      },
      eliminarContacto: (contacto) => {
        dispatch({ tipo: 'eliminarContacto', idRed, id: contacto.id });
        finanzas.anotar('Quitó un contacto del directorio', contacto.nombre, 'Contacto eliminado.');
      },
    };
    return {
      ...d,
      totalUnidades,
      votacionesAbiertas: d.votaciones.filter((v) => v.estado === 'abierta'),
      actasBorrador: d.actas.filter((a) => a.estado === 'borrador'),
      acciones,
    };
  }, [d, idRed, autor, comunidad, finanzas]);

  return <DirectivaContext.Provider value={valor}>{children}</DirectivaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirectiva() {
  return useContext(DirectivaContext);
}
