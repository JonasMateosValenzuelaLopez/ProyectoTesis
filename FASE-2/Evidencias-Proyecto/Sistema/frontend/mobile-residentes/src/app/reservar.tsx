import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { diaISO } from '@/data/demo';
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
  const [espacio, setEspacio] = useState(inicial ?? comunidad?.espacios[0]?.nombre ?? '');
  const [dia, setDia] = useState(DIAS[0]);
  const [bloque, setBloque] = useState<string | null>(null);
  const [invitados, setInvitados] = useState('');
  if (!comunidad) return null;
  const e = comunidad.espacios.find((x) => x.nombre === espacio);
  if (!e) return <Hoja titulo="Reservar"><Texto>Este espacio no existe.</Texto></Hoja>;

  const ahora = new Date();
  const tomado = (desde: string) => reservasComunidad.some((r) => r.espacio === espacio && r.fecha === dia && r.desde === desde);
  const pasado = (desde: string) => dia === DIAS[0] && Number(desde.slice(0, 2)) <= ahora.getHours();
  const elegido = e.bloques.find(([d]) => d === bloque);
  const nInvitados = Number(invitados || 0);
  const excede = nInvitados > e.capacidad;

  const confirmar = () => {
    if (!elegido || excede) return;
    acciones.reservar({ espacio, fecha: dia, desde: elegido[0], hasta: elegido[1], invitados: nInvitados });
    router.back();
  };

  return (
    <Hoja
      titulo={`Reservar ${espacio.toLowerCase()}`}
      abajo={<Boton texto={elegido ? `Reservar ${cuando(dia)}, ${elegido[0]} a ${elegido[1]}` : 'Elige un horario'} disabled={!elegido || excede} onPress={confirmar} />}
    >
      {comunidad.espacios.length > 1 && (
        <Opciones etiqueta="Espacio" valor={espacio} onCambio={(v) => { setEspacio(v); setBloque(null); }} opciones={comunidad.espacios.map((x) => ({ valor: x.nombre, texto: x.nombre }))} />
      )}
      <Opciones etiqueta="Día" scroll valor={dia} onCambio={(v) => { setDia(v); setBloque(null); }} opciones={DIAS.map((d) => ({ valor: d, texto: cuando(d).replace(/^el /, '') }))} />
      <Opciones
        etiqueta={`Horario del ${fechaLargaTexto(dia)}`} valor={bloque} onCambio={setBloque}
        opciones={e.bloques.map(([d, h]) => ({ valor: d, texto: `${d} a ${h}`, detalle: tomado(d) ? 'Reservado' : pasado(d) ? 'Ya pasó' : 'Libre', deshabilitada: tomado(d) || pasado(d) }))}
      />
      <Campo etiqueta="Invitados" value={invitados} onChangeText={(v) => setInvitados(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="0"
        error={excede && `El espacio admite hasta ${e.capacidad} personas`} ayuda={`Máximo ${e.capacidad} personas`} />
      <Texto v="chico" color={t.ink2}>{e.reglas}{tiene('conserjeria') ? ' La entrega y la devolución quedan registradas en conserjería.' : ''}</Texto>
    </Hoja>
  );
}
