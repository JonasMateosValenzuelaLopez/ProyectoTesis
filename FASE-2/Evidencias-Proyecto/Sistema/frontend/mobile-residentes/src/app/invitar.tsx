import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as accesos from '@/api/accesos';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import { diaLocal } from '@/api/useMiCuenta';
import type { CategoriaAcceso } from '@/api/tipos';
import { fechaLargaTexto, nombreDia, nombreUnidad } from '@/utils/formato';
import { formatearRut, rutValido } from '@/utils/rut';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';
import Calendario from '@/components/ec/Calendario';

const HORAS = Array.from({ length: 16 }, (_, n) => `${String(n + 7).padStart(2, '0')}:00`);
const DURACIONES = [{ valor: '2', texto: '2 horas' }, { valor: '4', texto: '4 horas' }, { valor: 'dia', texto: 'Hasta medianoche' }];

// Crear una invitación (POST invitaciones): genera un código QR que la conserjería valida en la entrada.
// Como la API: hasta 60 días de anticipación, hasta 24 horas de duración y hasta 30 invitaciones sin usar por vivienda.
export default function Invitar() {
  const t = useTema();
  const { unidad, comunidad, tiene, acciones } = useSesion();
  const lista = useConsulta(accesos.listarInvitaciones, [comunidad?.idRed]);
  const HOY = diaLocal(0);
  const MANANA = diaLocal(-1);
  const LIMITE = diaLocal(-accesos.MAX_DIAS_ANTICIPACION);
  const ahora = new Date();
  const horaSugerida = `${String(Math.min(Math.max(ahora.getHours() + 1, 7), 22)).padStart(2, '0')}:00`;
  const [f, setF] = useState({ nombre: '', rut: '', categoria: 'Visita' as CategoriaAcceso, dia: HOY, hora: horaSugerida, duracion: '4', patente: '' });
  const [intento, setIntento] = useState(false);
  const [otroDia, setOtroDia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (!unidad || !comunidad) return null;
  // La API solo acepta invitaciones si hay conserjería que las valide en la entrada
  if (!tiene('conserjeria')) {
    return (
      <Hoja titulo="Invitar visita" abajo={<Boton tipo="secundario" texto="Volver" onPress={() => router.back()} />}>
        <Texto v="suave">Tu comunidad no tiene conserjería que valide las invitaciones, así que por ahora no se pueden crear códigos para visitas.</Texto>
      </Hoja>
    );
  }
  const sinUsar = (lista.datos?.invitaciones ?? []).filter((i) => i.unidad?.idUnidad === unidad.idUnidad && i.estado === 'Esperada').length;
  const sinCupo = sinUsar >= accesos.MAX_INVITACIONES_VIGENTES;

  const nombre = f.nombre.trim().replace(/\s+/g, ' ');
  const patente = accesos.normalizarPatente(f.patente);
  const errorNombre = !nombre ? 'Escribe el nombre de la visita'
    : nombre.length < accesos.MIN_NOMBRE_VISITA ? `El nombre debe tener al menos ${accesos.MIN_NOMBRE_VISITA} caracteres` : false;
  const errorPatente = !!patente && !accesos.PATENTE.test(patente) && 'Entre 4 y 8 letras o números, sin espacios';
  const rutMal = !!f.rut.trim() && !rutValido(f.rut);
  const desde = new Date(`${f.dia}T${f.hora}:00`);
  const hasta = f.duracion === 'dia' ? new Date(`${f.dia}T23:59:00`) : new Date(desde.getTime() + Number(f.duracion) * 3600000);
  const yaTermino = hasta.getTime() <= ahora.getTime();

  const crear = async () => {
    setIntento(true);
    if (errorNombre || errorPatente || rutMal || sinCupo || yaTermino) return;
    setEnviando(true);
    setError(null);
    try {
      const inv = await accesos.crearInvitacion({
        nombre, categoria: f.categoria, idUnidad: unidad.idUnidad,
        validaDesde: desde.toISOString(), validaHasta: hasta.toISOString(),
        ...(f.rut.trim() ? { rut: formatearRut(f.rut) } : {}), ...(patente ? { patente } : {}),
      });
      acciones.avisar('Invitación creada. Comparte el código con tu visita.');
      router.replace({ pathname: '/invitacion/[id]', params: { id: String(inv.idInvitacion), nueva: '1' } });
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Hoja titulo="Invitar visita" abajo={<Boton tipo="senal" icono="qr-code" texto="Crear invitación" disabled={sinCupo} cargando={enviando} onPress={crear} />}>
      {sinCupo
        ? <Texto v="suave">Tu vivienda ya tiene {accesos.MAX_INVITACIONES_VIGENTES} invitaciones por usar, que es el máximo. Cancela alguna en «Mis invitaciones» para crear otra.</Texto>
        : <Texto v="suave">Tu visita muestra el código QR en conserjería y queda registrada a nombre de {nombreUnidad(unidad)}.</Texto>}
      <Campo etiqueta="Nombre de la visita" value={f.nombre} onChangeText={(v) => setF({ ...f, nombre: v })} autoComplete="name" placeholder="Daniela Pino" maxLength={accesos.MAX_NOMBRE_VISITA} error={intento && errorNombre} />
      <Campo etiqueta="RUT (opcional)" value={f.rut} onChangeText={(v) => setF({ ...f, rut: v })} onBlur={() => rutValido(f.rut) && setF({ ...f, rut: formatearRut(f.rut) })} autoCapitalize="characters" error={rutMal && 'RUT no válido'} ayuda="Agiliza la entrada si la conserjería lo pide" />
      <Opciones etiqueta="Es" valor={f.categoria} onCambio={(v) => setF({ ...f, categoria: v })}
        opciones={[{ valor: 'Visita', texto: 'Visita' }, { valor: 'Proveedor', texto: 'Proveedor' }, { valor: 'Servicio', texto: 'Servicio' }, { valor: 'Delivery', texto: 'Delivery' }]} />
      <Opciones
        etiqueta="Día" valor={otroDia ? 'otro' : f.dia === HOY ? 'hoy' : 'manana'}
        onCambio={(v) => {
          if (v === 'otro') { setOtroDia(true); if (f.dia === HOY || f.dia === MANANA) setF({ ...f, dia: diaLocal(-2) }); return; }
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
      {intento && yaTermino && <Texto v="chico" color={t.bad}>Ese horario ya terminó. Elige uno que termine en el futuro.</Texto>}
      <Campo etiqueta="Patente del auto (opcional)" value={f.patente} onChangeText={(v) => setF({ ...f, patente: v.toUpperCase() })} autoCapitalize="characters" placeholder="RTKD45" maxLength={10} error={intento && errorPatente} />
      {error && <Texto color={t.bad}>{error}</Texto>}
      <Texto v="chico" color={t.ink2}>El código deja de servir al terminar el horario o si cancelas la invitación.</Texto>
    </Hoja>
  );
}
