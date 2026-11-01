import { createContext, useContext, useMemo, useState } from 'react';
import { comunidades } from '../data/mock';
import { CUENTAS } from '../data/cuentasDemo';
import { bitacoraPlataformaInicial } from '../data/plataformaMock';
import { ID_ROL, cargoDe, membresiasVigentes } from '../config/roles';
import { registrarRed } from '../utils/unidades';

// Sesión: quién está conectado y con qué comunidad y cargo está actuando.
// Por ahora las cuentas salen de las cuentas de prueba; con la API vendrán del login (token)
// y las membresías de la tabla del mismo nombre.
// Aquí también viven los datos de nivel plataforma (comunidades, cuentas creadas y bloqueos)
// para que lo que hace el Administrador de plataforma se vea al entrar con otra cuenta.
const SesionContext = createContext(null);
const CLAVE_CONTEXTO = 'entrecasas.contexto';
const CLAVE_SESION = 'entrecasas.sesion';
// Fecha y hora local en el formato DATETIME de la base
const fechaLocal = () => {
  const f = new Date();
  return new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
};

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

// Cargos vigentes del usuario en comunidades que no están suspendidas, como { id_red, cargo }.
// La membresía de Plataforma no tiene comunidad y se maneja aparte.
const vigentes = (usuario, redes) => membresiasVigentes(usuario)
  .filter((m) => m.id_red != null && redes.find((r) => r.id_red === m.id_red)?.estado !== 'Suspendida')
  .map((m) => ({ id_red: m.id_red, cargo: cargoDe(m) }));

function contextoInicial(usuario, redes) {
  const lista = vigentes(usuario, redes);
  if (!lista.length) return null;
  const guardado = leer(CLAVE_CONTEXTO);
  const valido = lista.some((m) => m.id_red === guardado?.id_red && m.cargo === guardado?.cargo);
  return valido ? guardado : lista[0];
}

export function SesionProvider({ children }) {
  const [redes, setRedes] = useState(comunidades);
  const [cuentasNuevas, setCuentasNuevas] = useState([]);
  const [bloqueados, setBloqueados] = useState([]);
  const [bitacoraPlataforma, setBitacoraPlataforma] = useState(bitacoraPlataformaInicial);
  const [usuario, setUsuario] = useState(() => CUENTAS.find((c) => c.id_usuario === leer(CLAVE_SESION)) ?? null);
  const [activo, setActivo] = useState(() => contextoInicial(usuario, comunidades));

  const valor = useMemo(() => {
    // El tipo de unidad (Casa o Departamento) sale del tipo de la comunidad
    redes.forEach(registrarRed);
    const cuentas = [...CUENTAS, ...cuentasNuevas];
    const membresias = vigentes(usuario, redes);
    const comunidad = activo ? redes.find((c) => c.id_red === activo.id_red) : null;

    const cambiarContexto = (id_red, cargo) => {
      const nuevo = { id_red, cargo };
      setActivo(nuevo);
      guardar(CLAVE_CONTEXTO, nuevo);
    };
    const iniciarSesion = (cuenta) => {
      const primera = vigentes(cuenta, redes)[0] ?? null;
      setUsuario(cuenta);
      setActivo(primera);
      guardar(CLAVE_SESION, cuenta.id_usuario);
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
      .map((c) => ({ comunidad: c, cargos: membresias.filter((m) => m.id_red === c.id_red).map((m) => m.cargo) }))
      .filter((g) => g.cargos.length > 0);
    // Cambia una comunidad; recibe los cambios o una función que los calcula a partir de ella
    const actualizarRed = (id_red, cambios) => setRedes((lista) => lista.map((c) => (
      c.id_red === id_red ? { ...c, ...(typeof cambios === 'function' ? cambios(c) : cambios), ultima_actividad: new Date().toISOString().slice(0, 19) } : c
    )));
    const actualizarComunidad = (cambios) => actualizarRed(activo?.id_red, cambios);

    // Nivel plataforma
    // Crea la fila de `redes_vecinales` con sus unidades y módulos, y al primer responsable
    // como fila de `usuarios` con su membresía. La API hará lo mismo en una transacción.
    const crearComunidad = (red, responsable) => {
      const id_red = Math.max(...redes.map((r) => r.id_red)) + 1;
      const ahora = new Date().toISOString().slice(0, 19);
      const unidades = red.unidades.map((u, i) => ({ ...u, id_unidad: id_red * 1000 + i + 1, id_red }));
      const { cargo, ...datos } = responsable;
      const usuario = { ...datos, id_usuario: Date.now(), telefono: null, estado: 'Invitado', fecha_registro: ahora };
      const membresia = {
        id_membresia: Date.now() + 1, id_usuario: usuario.id_usuario, id_red, id_rol: ID_ROL[cargo],
        fecha_desde: ahora.slice(0, 10), fecha_hasta: null, estado: 'Vigente',
      };
      setRedes((lista) => [...lista, {
        ...red, unidades, id_red, espacios_comunes: (red.espacios_comunes ?? []).map((e) => ({ ...e, id_red })), estado: 'Activa', motivo_suspension: null, fecha_registro: ahora, ultima_actividad: ahora,
        responsable: { usuario, membresia },
      }]);
      setCuentasNuevas((lista) => [...lista, { ...usuario, flujo: `Primer responsable de ${red.nombre}`, membresias: [membresia] }]);
      return id_red;
    };
    const anotarPlataforma = (accion, detalle, id_red = null) => setBitacoraPlataforma((lista) => [{
      id_bitacora: `bp${Date.now().toString(36)}`, id_red, id_usuario: usuario.id_usuario, accion, detalle, fecha: fechaLocal(),
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
