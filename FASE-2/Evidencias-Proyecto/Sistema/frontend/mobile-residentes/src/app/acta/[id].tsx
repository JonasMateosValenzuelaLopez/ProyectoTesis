import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { F, useTema } from '@/constants/tema';
import * as votacionesApi from '@/api/votaciones';
import { useConsulta } from '@/api/useConsulta';
import { fecha, fechaLargaTexto } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Texto from '@/components/ec/Texto';

// Un acta publicada: quiénes asistieron, qué se trató y qué se acordó. La API no tiene un GET por acta,
// así que se busca en el libro (GET actas).
export default function DetalleActa() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { comunidad } = useSesion();
  const { datos, error } = useConsulta(votacionesApi.listarActas, [comunidad?.idRed]);
  if (!datos) {
    return <Hoja titulo="Acta">{error ? <Texto color={t.bad}>{error.message}</Texto> : <ActivityIndicator color={t.accion} accessibilityLabel="Cargando el acta" />}</Hoja>;
  }
  const a = datos.find((x) => x.idActa === Number(id) && x.estado === 'Publicada');
  if (!a) return <Hoja titulo="Acta"><Texto>No encontramos esta acta.</Texto></Hoja>;
  const asistentes = votacionesApi.lineas(a.asistentes);
  return (
    <Hoja titulo={`Acta N° ${a.numero}`}>
      <View style={{ gap: 4 }}>
        <Texto v="titulo">{a.tipo}</Texto>
        <Texto v="suave">
          {fechaLargaTexto(a.fecha)} · {a.lugar}{a.unidadesPresentes != null ? ` · ${a.unidadesPresentes} viviendas presentes` : ''}
        </Texto>
      </View>
      <Tarjeta>
        <Texto v="etiqueta">Temas tratados</Texto>
        {votacionesApi.lineas(a.temas).map((x, i) => <Texto key={i}>{i + 1}. {x}</Texto>)}
      </Tarjeta>
      <Tarjeta>
        <Texto v="etiqueta">Acuerdos</Texto>
        {a.acuerdos.length === 0 && <Texto v="suave">Sin acuerdos.</Texto>}
        {a.acuerdos.map((x, i) => (
          <View key={x.idAcuerdo} style={{ flexDirection: 'row', gap: 12, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderColor: t.line }}>
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
          {asistentes.map((x, i) => <Texto key={i}>{x}</Texto>)}
        </Tarjeta>
      )}
      {a.publicadaEn && <Texto v="chico">Publicada{a.redactor?.nombre ? ` por ${a.redactor.nombre}` : ''} el {fecha(a.publicadaEn)}.</Texto>}
    </Hoja>
  );
}
