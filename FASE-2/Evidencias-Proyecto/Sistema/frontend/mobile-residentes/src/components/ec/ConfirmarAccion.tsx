import { useState } from 'react';
import { View } from 'react-native';
import { useTema } from '@/constants/tema';
import { MOTIVOS_REPORTE } from '@/api/muro';
import Texto from './Texto';
import Boton from './Boton';
import Opciones from './Opciones';

type Motivo = (typeof MOTIVOS_REPORTE)[number];

// Confirmación para reportar (con motivo) o eliminar algo propio. `onConfirmar(motivo)` hace la llamada a la API.
export default function Confirmar({ tipo, onConfirmar, onCancelar }: {
  tipo: 'reportar' | 'eliminar'; onConfirmar: (motivo?: string) => Promise<void>; onCancelar: () => void;
}) {
  const t = useTema();
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    setEnviando(true);
    try {
      await onConfirmar(motivo ?? undefined);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <View style={{ backgroundColor: t.paper, borderRadius: 12, padding: 12, gap: 10 }}>
      <Texto>{tipo === 'reportar' ? '¿Reportar a la administración? Quien publicó no sabrá que fuiste tú.' : '¿Eliminar tu publicación? No se puede deshacer.'}</Texto>
      {tipo === 'reportar' && <Opciones etiqueta="Motivo" valor={motivo} onCambio={setMotivo} opciones={MOTIVOS_REPORTE.map((m) => ({ valor: m, texto: m }))} />}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Boton tipo="peligro" texto={tipo === 'reportar' ? 'Reportar' : 'Eliminar'} style={{ flex: 1 }} cargando={enviando} disabled={tipo === 'reportar' && !motivo} onPress={confirmar} />
        <Boton tipo="secundario" texto="No" style={{ flex: 1 }} onPress={onCancelar} />
      </View>
    </View>
  );
}
