import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as comunidadApi from '@/api/comunidad';
import * as reservasApi from '@/api/reservas';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import { diaLocal } from '@/api/useMiCuenta';
import { cuando, fechaLargaTexto } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';

const DIAS = Array.from({ length: reservasApi.DIAS_PARA_RESERVAR }, (_, n) => diaLocal(-n));
const VIGENTES = ['Pendiente', 'Aprobada', 'Entregado'];

// Reservar un espacio común (POST reservas): día, horario libre (GET reservas/disponibilidad) e invitados.
// Como la API: desde hoy hasta 14 días, sin horarios que ya empezaron, y hasta 2 horarios por día por vivienda en un espacio.
export default function Reservar() {
  const t = useTema();
  const { espacio: inicial } = useLocalSearchParams<{ espacio?: string }>();
  const { comunidad, unidad, tiene, acciones } = useSesion();
  const espacios = useConsulta(comunidadApi.espacios, [comunidad?.idRed]);
  const mias = useConsulta(reservasApi.mias, [comunidad?.idRed]);
  const [idEspacio, setIdEspacio] = useState(inicial ? Number(inicial) : 0);
  const [dia, setDia] = useState(DIAS[0]);
  const lista = espacios.datos ?? [];
  const e = lista.find((x) => x.idEspacio === idEspacio) ?? lista[0];
  const disponible = useConsulta(
    () => (e ? reservasApi.disponibilidad(e.idEspacio, dia) : Promise.resolve(null)),
    [e?.idEspacio, dia],
  );
  const [bloque, setBloque] = useState<string | null>(null);
  const [invitados, setInvitados] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!comunidad || !unidad) return null;
  if (espacios.error || (!espacios.datos)) {
    return (
      <Hoja titulo="Reservar">
        {espacios.error ? (
          <>
            <Texto color={t.bad}>{espacios.error.message}</Texto>
            <Boton tipo="texto" texto="Reintentar" onPress={espacios.recargar} />
          </>
        ) : <ActivityIndicator color={t.accion} accessibilityLabel="Cargando espacios" />}
      </Hoja>
    );
  }
  if (!e) return <Hoja titulo="Reservar"><Texto>La comunidad no tiene espacios para reservar.</Texto></Hoja>;

  // Horarios que ya tiene la vivienda en este espacio ese día (las canceladas no cuentan)
  const deLaVivienda = (mias.datos ?? []).filter((r) => r.idUnidad === unidad.idUnidad && r.idEspacio === e.idEspacio && r.fecha === dia && VIGENTES.includes(r.estado)).length;
  const limite = deLaVivienda >= reservasApi.MAX_BLOQUES_POR_DIA;
  // La disponibilidad que llegó es la del espacio y día elegidos (mientras carga la nueva, no se muestra la anterior)
  const bloques = disponible.datos && disponible.datos.idEspacio === e.idEspacio && disponible.datos.fecha === dia ? disponible.datos.bloques : null;
  const estadoDe = (estado: 'Libre' | 'Reservado' | 'Pasado') => (estado === 'Reservado' ? 'Reservado' : estado === 'Pasado' ? 'Ya pasó' : limite ? 'Límite del día' : 'Libre');
  const elegido = bloques?.find((b) => String(b.idBloque) === bloque && estadoDe(b.estado) === 'Libre');
  const nInvitados = Number(invitados || 0);
  const maximo = Math.min(e.capacidad ?? reservasApi.MAX_INVITADOS, reservasApi.MAX_INVITADOS);
  const excede = nInvitados > maximo;

  const confirmar = async () => {
    if (!elegido || excede) return;
    setEnviando(true);
    setError(null);
    try {
      await reservasApi.reservar({ idEspacio: e.idEspacio, idUnidad: unidad.idUnidad, fecha: dia, horaInicio: elegido.horaInicio, invitados: nInvitados });
      acciones.avisar(`Listo: reservaste ${e.nombre.toLowerCase()} ${cuando(dia)}, de ${elegido.horaInicio} a ${elegido.horaFin}.`);
      router.back();
    } catch (err) {
      setError(mensajeDe(err));
      disponible.recargar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Hoja
      titulo={`Reservar ${e.nombre.toLowerCase()}`}
      abajo={(
        <Boton
          texto={elegido ? `Reservar ${cuando(dia)}, ${elegido.horaInicio} a ${elegido.horaFin}` : 'Elige un horario'}
          disabled={!elegido || excede} cargando={enviando} onPress={confirmar}
        />
      )}
    >
      {lista.length > 1 && (
        <Opciones etiqueta="Espacio" valor={String(e.idEspacio)} onCambio={(v) => { setIdEspacio(Number(v)); setBloque(null); setError(null); }} opciones={lista.map((x) => ({ valor: String(x.idEspacio), texto: x.nombre }))} />
      )}
      <Opciones etiqueta="Día" scroll valor={dia} onCambio={(v) => { setDia(v); setBloque(null); setError(null); }} opciones={DIAS.map((d) => ({ valor: d, texto: cuando(d).replace(/^el /, '') }))} />
      {disponible.error ? (
        <>
          <Texto color={t.bad}>{disponible.error.message}</Texto>
          <Boton tipo="texto" texto="Reintentar" onPress={disponible.recargar} />
        </>
      ) : !bloques ? <ActivityIndicator color={t.accion} accessibilityLabel="Cargando horarios" />
        : bloques.length === 0 ? <Texto v="suave">Este espacio no tiene horarios para reservar.</Texto> : (
          <Opciones
            etiqueta={`Horario del ${fechaLargaTexto(dia)}`} valor={bloque} onCambio={(v) => { setBloque(v); setError(null); }}
            opciones={bloques.map((b) => {
              const estado = estadoDe(b.estado);
              return { valor: String(b.idBloque), texto: `${b.horaInicio} a ${b.horaFin}`, detalle: estado, deshabilitada: estado !== 'Libre' };
            })}
          />
        )}
      {limite && (
        <Texto v="chico" color={t.ink2}>Tu vivienda ya tiene {reservasApi.MAX_BLOQUES_POR_DIA} horarios de {e.nombre.toLowerCase()} ese día. Elige otro día.</Texto>
      )}
      <Campo
        etiqueta="Invitados" value={invitados} onChangeText={(v) => setInvitados(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="0"
        error={excede && `El espacio admite hasta ${maximo} personas`}
        ayuda={e.capacidad != null ? `Máximo ${e.capacidad} personas` : undefined}
      />
      {error && <Texto color={t.bad}>{error}</Texto>}
      <Texto v="chico" color={t.ink2}>{e.descripcion ?? ''}{tiene('conserjeria') ? ' La entrega y la devolución quedan registradas en conserjería.' : ''}</Texto>
    </Hoja>
  );
}
