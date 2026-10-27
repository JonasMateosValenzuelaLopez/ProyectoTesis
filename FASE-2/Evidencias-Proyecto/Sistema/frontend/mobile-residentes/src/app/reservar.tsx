import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { diaISO, espaciosActivos, hora } from '@/data/demo';
import { cuando, fechaLargaTexto } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';

const DIAS = Array.from({ length: 14 }, (_, n) => { const d = new Date(); d.setDate(d.getDate() + n); return diaISO(d); });

// Reservar un espacio común: día, bloque libre y cuántos invitados.
export default function Reservar() {
  const t = useTema();
  const { espacio: inicial } = useLocalSearchParams<{ espacio?: string }>();
  const { comunidad, reservasComunidad, tiene, acciones } = useApp();
  const espacios = espaciosActivos(comunidad);
  // El parámetro es el id_espacio; por defecto, el primer espacio de la comunidad
  const [espacio, setEspacio] = useState(inicial ? Number(inicial) : espacios[0]?.id_espacio ?? 0);
  const [dia, setDia] = useState(DIAS[0]);
  const [bloque, setBloque] = useState<string | null>(null);
  const [invitados, setInvitados] = useState('');
  if (!comunidad) return null;
  const e = espacios.find((x) => x.id_espacio === espacio);
  if (!e) return <Hoja titulo="Reservar"><Texto>Este espacio no existe.</Texto></Hoja>;

  const ahora = new Date();
  const tomado = (inicio: string) => reservasComunidad.some((r) => r.id_espacio === espacio && r.fecha_reserva === dia && r.hora_inicio === inicio);
  const pasado = (inicio: string) => dia === DIAS[0] && Number(inicio.slice(0, 2)) <= ahora.getHours();
  // `bloque` guarda el id_bloque elegido
  const elegido = e.espacios_bloques.find((b) => String(b.id_bloque) === bloque);
  const nInvitados = Number(invitados || 0);
  const excede = e.capacidad != null && nInvitados > e.capacidad;

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
        opciones={e.espacios_bloques.map((b) => ({ valor: String(b.id_bloque), texto: `${hora(b.hora_inicio)} a ${hora(b.hora_fin)}`, detalle: tomado(b.hora_inicio) ? 'Reservado' : pasado(b.hora_inicio) ? 'Ya pasó' : 'Libre', deshabilitada: tomado(b.hora_inicio) || pasado(b.hora_inicio) }))}
      />
      <Campo etiqueta="Invitados" value={invitados} onChangeText={(v) => setInvitados(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="0"
        error={excede && `El espacio admite hasta ${e.capacidad} personas`} ayuda={e.capacidad != null ? `Máximo ${e.capacidad} personas` : undefined} />
      <Texto v="chico" color={t.ink2}>{e.descripcion ?? ''}{tiene('conserjeria') ? ' La entrega y la devolución quedan registradas en conserjería.' : ''}</Texto>
    </Hoja>
  );
}
