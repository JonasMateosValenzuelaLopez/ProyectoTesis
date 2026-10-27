import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/App';
import { F, useTema } from '@/constants/tema';
import { fecha, fechaLargaTexto } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Texto from '@/components/ec/Texto';

// Columnas `text` de `actas`: un elemento por línea
const lineas = (texto: string | null) => (texto ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

// Un acta publicada: quiénes asistieron, qué se trató y qué se acordó.
export default function DetalleActa() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { actas } = useApp();
  const a = actas.find((x) => x.id_acta === Number(id));
  if (!a) return <Hoja titulo="Acta"><Texto>No encontramos esta acta.</Texto></Hoja>;
  const asistentes = lineas(a.asistentes);
  return (
    <Hoja titulo={`Acta N° ${a.numero}`}>
      <View style={{ gap: 4 }}>
        <Texto v="titulo">{a.tipo}</Texto>
        <Texto v="suave">
          {fechaLargaTexto(a.fecha)}{a.lugar ? ` · ${a.lugar}` : ''}{a.unidades_presentes != null ? ` · ${a.unidades_presentes} viviendas presentes` : ''}
        </Texto>
      </View>
      <Tarjeta>
        <Texto v="etiqueta">Temas tratados</Texto>
        {lineas(a.temas).map((x, i) => <Texto key={x}>{i + 1}. {x}</Texto>)}
      </Tarjeta>
      <Tarjeta>
        <Texto v="etiqueta">Acuerdos</Texto>
        {a.acuerdos.length === 0 && <Texto v="suave">Sin acuerdos.</Texto>}
        {a.acuerdos.map((x, i) => (
          <View key={x.id_acuerdo} style={{ flexDirection: 'row', gap: 12, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderColor: t.line }}>
            <Texto v="fuerte" style={{ fontFamily: F.numero, color: t.accion, minWidth: 14 }}>{i + 1}</Texto>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto>{x.texto}</Texto>
              {(x.responsable || x.plazo) && <Texto v="chico">{[x.responsable, x.plazo && `plazo ${fecha(x.plazo)}`].filter(Boolean).join(' · ')}</Texto>}
            </View>
          </View>
        ))}
      </Tarjeta>
      {asistentes.length > 0 && (
        <Tarjeta>
          <Texto v="etiqueta">Asistentes</Texto>
          {asistentes.map((x) => <Texto key={x}>{x}</Texto>)}
        </Tarjeta>
      )}
      {a.fecha_publicacion && <Texto v="chico">Publicada por Secretaría el {fecha(a.fecha_publicacion)}.</Texto>}
    </Hoja>
  );
}
