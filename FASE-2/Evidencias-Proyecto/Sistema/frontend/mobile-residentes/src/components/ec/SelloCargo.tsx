import { View } from 'react-native';
import { F, useTema } from '@/constants/tema';
import { roles } from '@/constants/tokens';
import Texto from './Texto';

type Rol = keyof typeof roles;

// Sello del cargo: directiva en pátina (lo oficial), personal en tinta y residentes con contorno.
export default function SelloCargo({ cargo, size = 22, conTexto = false }: { cargo: Rol; size?: number; conTexto?: boolean }) {
  const t = useTema();
  const r = roles[cargo];
  const familia = r.family;
  const fondo = familia === 'directiva' ? t.patina : familia === 'staff' ? t.ink : 'transparent';
  const tinta = familia === 'residente' ? t.ink : familia === 'directiva' ? t.accionInk : t.paper;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: fondo, borderWidth: familia === 'residente' ? 1.5 : 0, borderColor: t.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Texto style={{ fontFamily: F.cifra, fontSize: size * 0.5, lineHeight: size * 0.62, color: tinta }}>{r.initial}</Texto>
      </View>
      {conTexto && <Texto v="fuerte">{r.label}</Texto>}
    </View>
  );
}
