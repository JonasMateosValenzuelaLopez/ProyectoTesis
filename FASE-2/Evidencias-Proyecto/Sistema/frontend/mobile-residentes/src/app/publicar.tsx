import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/App';
import { clp, nombreUnidad } from '@/utils/formato';
import type { Publicacion } from '@/data/demo';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';

// Publicar en el muro o poner un aviso en el mercado. Lo oficial lo publica la directiva desde el panel.
export default function Publicar() {
  const { lugar: inicial } = useLocalSearchParams<{ lugar?: string }>();
  const { unidad, tiene, acciones } = useApp();
  const [lugar, setLugar] = useState<'muro' | 'mercado'>(inicial === 'mercado' ? 'mercado' : 'muro');
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState<NonNullable<Publicacion['categoria']>>('Vendo');
  const [precio, setPrecio] = useState('');
  if (!unidad) return null;

  const valido = texto.trim().length >= 5;
  const enviar = () => {
    if (!valido) return;
    acciones.publicar({ lugar, texto: texto.trim(), ...(lugar === 'mercado' ? { categoria, precio: precio ? Number(precio) : undefined } : {}) });
    router.back();
  };

  return (
    <Hoja titulo="Publicar" abajo={<Boton texto={lugar === 'mercado' ? 'Publicar aviso' : 'Publicar en el muro'} disabled={!valido} onPress={enviar} />}>
      {tiene('muro') && tiene('marketplace') && (
        <Opciones etiqueta="Dónde" valor={lugar} onCambio={(v) => setLugar(v)} opciones={[{ valor: 'muro', texto: 'Muro', detalle: 'Avisos y conversación' }, { valor: 'mercado', texto: 'Mercado', detalle: 'Vender u ofrecer' }]} />
      )}
      {lugar === 'mercado' && (
        <>
          <Opciones etiqueta="Tipo de aviso" valor={categoria} onCambio={setCategoria} opciones={[{ valor: 'Vendo', texto: 'Vendo' }, { valor: 'Servicio', texto: 'Ofrezco un servicio' }, { valor: 'Busco', texto: 'Busco' }]} />
          {categoria !== 'Busco' && <Campo etiqueta="Precio (opcional)" value={precio} onChangeText={(v) => setPrecio(v.replace(/\D/g, ''))} keyboardType="number-pad" ayuda={precio ? clp(Number(precio)) : 'Déjalo vacío si es a convenir'} />}
        </>
      )}
      <Campo
        etiqueta={lugar === 'mercado' ? 'Describe tu aviso' : 'Mensaje'} value={texto} onChangeText={setTexto} multiline maxLength={500}
        placeholder={lugar === 'mercado' ? 'Bicicleta aro 26 en buen estado…' : '¿Alguien perdió un gato gris?…'}
        style={{ minHeight: 140, paddingTop: 12, textAlignVertical: 'top' }} ayuda={`${texto.length}/500 · se publica como ${nombreUnidad(unidad)}`}
      />
      <Texto v="chico">Las publicaciones se moderan según las normas de la comunidad. No compartas datos personales de otros vecinos.</Texto>
    </Hoja>
  );
}
