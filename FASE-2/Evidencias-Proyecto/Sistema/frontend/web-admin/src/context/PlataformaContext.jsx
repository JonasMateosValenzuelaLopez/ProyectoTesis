import { createContext, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useSesion } from './SesionContext';
import { adminInicial, adminVacio } from '../data/adminMock';
import { MODULOS } from '../config/modulos';
import { roles } from '../tokens';
import { cargosDe, esPlataforma, residenciasActivas } from '../config/roles';
import { conModulo } from '../config/modulos';
import { nombreCompleto } from '../utils/formato';

// Lo que ve y hace el equipo EntreCasas sobre todas las comunidades: crearlas,
// suspenderlas, cambiar módulos y atender a las personas. Cada acción queda en la
// bitácora de plataforma (en la sesión, para que sobreviva al cerrar sesión en la demo).
const PlataformaContext = createContext(null);

const PRIORIDAD = ['administrador', 'presidente'];

export function PlataformaProvider({ children }) {
  const sesion = useSesion();
  const { redes, cuentas, bloqueados, actualizarRed, crearComunidad, bloquear, anotarPlataforma } = sesion;
  const [aviso, setAviso] = useState(null);
  // Usuarios de las comunidades de ejemplo; con la API vendrán de usuarios y membresias
  const [semilla] = useState(adminInicial);

  const valor = useMemo(() => {
    const usuariosDe = (red) => (semilla[red.id_red] ?? adminVacio(red)).usuarios;
    const redPorId = Object.fromEntries(redes.map((r) => [r.id_red, r]));

    // Responsable visible de cada comunidad: el administrador o, si no hay, el presidente
    const responsableDe = (red) => {
      for (const cargo of PRIORIDAD) {
        const u = usuariosDe(red).find((x) => x.estado !== 'Desactivado' && cargosDe(x, red.id_red).includes(cargo));
        if (u) return { nombre: nombreCompleto(u), rut: u.rut, correo: u.correo, cargo };
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
      const p = agregar(u.rut, { nombre: nombreCompleto(u), correo: u.correo });
      p.comunidades.push({
        id_red: red.id_red, red: red.nombre, estado: u.estado,
        cargos: cargosDe(u, red.id_red), relacion: residenciasActivas(u)[0]?.relacion ?? null,
      });
    }));
    cuentas.forEach((c) => {
      const p = agregar(c.rut, { nombre: nombreCompleto(c), correo: c.correo });
      p.conClave = true;
      if (esPlataforma(c)) p.plataforma = true;
    });
    const personas = [...porRut.values()]
      .map((p) => ({ ...p, bloqueado: bloqueados.includes(p.rut) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const hecho = (accion, detalle, id_red, mensaje) => {
      anotarPlataforma(accion, detalle, id_red);
      if (mensaje) setAviso(mensaje);
    };

    const acciones = {
      crear: (red, responsable) => {
        const id = crearComunidad(red, responsable);
        hecho('Creó una comunidad', `${red.nombre} · ${red.unidades.length} unidades · ${roles[responsable.cargo].label.toLowerCase()} ${nombreCompleto(responsable)}`, id,
          `${red.nombre} quedó creada. Enviamos el acceso a ${responsable.correo}.`);
        return id;
      },
      abrirFicha: (red) => anotarPlataforma('Abrió la ficha en modo soporte', red.nombre, red.id_red),
      cambiarModulo: (red, modulo, activo) => {
        actualizarRed(red.id_red, (c) => ({ red_modulos: conModulo(c, modulo, activo) }));
        hecho(activo ? 'Activó un módulo' : 'Desactivó un módulo', MODULOS[modulo], red.id_red, `${MODULOS[modulo]}: ${activo ? 'activado' : 'desactivado'} en ${red.nombre}.`);
      },
      cambiarTipo: (red, tipo) => {
        actualizarRed(red.id_red, { tipo });
        hecho('Cambió el tipo de comunidad', `${red.tipo} a ${tipo}`, red.id_red, `${red.nombre} ahora es ${tipo.toLowerCase()}.`);
      },
      suspender: (red, motivo) => {
        actualizarRed(red.id_red, { estado: 'Suspendida', motivo_suspension: motivo });
        hecho('Suspendió una comunidad', motivo, red.id_red, `${red.nombre} quedó suspendida. Nadie de la comunidad puede entrar.`);
      },
      reactivar: (red) => {
        actualizarRed(red.id_red, { estado: 'Activa', motivo_suspension: null });
        hecho('Reactivó una comunidad', red.nombre, red.id_red, `${red.nombre} está activa otra vez.`);
      },
      reenviarAcceso: (persona) => {
        const id_red = persona.comunidades[0]?.id_red ?? null;
        hecho('Reenvió el acceso', `${persona.nombre}${id_red ? ` · ${redPorId[id_red].nombre}` : ''}`, id_red, `Enviamos un enlace de acceso a ${persona.correo}.`);
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
