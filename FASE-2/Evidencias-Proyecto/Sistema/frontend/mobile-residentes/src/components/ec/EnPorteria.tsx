import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as accesos from '@/api/accesos';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import { useAlEnfocar } from '@/api/useAlEnfocar';
import { hace } from '@/utils/formato';
import Tarjeta from './Tarjeta';
import Texto from './Texto';
import Boton from './Boton';

const ACTUALIZAR_MS = 15000;
const sinConserjeria = () => Promise.resolve({ porAutorizar: [] });

// Alguien llegó a portería sin invitación (GET accesos/por-autorizar): la vivienda decide si pasa
// (POST accesos/:id/respuesta). Va primero en Inicio porque la persona está esperando.
// Sin tiempo real en la API todavía, se vuelve a preguntar cada 15 segundos mientras Inicio está abierto.
export default function EnPorteria() {
  const t = useTema();
  const { comunidad, tiene, acciones } = useSesion();
  const conConserjeria = tiene('conserjeria');
  const { datos, cargando, recargar, setDatos } = useConsulta(conConserjeria ? accesos.porAutorizar : sinConserjeria, [comunidad?.idRed, conConserjeria]);
  useAlEnfocar(recargar);
  const [enviando, setEnviando] = useState<string | null>(null);
  // No pregunta con la app en segundo plano ni si la consulta anterior no terminó; al volver a la app, se pone al día
  const ocupado = useRef(false);
  useEffect(() => { ocupado.current = cargando; });
  useEffect(() => {
    if (!conConserjeria) return undefined;
    const intervalo = setInterval(() => {
      if (AppState.currentState === 'active' && !ocupado.current) recargar();
    }, ACTUALIZAR_MS);
    const suscripcion = AppState.addEventListener('change', (estado) => { if (estado === 'active') recargar(); });
    return () => { clearInterval(intervalo); suscripcion.remove(); };
  }, [conConserjeria, recargar]);

  const responder = async (idAcceso: number, visitante: string, aprobado: boolean) => {
    setEnviando(`${idAcceso}-${aprobado}`);
    try {
      await accesos.responderAcceso(idAcceso, aprobado);
      acciones.avisar(aprobado ? `Listo. Conserjería dejará pasar a ${visitante}.` : 'Avisamos a conserjería que no autorizas el ingreso.');
      setDatos((d) => ({ porAutorizar: (d?.porAutorizar ?? []).filter((a) => a.idAcceso !== idAcceso) }));
    } catch (e) {
      acciones.avisar(mensajeDe(e));
      recargar();
    } finally {
      setEnviando(null);
    }
  };

  return (datos?.porAutorizar ?? []).map((v) => {
    const nombre = v.visitante ?? 'Una visita';
    return (
      <Tarjeta key={v.idAcceso} acento={t.signal}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="notifications" size={20} color={t.oscuro ? t.signal : t.signalInk} />
          <Texto v="etiqueta" style={{ flex: 1 }}>En portería ahora · {hace(v.llegada)}</Texto>
        </View>
        <View style={{ gap: 2 }}>
          <Texto v="subtitulo">{nombre}</Texto>
          <Texto v="suave">
            {v.categoria} sin invitación{v.unidad ? ` para la vivienda ${v.unidad.numeroIdentificador}` : ''}{v.patente ? ` · patente ${v.patente}` : ''}. Conserjería pregunta si puede pasar.
          </Texto>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton texto="Dejar pasar" style={{ flex: 1 }} cargando={enviando === `${v.idAcceso}-true`} disabled={!!enviando} onPress={() => responder(v.idAcceso, nombre, true)} accessibilityLabel={`Dejar pasar a ${nombre}`} />
          <Boton tipo="secundario" texto="No autorizo" style={{ flex: 1 }} cargando={enviando === `${v.idAcceso}-false`} disabled={!!enviando} onPress={() => responder(v.idAcceso, nombre, false)} accessibilityLabel={`No autorizar a ${nombre}`} />
        </View>
      </Tarjeta>
    );
  });
}
