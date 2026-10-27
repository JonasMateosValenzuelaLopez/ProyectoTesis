import { View } from 'react-native';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';

const TAMANOS = {
  sm: { pad: 3, radio: 7, px: 8, py: 2, borde: 1.5, numero: 17, etiqueta: 8 },
  md: { pad: 4, radio: 10, px: 12, py: 4, borde: 2, numero: 26, etiqueta: 9 },
  lg: { pad: 5, radio: 12, px: 16, py: 5, borde: 2, numero: 40, etiqueta: 11 },
};

// La placa numerada de la vivienda: el sello de la marca.
export default function PlacaUnidad({ tipo, numero, size = 'md', invertida = false }: { tipo: string; numero: string; size?: keyof typeof TAMANOS; invertida?: boolean }) {
  const t = useTema();
  const s = TAMANOS[size];
  const fondo = invertida ? t.surface : t.cobalt;
  const tinta = invertida ? t.cobalt : t.cobaltInk;
  const etiqueta = tipo === 'Departamento' ? 'Depto' : tipo;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: fondo, padding: s.pad, borderRadius: s.radio }}>
      <View style={{ borderWidth: s.borde, borderColor: tinta, borderRadius: s.radio - s.pad + 1, paddingHorizontal: s.px, paddingVertical: s.py, alignItems: 'center' }}>
        {!!etiqueta && <Texto style={{ fontFamily: F.etiqueta, fontSize: s.etiqueta, lineHeight: s.etiqueta + 3, letterSpacing: 1.5, textTransform: 'uppercase', color: tinta }}>{etiqueta}</Texto>}
        <Texto style={{ fontFamily: F.cifra, fontSize: s.numero, lineHeight: s.numero * 1.1, color: tinta, fontVariant: ['tabular-nums'] }}>{numero}</Texto>
      </View>
    </View>
  );
}
