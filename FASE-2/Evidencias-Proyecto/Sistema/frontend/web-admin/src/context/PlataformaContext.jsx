import { createContext, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useSesion } from './SesionContext';
import { adminInicial, adminVacio } from '../data/adminMock';
import { MODULOS } from '../config/modulos';
import { roles } from '../tokens';

// Lo que ve y hace el equipo EntreCasas sobre todas las comunidades: crearlas,
// suspenderlas, cambiar módulos y atender a las personas. Cada acción queda en la
// bitácora de plataforma (en la sesión, para que sobreviva al cerrar sesión en la demo).
const PlataformaContext = createContext(null);

const PRIORIDAD = ['administrador', 'presidente'];
const nombreCompleto = (c) => `${c.nombre} ${c.apellido}`;

export function PlataformaProvider({ children }) {
  const sesion = useSesion();
  const { redes, cuentas, bloqueados, actualizarRed, crearComunidad, bloquear, anotarPlataforma } = sesion;
  const [aviso, setAviso] = useState(null);
  // Usuarios de las comunidades de ejemplo; con la API vendrán de usuarios y membresias
  const [semilla] = useState(adminInicial);

  const valor = useMemo(() => {
    const usuariosDe = (red) => (semilla[red.id] ?? adminVacio(red)).usuarios;
    const redPorId = Object.fromEntries(redes.map((r) => [r.id, r]));

    // Responsable visible de cada comunidad: el administrador o, si no hay, el presidente
    const responsableDe = (red) => {
      for (const cargo of PRIORIDAD) {
        const u = usuariosDe(red).find((x) => x.estado !== 'desactivado' && x.cargos.some((c) => c.cargo === cargo));
        if (u) return { nombre: u.nombre, rut: u.rut, correo: u.correo, cargo };
      }
      return null;
    };

    // Personas de todas las comunidades, unidas por RUT, más las cuentas sin comunidad
    const porRut = new Map();
    const agregar = (rut, base) => {
      if (!porRut.has(rut)) porRut.set(rut, { rut, comunidades: [], ...base });
      return porRut.get(rut);
    };
    redes.forEach((red) => usuariosDe(red).forEach((u) => {
      const p = agregar(u.rut, { nombre: u.nombre, correo: u.correo });
      p.comunidades.push({
        idRed: red.id, red: red.nombre, estado: u.estado,
        cargos: u.cargos.map((c) => c.cargo), relacion: u.residencias[0]?.relacion ?? null,
      });
    }));
    cuentas.forEach((c) => {
      const p = agregar(c.rut, { nombre: nombreCompleto(c), correo: c.correo });
      p.conClave = true;
      if (c.plataforma) p.plataforma = true;
    });
    const personas = [...porRut.values()]
      .map((p) => ({ ...p, bloqueado: bloqueados.includes(p.rut) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const hecho = (accion, detalle, idRed, mensaje) => {
      anotarPlataforma(accion, detalle, idRed);
      if (mensaje) setAviso(mensaje);
    };

    const acciones = {
      crear: (red, responsable) => {
        const id = crearComunidad(red, responsable);
        hecho('Creó una comunidad', `${red.nombre} · ${red.unidades.length} unidades · ${roles[responsable.cargo].label.toLowerCase()} ${responsable.nombre} ${responsable.apellido}`, id,
          `${red.nombre} quedó creada. Enviamos el acceso a ${responsable.correo}.`);
        return id;
      },
      abrirFicha: (red) => anotarPlataforma('Abrió la ficha en modo soporte', red.nombre, red.id),
      cambiarModulo: (red, modulo, activo) => {
        actualizarRed(red.id, (c) => ({ modulos: activo ? [...c.modulos, modulo] : c.modulos.filter((m) => m !== modulo) }));
        hecho(activo ? 'Activó un módulo' : 'Desactivó un módulo', MODULOS[modulo], red.id, `${MODULOS[modulo]}: ${activo ? 'activado' : 'desactivado'} en ${red.nombre}.`);
      },
      cambiarTipo: (red, tipo) => {
        actualizarRed(red.id, { tipo });
        hecho('Cambió el tipo de comunidad', `${red.tipo} a ${tipo}`, red.id, `${red.nombre} ahora es ${tipo.toLowerCase()}.`);
      },
      suspender: (red, motivo) => {
        actualizarRed(red.id, { estado: 'suspendida', motivoSuspension: motivo });
        hecho('Suspendió una comunidad', motivo, red.id, `${red.nombre} quedó suspendida. Nadie de la comunidad puede entrar.`);
      },
      reactivar: (red) => {
        actualizarRed(red.id, { estado: 'activa', motivoSuspension: null });
        hecho('Reactivó una comunidad', red.nombre, red.id, `${red.nombre} está activa otra vez.`);
      },
      reenviarAcceso: (persona) => {
        const idRed = persona.comunidades[0]?.idRed ?? null;
        hecho('Reenvió el acceso', `${persona.nombre}${idRed ? ` · ${redPorId[idRed].nombre}` : ''}`, idRed, `Enviamos un enlace de acceso a ${persona.correo}.`);
      },
      bloquear: (persona, bloqueado) => {
        bloquear(persona.rut, bloqueado);
        hecho(bloqueado ? 'Bloqueó una cuenta' : 'Desbloqueó una cuenta', `${persona.nombre} · ${persona.rut}`, null,
          bloqueado ? `${persona.nombre} ya no puede entrar a EntreCasas.` : `${persona.nombre} puede volver a entrar.`);
      },
    };

    return { redes, redPorId, usuariosDe, responsableDe, personas, acciones };
  }, [redes, cuentas, bloqueados, semilla, actualizarRed, crearComunidad, bloquear, anotarPlataforma]);

  return (
    <PlataformaContext.Provider value={valor}>
      {children}
      <Snackbar open={Boolean(aviso)} autoHideDuration={4000} onClose={() => setAviso(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setAviso(null)} sx={{ width: '100%' }}>{aviso}</Alert>
      </Snackbar>
    </PlataformaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlataforma() {
  return useContext(PlataformaContext);
}
