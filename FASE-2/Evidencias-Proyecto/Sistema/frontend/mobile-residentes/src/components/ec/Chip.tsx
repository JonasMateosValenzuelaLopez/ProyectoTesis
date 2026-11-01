import { View } from 'react-native';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';

export type Tono = 'ok' | 'warn' | 'bad' | 'neutro' | 'accion' | 'senal';

// Etiqueta de estado. El color es semántico: pagado, pendiente, con deuda.
// `codigo` para lo que se dicta en voz alta (códigos de invitación): Archivo con letras separadas.
export default function Chip({ texto, tono = 'neutro', codigo }: { texto: string; tono?: Tono; codigo?: boolean }) {
  const t = useTema();
  const c = {
    ok: [t.okSoft, t.ok], warn: [t.warnSoft, t.warn], bad: [t.badSoft, t.bad], neutro: [t.paper, t.ink2],
    accion: [t.accionSoft, t.accion], senal: [t.signalSoft, t.oscuro ? t.signal : t.signalInk],
  }[tono];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: c[0], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Texto style={[{ fontFamily: F.negrita, fontSize: 13, lineHeight: 18, color: c[1] }, codigo && { fontFamily: F.etiqueta, letterSpacing: 1, fontVariant: ['tabular-nums'] }]}>{texto}</Texto>
    </View>
  );
}
