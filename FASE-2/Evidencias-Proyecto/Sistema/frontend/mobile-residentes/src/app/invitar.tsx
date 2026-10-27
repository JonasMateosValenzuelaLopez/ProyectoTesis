import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { diaISO, type Invitacion } from '@/data/demo';
import { fechaLargaTexto, nombreDia, nombreUnidad } from '@/utils/formato';
import { formatearRut, rutValido } from '@/utils/rut';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';
import Calendario from '@/components/ec/Calendario';

const enDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return diaISO(d); };
const HOY = enDias(0);
const MANANA = enDias(1);
const LIMITE = enDias(60); // Se puede invitar hasta dos meses antes
const HORAS = Array.from({ length: 16 }, (_, n) => `${String(n + 7).padStart(2, '0')}:00`);
const DURACIONES = [{ valor: '2', texto: '2 horas' }, { valor: '4', texto: '4 horas' }, { valor: 'dia', texto: 'Hasta medianoche' }];

// Crear una invitación: genera un código QR que la conserjería (o el guardia) valida en la entrada.
export default function Invitar() {
  const t = useTema();
  const { unidad, comunidad, acciones } = useApp();
  const ahora = new Date();
  const horaSugerida = `${String(Math.min(Math.max(ahora.getHours() + 1, 7), 22)).padStart(2, '0')}:00`;
  const [f, setF] = useState({ visitante: '', rut: '', tipo: 'visita' as Invitacion['tipo'], dia: HOY, hora: horaSugerida, duracion: '4', patente: '' });
  const [intento, setIntento] = useState(false);
  const [otroDia, setOtroDia] = useState(false);
  if (!unidad || !comunidad) return null;

  const rutMal = !!f.rut.trim() && !rutValido(f.rut);
  const crear = () => {
    setIntento(true);
    if (!f.visitante.trim() || rutMal) return;
    const desde = new Date(`${f.dia}T${f.hora}:00`);
    const hasta = f.duracion === 'dia' ? new Date(`${f.dia}T23:59:00`) : new Date(desde.getTime() + Number(f.duracion) * 3600000);
    const inv = acciones.crearInvitacion({
      visitante: f.visitante.trim(), rut: f.rut.trim() ? formatearRut(f.rut) : '', tipo: f.tipo,
      desde: desde.toISOString(), hasta: hasta.toISOString(), patente: f.patente.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
    });
    router.replace({ pathname: '/invitacion/[id]', params: { id: inv.id, nueva: '1' } });
  };

  return (
    <Hoja titulo="Invitar visita" abajo={<Boton tipo="senal" icono="qr-code" texto="Crear invitación" onPress={crear} />}>
      <Texto v="suave">Tu visita muestra el código QR en {comunidad.modulos.includes('conserjeria') ? 'conserjería' : 'la entrada'} y queda registrada a nombre de {nombreUnidad(unidad)}.</Texto>
      <Campo etiqueta="Nombre de la visita" value={f.visitante} onChangeText={(v) => setF({ ...f, visitante: v })} autoComplete="name" placeholder="Daniela Pino" error={intento && !f.visitante.trim() && 'Escribe el nombre'} />
      <Campo etiqueta="RUT (opcional)" value={f.rut} onChangeText={(v) => setF({ ...f, rut: v })} onBlur={() => rutValido(f.rut) && setF({ ...f, rut: formatearRut(f.rut) })} autoCapitalize="characters" error={rutMal && 'RUT no válido'} ayuda="Agiliza la entrada si la conserjería lo pide" />
      <Opciones etiqueta="Es" valor={f.tipo} onCambio={(v) => setF({ ...f, tipo: v })}
        opciones={[{ valor: 'visita', texto: 'Visita' }, { valor: 'proveedor', texto: 'Proveedor' }, { valor: 'servicio', texto: 'Servicio' }]} />
      <Opciones
        etiqueta="Día" valor={otroDia ? 'otro' : f.dia === HOY ? 'hoy' : 'manana'}
        onCambio={(v) => {
          if (v === 'otro') { setOtroDia(true); if (f.dia === HOY || f.dia === MANANA) setF({ ...f, dia: enDias(2) }); return; }
          setOtroDia(false);
          setF({ ...f, dia: v === 'hoy' ? HOY : MANANA });
        }}
        opciones={[
          { valor: 'hoy', texto: 'Hoy', detalle: `${nombreDia(HOY)} ${Number(HOY.slice(8))}` },
          { valor: 'manana', texto: 'Mañana', detalle: `${nombreDia(MANANA)} ${Number(MANANA.slice(8))}` },
          { valor: 'otro', texto: 'Otro día', detalle: otroDia ? `${nombreDia(f.dia)} ${Number(f.dia.slice(8))}` : 'Calendario' },
        ]}
      />
      {otroDia && (
        <View style={{ gap: 8 }}>
          <Calendario valor={f.dia} desde={HOY} hasta={LIMITE} onCambio={(d) => { setF({ ...f, dia: d }); if (d === HOY || d === MANANA) setOtroDia(false); }} />
          <Texto v="suave">Llega el {nombreDia(f.dia)} {fechaLargaTexto(f.dia)}.</Texto>
        </View>
      )}
      <Opciones etiqueta="Llega desde" scroll valor={f.hora} onCambio={(v) => setF({ ...f, hora: v })}
        opciones={HORAS.map((h) => ({ valor: h, texto: h, deshabilitada: f.dia === HOY && Number(h.slice(0, 2)) < ahora.getHours() }))} />
      <Opciones etiqueta="Puede entrar durante" valor={f.duracion} onCambio={(v) => setF({ ...f, duracion: v })} opciones={DURACIONES} />
      <Campo etiqueta="Patente del auto (opcional)" value={f.patente} onChangeText={(v) => setF({ ...f, patente: v.toUpperCase() })} autoCapitalize="characters" placeholder="RTKD45" maxLength={8} />
      <Texto v="chico" color={t.ink2}>El código deja de servir al terminar el horario o si cancelas la invitación.</Texto>
    </Hoja>
  );
}
