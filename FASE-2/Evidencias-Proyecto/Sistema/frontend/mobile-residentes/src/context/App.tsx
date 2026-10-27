import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  COMUNIDADES, UNIDADES, estadoCuentaInicial, invitacionesIniciales, publicacionesIniciales, reservasIniciales, votacionesIniciales,
  type Cuenta, type EstadoCuenta, type Invitacion, type Modulo, type Publicacion, type Reserva,
} from '@/data/demo';

// Estado de la app del residente: quién entró, con qué vivienda está actuando y los datos
// de su comunidad. Vive en memoria (se reinicia al cerrar la app), como el panel web.
// Cada acción corresponde a un endpoint de la API que se conectará después.

export type AvisoTransferencia = { fecha: string; monto: number; nota: string; enviado: string };

type Valor = ReturnType<typeof useValor>;
const AppContext = createContext<Valor | null>(null);

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nuevoCodigo = () => `EC-${Array.from({ length: 5 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('')}`;
const nuevoId = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function useValor() {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [idUnidad, setIdUnidad] = useState<string | null>(null);
  const [estados] = useState<Record<string, EstadoCuenta>>(() => Object.fromEntries(Object.keys(UNIDADES).map((id) => [id, estadoCuentaInicial(id)])));
  const [avisos, setAvisos] = useState<Record<string, AvisoTransferencia>>({});
  const [invitaciones, setInvitaciones] = useState(invitacionesIniciales);
  const [reservas, setReservas] = useState(reservasIniciales);
  const [publicaciones, setPublicaciones] = useState(publicacionesIniciales);
  const [votaciones, setVotaciones] = useState(votacionesIniciales);
  const [misVotos, setMisVotos] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useMemo(() => {
    const unidad = idUnidad ? UNIDADES[idUnidad] : null;
    const comunidad = unidad ? COMUNIDADES.find((c) => c.id === unidad.idRed)! : null;
    const tiene = (m: Modulo) => !!comunidad?.modulos.includes(m);
    const cargo = cuenta?.cargos.find((c) => c.idRed === comunidad?.id)?.cargo ?? null;
    const relacion = cuenta?.residencias.find((r) => r.idUnidad === idUnidad)?.relacion ?? null;
    const autor = cuenta ? `${cuenta.nombre} ${cuenta.apellido}` : '';

    const avisar = (texto: string) => {
      setAviso(texto);
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setAviso(null), 3500);
    };

    const acciones = {
      iniciarSesion: (c: Cuenta) => { setCuenta(c); setIdUnidad(c.residencias[0].idUnidad); },
      cerrarSesion: () => { setCuenta(null); setIdUnidad(null); },
      cambiarUnidad: (id: string) => { setIdUnidad(id); avisar(`Ahora ves ${UNIDADES[id].tipo === 'Departamento' ? 'el Depto' : 'la Casa'} ${UNIDADES[id].numero}.`); },
      avisarTransferencia: (a: Omit<AvisoTransferencia, 'enviado'>) => {
        if (!idUnidad) return;
        setAvisos((x) => ({ ...x, [idUnidad]: { ...a, enviado: new Date().toISOString() } }));
        avisar('Aviso enviado. La administración marcará el pago cuando vea la transferencia.');
      },
      crearInvitacion: (inv: Omit<Invitacion, 'id' | 'codigo' | 'idUnidad' | 'estado'>) => {
        const nueva: Invitacion = { ...inv, id: nuevoId('i'), codigo: nuevoCodigo(), idUnidad: idUnidad!, estado: 'esperada' };
        setInvitaciones((x) => [nueva, ...x]);
        return nueva;
      },
      cancelarInvitacion: (id: string) => {
        setInvitaciones((x) => x.map((i) => (i.id === id ? { ...i, estado: 'cancelada' } : i)));
        avisar('Invitación cancelada. El código ya no abre la entrada.');
      },
      reservar: (r: Omit<Reserva, 'id' | 'idRed' | 'idUnidad' | 'estado'>) => {
        setReservas((x) => [...x, { ...r, id: nuevoId('r'), idRed: comunidad!.id, idUnidad: idUnidad!, estado: 'confirmada' }]);
        avisar(`${r.espacio} reservado.`);
      },
      cancelarReserva: (id: string) => {
        setReservas((x) => x.map((r) => (r.id === id ? { ...r, estado: 'cancelada' } : r)));
        avisar('Reserva cancelada. El espacio quedó libre para otros vecinos.');
      },
      publicar: (p: Pick<Publicacion, 'lugar' | 'texto' | 'precio' | 'categoria'>) => {
        setPublicaciones((x) => [{ ...p, id: nuevoId('m'), idRed: comunidad!.id, autor, idUnidad: idUnidad!, fecha: new Date().toISOString() }, ...x]);
        avisar(p.lugar === 'mercado' ? 'Tu aviso ya está en el mercado.' : 'Publicado en el muro.');
      },
      eliminarPublicacion: (id: string) => {
        setPublicaciones((x) => x.filter((p) => p.id !== id));
        avisar('Publicación eliminada.');
      },
      reportar: (id: string) => {
        setPublicaciones((x) => x.map((p) => (p.id === id ? { ...p, reportadaPorMi: true } : p)));
        avisar('Gracias. La administración revisará la publicación.');
      },
      votar: (idVotacion: string, idOpcion: string) => {
        setVotaciones((x) => x.map((v) => (v.id === idVotacion ? { ...v, opciones: v.opciones.map((o) => (o.id === idOpcion ? { ...o, votos: o.votos + 1 } : o)) } : v)));
        setMisVotos((x) => ({ ...x, [`${idVotacion}:${idUnidad}`]: idOpcion }));
        avisar('Voto registrado por tu vivienda.');
      },
      avisar,
    };

    return {
      cuenta, unidad, comunidad, cargo, relacion, tiene, aviso,
      estado: idUnidad ? estados[idUnidad] : null,
      avisoTransferencia: idUnidad ? avisos[idUnidad] ?? null : null,
      misInvitaciones: invitaciones.filter((i) => i.idUnidad === idUnidad),
      reservasComunidad: reservas.filter((r) => r.idRed === comunidad?.id && r.estado !== 'cancelada'),
      misReservas: reservas.filter((r) => r.idUnidad === idUnidad),
      publicaciones: publicaciones.filter((p) => p.idRed === comunidad?.id),
      votaciones: votaciones.filter((v) => v.idRed === comunidad?.id),
      miVoto: (idVotacion: string) => misVotos[`${idVotacion}:${idUnidad}`] ?? null,
      acciones,
    };
  }, [cuenta, idUnidad, estados, avisos, invitaciones, reservas, publicaciones, votaciones, misVotos, aviso]);
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
