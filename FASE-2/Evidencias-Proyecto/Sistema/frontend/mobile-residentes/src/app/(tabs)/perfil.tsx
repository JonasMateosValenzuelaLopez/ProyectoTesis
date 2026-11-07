import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { useApariencia, type Apariencia } from '@/context/Tema';
import { useTema } from '@/constants/tema';
import { UNIDADES, comunidadPorId, tipoUnidad } from '@/data/demo';
import { roles } from '@/constants/tokens';
import { nombreCompleto, nombreUnidad, telefono } from '@/utils/formato';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Fila from '@/components/ec/Fila';
import Chip from '@/components/ec/Chip';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import SelloCargo from '@/components/ec/SelloCargo';
import Segmentos from '@/components/ec/Segmentos';
import PasoSesion from '@/components/ec/PasoSesion';

const APARIENCIAS: { valor: Apariencia; texto: string }[] = [
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
  { valor: 'sistema', texto: 'Teléfono' },
];

// Perfil: datos de la cuenta, viviendas (una persona puede vivir o tener más de una) y salida.
export default function Perfil() {
  const t = useTema();
  const { cuenta, unidad, comunidad, cargo, relacion, tiene, acciones, misFichas } = useApp();
  const { apariencia, setApariencia } = useApariencia();
  const [saliendo, setSaliendo] = useState(false);
  // Después de la despedida se cierra la sesión y se vuelve al login
  const salir = useCallback(() => { acciones.cerrarSesion(); router.replace('/login'); }, [acciones]);
  if (!cuenta || !unidad || !comunidad) return null;
  const viviendas = cuenta.residencias.filter((r) => r.estado === 'Activa');
  const icono = (n: keyof typeof Ionicons.glyphMap) => <Ionicons name={n} size={22} color={t.accion} />;

  return (
    <Pantalla titulo="Perfil">
      <Tarjeta>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <PlacaUnidad tipo={tipoUnidad(unidad)} numero={unidad.numero_identificador} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto v="subtitulo">{nombreCompleto(cuenta)}</Texto>
            <Texto v="suave">{relacion ?? ''} · {comunidad.nombre}</Texto>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <SelloCargo cargo="residente" conTexto />
          {cargo && <View style={{ marginLeft: 8 }}><SelloCargo cargo={cargo} conTexto /></View>}
        </View>
        {cargo && <Texto v="chico">Como {roles[cargo].label.toLowerCase()} usas el panel web para tus tareas de cargo. En la app eres un vecino más.</Texto>}
      </Tarjeta>

      {viviendas.length > 1 && (
        <Tarjeta style={{ gap: 0 }}>
          <Texto v="subtitulo" style={{ marginBottom: 6 }}>Mis viviendas</Texto>
          {viviendas.map((r, n) => {
            const u = UNIDADES[r.id_unidad];
            const red = comunidadPorId(u.id_red)!;
            const activa = r.id_unidad === unidad.id_unidad;
            return (
              <Fila
                key={r.id_unidad} borde={n > 0} izquierda={<PlacaUnidad tipo="" numero={u.numero_identificador} size="sm" />}
                titulo={`${nombreUnidad(u)} · ${red.nombre}`} detalle={r.relacion}
                derecha={activa ? <Chip texto="Viendo" tono="accion" /> : undefined}
                onPress={activa ? undefined : () => { acciones.cambiarUnidad(r.id_unidad); router.navigate('/(tabs)'); }}
              />
            );
          })}
        </Tarjeta>
      )}

      <Tarjeta style={{ gap: 0 }}>
        {tiene('invitaciones_qr') && <Fila borde={false} izquierda={icono('qr-code-outline')} titulo="Mis invitaciones" detalle="Códigos QR vigentes y anteriores" onPress={() => router.push('/invitaciones')} />}
        <Fila borde={tiene('invitaciones_qr')} izquierda={icono('call-outline')} titulo="Contactos de la comunidad" detalle="Administración, conserjería y emergencias" onPress={() => router.push('/contactos')} />
        {tiene('votaciones') && <Fila izquierda={icono('book-outline')} titulo="Libro de actas" detalle="Reuniones y asambleas publicadas por Secretaría" onPress={() => router.push('/actas')} />}
        <Fila izquierda={icono('compass-outline')} titulo="Guía de la comunidad" detalle="Basura, reciclaje, espacios y contactos útiles" onPress={() => router.push('/bienvenida')} />
        <Fila izquierda={icono('help-circle-outline')} titulo="Cómo usar la app" detalle="Qué hay en cada sección y qué puedes hacer" onPress={() => router.push('/tutorial')} />
      </Tarjeta>

      <Tarjeta style={{ gap: 0 }}>
        <Fila
          borde={false} izquierda={icono('home-outline')} titulo="Mi hogar"
          detalle={misFichas.length ? `${misFichas.length === 1 ? '1 ficha' : `${misFichas.length} fichas`} · solo la ven quienes viven aquí` : 'Pintura, garantías, mantenciones y técnicos'}
          onPress={() => router.push('/mi-hogar')}
        />
      </Tarjeta>

      <Tarjeta style={{ gap: 0 }}>
        <Fila borde={false} titulo="RUT" detalle={cuenta.rut} />
        <Fila titulo="Correo" detalle={cuenta.correo} />
        <Fila titulo="Teléfono" detalle={telefono(cuenta.telefono) || 'Sin teléfono'} />
        <Boton tipo="secundario" texto="Actualizar correo o teléfono" icono="create-outline" onPress={() => router.push('/mis-datos')} style={{ marginTop: 12 }} />
        <Boton tipo="texto" texto="Cambiar contraseña" icono="key-outline" onPress={() => router.push('/cambiar-clave')} style={{ marginTop: 4 }} />
      </Tarjeta>

      <Tarjeta>
        <View style={{ gap: 2 }}>
          <Texto v="subtitulo">Apariencia</Texto>
          <Texto v="suave">Con «Teléfono», la app cambia sola cuando tu teléfono pasa a modo oscuro.</Texto>
        </View>
        <Segmentos opciones={APARIENCIAS} valor={apariencia} onCambio={setApariencia} />
      </Tarjeta>

      <Boton tipo="peligro" texto="Cerrar sesión" icono="log-out-outline" onPress={() => setSaliendo(true)} />
      {saliendo && <PasoSesion tipo="salir" nombre={cuenta.nombre} placa={{ tipo: tipoUnidad(unidad), numero: unidad.numero_identificador }} alTerminar={salir} />}
    </Pantalla>
  );
}
