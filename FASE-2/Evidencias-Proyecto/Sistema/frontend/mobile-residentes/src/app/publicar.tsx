import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/App';
import { clp, nombreUnidad } from '@/utils/formato';
import { MAX_AVISOS_DISPONIBLES, MAX_DESCRIPCION_AVISO, MAX_TITULO_AVISO, MIN_TITULO_AVISO, PRECIO_MAXIMO, type TipoAviso } from '@/data/demo';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';

const TIPOS: { valor: TipoAviso; texto: string }[] = [{ valor: 'Vendo', texto: 'Vendo' }, { valor: 'Servicio', texto: 'Ofrezco un servicio' }, { valor: 'Busco', texto: 'Busco' }];
const DIGITOS_PRECIO = String(PRECIO_MAXIMO).length;

// Publicar en el muro o poner un aviso en el mercado. Lo oficial lo publica la directiva desde el panel.
// Con `editar` (id de un aviso propio) cambia título, descripción y precio; el tipo no se cambia.
export default function Publicar() {
  const { lugar: inicial, editar } = useLocalSearchParams<{ lugar?: string; editar?: string }>();
  const { cuenta, unidad, tiene, publicaciones, misDisponibles, acciones } = useApp();
  const original = editar ? publicaciones.find((p) => p.lugar === 'mercado' && p.mia && p.id === Number(editar)) : undefined;
  const [lugar, setLugar] = useState<'muro' | 'mercado'>(inicial === 'mercado' || editar ? 'mercado' : 'muro');
  const [titulo, setTitulo] = useState(original?.titulo ?? '');
  const [texto, setTexto] = useState(original?.texto ?? '');
  const [tipo, setTipo] = useState<TipoAviso>(original?.tipo ?? 'Vendo');
  const [precio, setPrecio] = useState(original?.precio != null ? String(original.precio) : '');
  if (!unidad || !cuenta) return null;
  if (editar && (!original || original.cerrado || original.oculto)) {
    return (
      <Hoja titulo="Editar aviso" abajo={<Boton texto="Volver" onPress={() => router.back()} />}>
        <Texto v="suave">{!original ? 'Este aviso ya no está disponible.' : original.oculto ? 'El aviso está oculto por la administración: no puedes editarlo.' : 'Reabre el aviso para editarlo.'}</Texto>
      </Hoja>
    );
  }

  const mercado = lugar === 'mercado';
  // Para publicar en el mercado hace falta un teléfono (se comparte al aceptar a un vecino) y un cupo libre
  const sinTelefono = mercado && !editar && !cuenta.telefono;
  const sinCupo = mercado && !editar && misDisponibles >= MAX_AVISOS_DISPONIBLES;
  const valorPrecio = precio && tipo !== 'Busco' ? Number(precio) : null;
  const valido = mercado
    ? titulo.trim().length >= MIN_TITULO_AVISO && (valorPrecio ?? 0) <= PRECIO_MAXIMO && !sinTelefono && !sinCupo
    : texto.trim().length >= 5;
  const enviar = () => {
    if (!valido) return;
    const aviso = { titulo: titulo.trim(), descripcion: texto.trim() || null, precio: valorPrecio };
    const listo = original ? acciones.editarAviso(original.id, aviso)
      : mercado ? acciones.publicar({ lugar, tipo, ...aviso })
        : acciones.publicar({ lugar, contenido: texto.trim() });
    if (listo) router.back();
  };

  return (
    <Hoja titulo={original ? 'Editar aviso' : 'Publicar'} abajo={<Boton texto={original ? 'Guardar cambios' : mercado ? 'Publicar aviso' : 'Publicar en el muro'} disabled={!valido} onPress={enviar} />}>
      {!editar && tiene('muro') && tiene('marketplace') && (
        <Opciones etiqueta="Dónde" valor={lugar} onCambio={(v) => setLugar(v)} opciones={[{ valor: 'muro', texto: 'Muro', detalle: 'Avisos y conversación' }, { valor: 'mercado', texto: 'Mercado', detalle: 'Vender u ofrecer' }]} />
      )}
      {sinTelefono && (
        <Tarjeta>
          <Texto v="fuerte">Agrega tu teléfono para publicar</Texto>
          <Texto v="suave">Es el dato que les compartimos a los vecinos que aceptes cuando te pidan contacto.</Texto>
          <Boton tipo="secundario" texto="Ir a Mis datos" icono="create-outline" onPress={() => router.push('/mis-datos')} />
        </Tarjeta>
      )}
      {sinCupo && (
        <Tarjeta>
          <Texto v="fuerte">Tienes {MAX_AVISOS_DISPONIBLES} avisos disponibles</Texto>
          <Texto v="suave">Es el máximo. Marca alguno como vendido o elimínalo desde «Mis avisos» para publicar otro.</Texto>
        </Tarjeta>
      )}
      {mercado && (
        <>
          {original
            ? <Texto v="suave">Tipo de aviso: {TIPOS.find((x) => x.valor === tipo)?.texto}. El tipo no se puede cambiar.</Texto>
            : <Opciones etiqueta="Tipo de aviso" valor={tipo} onCambio={setTipo} opciones={TIPOS} />}
          <Campo etiqueta="Título" value={titulo} onChangeText={setTitulo} maxLength={MAX_TITULO_AVISO} placeholder={tipo === 'Busco' ? 'Escalera de 3 metros' : tipo === 'Servicio' ? 'Clases de matemáticas' : 'Bicicleta aro 26'} />
          {tipo !== 'Busco' && (
            <Campo
              etiqueta="Precio (opcional)" value={precio} onChangeText={(v) => setPrecio(v.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))} keyboardType="number-pad" maxLength={DIGITOS_PRECIO}
              ayuda={precio ? clp(Number(precio)) : 'Déjalo vacío si es a convenir'}
            />
          )}
        </>
      )}
      <Campo
        etiqueta={mercado ? 'Descripción (opcional)' : 'Mensaje'} value={texto} onChangeText={setTexto} multiline maxLength={MAX_DESCRIPCION_AVISO}
        placeholder={mercado ? 'En buen estado, se puede probar en el pasaje…' : '¿Alguien perdió un gato gris?…'}
        style={{ minHeight: 140, paddingTop: 12, textAlignVertical: 'top' }} ayuda={`${texto.length}/${MAX_DESCRIPCION_AVISO} · se publica como ${nombreUnidad(unidad)}`}
      />
      {mercado && cuenta.telefono && (
        <Texto v="suave">Tus vecinos verán tu nombre y {nombreUnidad(unidad)}. Tu teléfono {cuenta.telefono} solo se comparte con quienes aceptes cuando te pidan contacto.</Texto>
      )}
      <Texto v="chico">Las publicaciones se moderan según las normas de la comunidad. No compartas datos personales de otros vecinos.</Texto>
    </Hoja>
  );
}
