import { createContext, useContext, useMemo, useReducer } from 'react';
import { useSesion } from './SesionContext';
import { useFinanzas } from './FinanzasContext';
import { directivaInicial, directivaVacia } from '../data/directivaMock';
import { resultado } from '../utils/votaciones';
import { nombreCorto } from '../utils/formato';

// Secretaría de cada comunidad con las filas de la base: `votaciones`, `votacion_opciones`, `votos`,
// `actas`, `acta_acuerdos` y `contactos`. Igual que en finanzas, simula la API y cada acción queda en la bitácora.
const DirectivaContext = createContext(null);

// Con la API el id lo pone AUTO_INCREMENT; aquí se usa el mayor + 1
const siguienteId = (filas, campo) => filas.reduce((m, f) => Math.max(m, f[campo]), 0) + 1;
const ahora = () => {
  const f = new Date();
  return new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
};
const hoy = () => ahora().slice(0, 10);

function reducer(state, { tipo, id_red, ...p }) {
  const d = state[id_red];
  const con = (cambios) => ({ ...state, [id_red]: { ...d, ...cambios } });

  switch (tipo) {
    case 'guardarActa': {
      // El acta y sus acuerdos se guardan juntos; al editar, los acuerdos se reemplazan
      const id_acta = p.acta.id_acta ?? siguienteId(d.actas, 'id_acta');
      const fila = p.acta.id_acta
        ? { ...d.actas.find((a) => a.id_acta === id_acta), ...p.acta }
        : { ...p.acta, id_acta, id_red, numero: siguienteId(d.actas, 'numero'), estado: 'Borrador', id_redactor: p.id_usuario, fecha_publicacion: null };
      const otros = d.acta_acuerdos.filter((a) => a.id_acta !== id_acta);
      let id_acuerdo = siguienteId(d.acta_acuerdos, 'id_acuerdo');
      return con({
        actas: p.acta.id_acta ? d.actas.map((a) => (a.id_acta === id_acta ? fila : a)) : [fila, ...d.actas],
        acta_acuerdos: [...otros, ...p.acuerdos.map((a) => ({ ...a, id_acuerdo: id_acuerdo++, id_acta }))],
      });
    }
    case 'publicarActa':
      return con({ actas: d.actas.map((a) => (a.id_acta === p.id_acta ? { ...a, estado: 'Publicada', fecha_publicacion: ahora() } : a)) });
    case 'eliminarActa':
      return con({ actas: d.actas.filter((a) => a.id_acta !== p.id_acta), acta_acuerdos: d.acta_acuerdos.filter((a) => a.id_acta !== p.id_acta) });
    case 'crearVotacion': {
      const id_votacion = siguienteId(d.votaciones, 'id_votacion');
      const id_opcion = siguienteId(d.votacion_opciones, 'id_opcion');
      return con({
        votaciones: [{ ...p.votacion, id_votacion, id_red, fecha_inicio: hoy(), estado: 'Abierta', id_usuario_crea: p.id_usuario }, ...d.votaciones],
        votacion_opciones: [...d.votacion_opciones, ...p.opciones.map((texto, i) => ({ id_opcion: id_opcion + i, id_votacion, texto }))],
      });
    }
    case 'cerrarVotacion':
      return con({ votaciones: d.votaciones.map((v) => (v.id_votacion === p.id_votacion ? { ...v, estado: 'Cerrada', fecha_cierre: hoy() } : v)) });
    case 'guardarContacto':
      return con({
        contactos: p.contacto.id_contacto
          ? d.contactos.map((k) => (k.id_contacto === p.contacto.id_contacto ? { ...k, ...p.contacto } : k))
          : [...d.contactos, { ...p.contacto, id_contacto: siguienteId(d.contactos, 'id_contacto'), id_red, visible: 1 }],
      });
    case 'eliminarContacto':
      return con({ contactos: d.contactos.filter((k) => k.id_contacto !== p.id_contacto) });
    default:
      return state;
  }
}

export function DirectivaProvider({ children }) {
  const { usuario, comunidad, redes, cuentas } = useSesion();
  const { acciones: finanzas, correosEnviados } = useFinanzas();
  const [state, dispatch] = useReducer(reducer, null, () => {
    const inicial = directivaInicial();
    redes.forEach((r) => { inicial[r.id_red] ??= directivaVacia(); });
    return inicial;
  });
  const id_red = comunidad.id_red;
  const d = state[id_red];
  const id_usuario = usuario.id_usuario;

  const valor = useMemo(() => {
    const totalUnidades = comunidad.unidades.length;
    const nombreDe = (id) => {
      const c = cuentas.find((x) => x.id_usuario === id);
      return c ? nombreCorto(c) : 'Secretaría';
    };

    // Lo que la API devolverá con JOIN: cada votación con sus opciones, los votos contados y los recordatorios (P6)
    const votaciones = d.votaciones.map((v) => ({
      ...v,
      opciones: d.votacion_opciones.filter((o) => o.id_votacion === v.id_votacion)
        .map((o) => ({ ...o, votos: d.votos.filter((x) => x.id_opcion === o.id_opcion).length })),
      recordatorios: correosEnviados.filter((c) => c.tipo === 'Recordatorio de votación' && c.id_votacion === v.id_votacion).length,
    }));
    const actas = [...d.actas].sort((a, b) => b.numero - a.numero).map((a) => ({
      ...a,
      acuerdos: d.acta_acuerdos.filter((x) => x.id_acta === a.id_acta),
      redactor: nombreDe(a.id_redactor),
    }));

    const acciones = {
      guardarActa: (acta, acuerdos) => {
        dispatch({ tipo: 'guardarActa', id_red, acta, acuerdos, id_usuario });
        finanzas.anotar(acta.id_acta ? 'Editó un acta' : 'Redactó un acta', `${acta.tipo} del ${acta.fecha}`, 'Acta guardada como borrador.');
      },
      publicarActa: (acta) => {
        dispatch({ tipo: 'publicarActa', id_red, id_acta: acta.id_acta });
        finanzas.anotar('Publicó un acta', `Acta N° ${acta.numero} · ${acta.tipo}`, `Acta N° ${acta.numero} publicada. Los residentes ya la ven en la app.`);
      },
      eliminarActa: (acta) => {
        dispatch({ tipo: 'eliminarActa', id_red, id_acta: acta.id_acta });
        finanzas.anotar('Eliminó un borrador de acta', `Acta N° ${acta.numero}`, 'Borrador eliminado.');
      },
      crearVotacion: (votacion, opciones) => {
        dispatch({ tipo: 'crearVotacion', id_red, votacion, opciones, id_usuario });
        finanzas.anotar(`Abrió una ${votacion.tipo === 'Votación' ? 'votación' : 'encuesta'}`, votacion.titulo, `${votacion.tipo} abierta. Se avisó a las ${totalUnidades} unidades.`);
      },
      cerrarVotacion: (v) => {
        dispatch({ tipo: 'cerrarVotacion', id_red, id_votacion: v.id_votacion });
        finanzas.anotar('Cerró una votación antes de plazo', v.titulo, 'Votación cerrada. El resultado ya es visible para los residentes.');
      },
      recordarVotacion: (v) => finanzas.recordarVotacion(v, resultado(v, totalUnidades).faltan),
      guardarContacto: (contacto) => {
        dispatch({ tipo: 'guardarContacto', id_red, contacto });
        finanzas.anotar('Actualizó el directorio oficial', contacto.nombre, 'Directorio actualizado.');
      },
      eliminarContacto: (contacto) => {
        dispatch({ tipo: 'eliminarContacto', id_red, id_contacto: contacto.id_contacto });
        finanzas.anotar('Quitó un contacto del directorio', contacto.nombre, 'Contacto eliminado.');
      },
    };
    return {
      ...d, votaciones, actas,
      totalUnidades,
      votacionesAbiertas: votaciones.filter((v) => v.estado === 'Abierta'),
      actasBorrador: actas.filter((a) => a.estado === 'Borrador'),
      acciones,
    };
  }, [d, id_red, id_usuario, comunidad, cuentas, finanzas, correosEnviados]);

  return <DirectivaContext.Provider value={valor}>{children}</DirectivaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirectiva() {
  return useContext(DirectivaContext);
}
