import { createContext, useContext, useMemo, useState } from 'react';
import { comunidades } from '../data/mock';
import { CUENTAS } from '../data/cuentasDemo';
import { bitacoraPlataformaInicial } from '../data/plataformaMock';

// Sesión: quién está conectado y con qué comunidad y cargo está actuando.
// Por ahora las cuentas salen de las cuentas de prueba; con la API vendrán del login (token)
// y las membresías de la tabla del mismo nombre.
// Aquí también viven los datos de nivel plataforma (comunidades, cuentas creadas y bloqueos)
// para que lo que hace el Administrador de plataforma se vea al entrar con otra cuenta.
const SesionContext = createContext(null);
const CLAVE_CONTEXTO = 'entrecasas.contexto';
const CLAVE_SESION = 'entrecasas.sesion';

function leer(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? null;
  } catch {
    return null;
  }
}
function guardar(clave, valor) {
  try {
    if (valor == null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch { /* sin almacenamiento */ }
}

// Membresías en comunidades que no están suspendidas
const vigentes = (usuario, redes) => (usuario?.membresias ?? [])
  .filter((m) => redes.find((r) => r.id === m.idRed)?.estado !== 'suspendida');

function contextoInicial(usuario, redes) {
  const lista = vigentes(usuario, redes);
  if (!lista.length) return null;
  const guardado = leer(CLAVE_CONTEXTO);
  const valido = lista.some((m) => m.idRed === guardado?.idRed && m.cargo === guardado?.cargo);
  return valido ? guardado : lista[0];
}

export function SesionProvider({ children }) {
  const [redes, setRedes] = useState(comunidades);
  const [cuentasNuevas, setCuentasNuevas] = useState([]);
  const [bloqueados, setBloqueados] = useState([]);
  const [bitacoraPlataforma, setBitacoraPlataforma] = useState(bitacoraPlataformaInicial);
  const [usuario, setUsuario] = useState(() => CUENTAS.find((c) => c.id === leer(CLAVE_SESION)) ?? null);
  const [activo, setActivo] = useState(() => contextoInicial(usuario, comunidades));

  const valor = useMemo(() => {
    const cuentas = [...CUENTAS, ...cuentasNuevas];
    const membresias = vigentes(usuario, redes);
    const comunidad = activo ? redes.find((c) => c.id === activo.idRed) : null;

    const cambiarContexto = (idRed, cargo) => {
      const nuevo = { idRed, cargo };
      setActivo(nuevo);
      guardar(CLAVE_CONTEXTO, nuevo);
    };
    const iniciarSesion = (cuenta) => {
      const primera = vigentes(cuenta, redes)[0] ?? null;
      setUsuario(cuenta);
      setActivo(primera);
      guardar(CLAVE_SESION, cuenta.id);
      guardar(CLAVE_CONTEXTO, primera);
    };
    const cerrarSesion = () => {
      setUsuario(null);
      setActivo(null);
      guardar(CLAVE_SESION, null);
      guardar(CLAVE_CONTEXTO, null);
    };
    // Membresías agrupadas por comunidad, para el selector
    const porComunidad = redes
      .map((c) => ({ comunidad: c, cargos: membresias.filter((m) => m.idRed === c.id).map((m) => m.cargo) }))
      .filter((g) => g.cargos.length > 0);
    // Cambia una comunidad; recibe los cambios o una función que los calcula a partir de ella
    const actualizarRed = (idRed, cambios) => setRedes((lista) => lista.map((c) => (
      c.id === idRed ? { ...c, ...(typeof cambios === 'function' ? cambios(c) : cambios), ultimaActividad: new Date().toISOString() } : c
    )));
    const actualizarComunidad = (cambios) => actualizarRed(activo?.idRed, cambios);

    // Nivel plataforma
    const crearComunidad = (red, responsable) => {
      const id = Math.max(...redes.map((r) => r.id)) + 1;
      const ahora = new Date().toISOString();
      // Los ids de unidad llevan el id de la comunidad para no chocar con los de otras
      const unidades = red.unidades.map((u) => ({ ...u, id: `n${id}-${u.id}` }));
      setRedes((lista) => [...lista, { ...red, unidades, id, estado: 'activa', creadaEn: ahora.slice(0, 10), ultimaActividad: ahora, responsable }]);
      setCuentasNuevas((lista) => [...lista, {
        id: Date.now(), nombre: responsable.nombre, apellido: responsable.apellido, rut: responsable.rut, correo: responsable.correo,
        flujo: `Primer responsable de ${red.nombre}`, membresias: [{ idRed: id, cargo: responsable.cargo }],
      }]);
      return id;
    };
    const anotarPlataforma = (accion, detalle, idRed = null) => setBitacoraPlataforma((lista) => [{
      id: `bp${Date.now().toString(36)}`, fecha: new Date().toISOString(), actor: `${usuario?.nombre} ${usuario?.apellido}`, accion, detalle, idRed,
    }, ...lista]);
    const bloquear = (rut, bloqueado) => setBloqueados((lista) => (bloqueado ? [...lista, rut] : lista.filter((r) => r !== rut)));

    return {
      usuario, comunidad, cargo: activo?.cargo ?? null, porComunidad, redes, cuentas, bloqueados,
      cambiarContexto, actualizarComunidad, actualizarRed, iniciarSesion, cerrarSesion, crearComunidad, bloquear,
      bitacoraPlataforma, anotarPlataforma,
      membresiasVigentes: (cuenta) => vigentes(cuenta, redes),
    };
  }, [activo, usuario, redes, cuentasNuevas, bloqueados, bitacoraPlataforma]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion() {
  return useContext(SesionContext);
}
