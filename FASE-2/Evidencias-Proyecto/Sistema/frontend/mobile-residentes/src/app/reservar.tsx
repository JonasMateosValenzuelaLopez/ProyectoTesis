import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { DIAS_PARA_RESERVAR, MAX_BLOQUES_POR_DIA, MAX_INVITADOS, diaISO, espaciosActivos, hora, yaPaso } from '@/data/demo';
import { cuando, fechaLargaTexto } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';

const DIAS = Array.from({ length: DIAS_PARA_RESERVAR }, (_, n) => { const d = new Date(); d.setDate(d.getDate() + n); return diaISO(d); });

// Reservar un espacio común: día, bloque libre y cuántos invitados.
// Como la API: desde hoy hasta 14 días, sin horarios que ya empezaron, y hasta 2 horarios por día por vivienda en un espacio.
export default function Reservar() {
  const t = useTema();
  const { espacio: inicial } = useLocalSearchParams<{ espacio?: string }>();
  const { comunidad, reservasComunidad, misReservas, tiene, acciones } = useApp();
  const espacios = espaciosActivos(comunidad);
  // El parámetro es el id_espacio; por defecto, el primer espacio de la comunidad
  const [espacio, setEspacio] = useState(inicial ? Number(inicial) : espacios[0]?.id_espacio ?? 0);
  const [dia, setDia] = useState(DIAS[0]);
  const [bloque, setBloque] = useState<string | null>(null);
  const [invitados, setInvitados] = useState('');
  if (!comunidad) return null;
  const e = espacios.find((x) => x.id_espacio === espacio);
  if (!e) return <Hoja titulo="Reservar"><Texto>Este espacio no existe.</Texto></Hoja>;

  const tomado = (inicio: string) => reservasComunidad.some((r) => r.id_espacio === espacio && r.fecha_reserva === dia && r.hora_inicio === inicio);
  // Compara hora y minutos, como la API (antes solo miraba la hora en punto)
  const pasado = (inicio: string) => yaPaso(dia, inicio);
  // Horarios que ya tiene la vivienda en este espacio ese día (las canceladas no cuentan)
  const mios = misReservas.filter((r) => r.id_espacio === espacio && r.fecha_reserva === dia && r.estado_reserva !== 'Cancelada' && r.estado_reserva !== 'Rechazada').length;
  const limite = mios >= MAX_BLOQUES_POR_DIA;
  const estadoBloque = (inicio: string) => (tomado(inicio) ? 'Reservado' : pasado(inicio) ? 'Ya pasó' : limite ? 'Límite del día' : 'Libre');
  // `bloque` guarda el id_bloque elegido; si deja de estar libre (por ejemplo, se cumplió el límite) se descarta
  const candidato = e.espacios_bloques.find((b) => String(b.id_bloque) === bloque);
  const elegido = candidato && estadoBloque(candidato.hora_inicio) === 'Libre' ? candidato : undefined;
  const nInvitados = Number(invitados || 0);
  const excede = (e.capacidad != null && nInvitados > e.capacidad) || nInvitados > MAX_INVITADOS;

  const confirmar = () => {
    if (!elegido || excede) return;
    acciones.reservar({ id_espacio: espacio, fecha_reserva: dia, hora_inicio: elegido.hora_inicio, hora_fin: elegido.hora_fin, cantidad_invitados: nInvitados });
    router.back();
  };

  return (
    <Hoja
      titulo={`Reservar ${e.nombre.toLowerCase()}`}
      abajo={<Boton texto={elegido ? `Reservar ${cuando(dia)}, ${hora(elegido.hora_inicio)} a ${hora(elegido.hora_fin)}` : 'Elige un horario'} disabled={!elegido || excede} onPress={confirmar} />}
    >
      {espacios.length > 1 && (
        <Opciones etiqueta="Espacio" valor={String(espacio)} onCambio={(v) => { setEspacio(Number(v)); setBloque(null); }} opciones={espacios.map((x) => ({ valor: String(x.id_espacio), texto: x.nombre }))} />
      )}
      <Opciones etiqueta="Día" scroll valor={dia} onCambio={(v) => { setDia(v); setBloque(null); }} opciones={DIAS.map((d) => ({ valor: d, texto: cuando(d).replace(/^el /, '') }))} />
      <Opciones
        etiqueta={`Horario del ${fechaLargaTexto(dia)}`} valor={bloque} onCambio={setBloque}
        opciones={e.espacios_bloques.map((b) => {
          const estado = estadoBloque(b.hora_inicio);
          return { valor: String(b.id_bloque), texto: `${hora(b.hora_inicio)} a ${hora(b.hora_fin)}`, detalle: estado, deshabilitada: estado !== 'Libre' };
        })}
      />
      {limite && (
        <Texto v="chico" color={t.ink2}>Tu vivienda ya tiene {MAX_BLOQUES_POR_DIA} horarios de {e.nombre.toLowerCase()} ese día. Elige otro día.</Texto>
      )}
      <Campo etiqueta="Invitados" value={invitados} onChangeText={(v) => setInvitados(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="0"
        error={excede && `El espacio admite hasta ${Math.min(e.capacidad ?? MAX_INVITADOS, MAX_INVITADOS)} personas`}
        ayuda={e.capacidad != null ? `Máximo ${e.capacidad} personas` : undefined} />
      <Texto v="chico" color={t.ink2}>{e.descripcion ?? ''}{tiene('conserjeria') ? ' La entrega y la devolución quedan registradas en conserjería.' : ''}</Texto>
    </Hoja>
  );
}
