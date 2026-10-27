import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { diaISO } from '@/data/demo';
import { clp, cuando, nombreUnidad } from '@/utils/formato';
import { resumenCuenta } from '@/utils/cuenta';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Campo from '@/components/ec/Campo';
import Opciones from '@/components/ec/Opciones';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const t = useTema();
  const { acciones } = useApp();
  return (
    <Pressable
      onPress={async () => { await Clipboard.setStringAsync(valor); acciones.avisar(`${etiqueta} copiado.`); }}
      accessibilityRole="button" accessibilityLabel={`Copiar ${etiqueta}: ${valor}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8, borderTopWidth: 1, borderColor: t.line, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ flex: 1 }}>
        <Texto v="chico">{etiqueta}</Texto>
        <Texto v="fuerte" selectable>{valor}</Texto>
      </View>
      <Ionicons name="copy-outline" size={20} color={t.accion} />
    </Pressable>
  );
}

const hace = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return diaISO(d); };

// Datos para transferir a la comunidad y aviso de que ya se transfirió.
// La plataforma no cobra: la administración ve el aviso y marca el pago a mano.
export default function Transferencia() {
  const t = useTema();
  const { comunidad, unidad, estado, avisoTransferencia, acciones } = useApp();
  const [avisando, setAvisando] = useState(false);
  const r = estado ? resumenCuenta(estado) : null;
  const [f, setF] = useState({ fecha: hace(0), monto: String(r?.total ?? ''), nota: '' });
  if (!comunidad || !unidad || !r) return null;
  const tr = comunidad.transferencia;
  const glosa = `${nombreUnidad(unidad)} ${estado!.actual.nombre}`;

  const copiarTodo = async () => {
    await Clipboard.setStringAsync(`${tr.titular}\nRUT ${tr.rut}\n${tr.banco} · ${tr.tipoCuenta} ${tr.numero}\n${tr.correo}\nMonto ${clp(r.total)}\nGlosa: ${glosa}`);
    acciones.avisar('Datos copiados. Pégalos en la app de tu banco.');
  };
  const enviar = () => {
    const monto = Number(f.monto.replace(/\D/g, ''));
    if (!monto) return;
    acciones.avisarTransferencia({ fecha: f.fecha, monto, nota: f.nota.trim() });
    router.back();
  };

  if (avisando) {
    return (
      <Hoja titulo="Avisar mi transferencia" abajo={<Boton texto="Enviar aviso" onPress={enviar} disabled={!Number(f.monto.replace(/\D/g, ''))} />}>
        <Texto v="suave">La administración revisa la cartola y marca tu pago. Este aviso le ayuda a encontrarlo.</Texto>
        <Opciones etiqueta="¿Cuándo transferiste?" valor={f.fecha} onCambio={(v) => setF({ ...f, fecha: v })}
          opciones={[0, 1, 2].map((n) => ({ valor: hace(n), texto: n === 0 ? 'Hoy' : n === 1 ? 'Ayer' : cuando(hace(n)).replace('el ', '') }))} />
        <Campo etiqueta="Monto transferido" value={f.monto} onChangeText={(v) => setF({ ...f, monto: v.replace(/\D/g, '') })} keyboardType="number-pad" ayuda={Number(f.monto) ? clp(Number(f.monto)) : undefined} />
        <Campo etiqueta="Nota (opcional)" value={f.nota} onChangeText={(v) => setF({ ...f, nota: v })} placeholder="Ej.: transferí desde la cuenta de mi pareja" multiline style={{ minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }} />
      </Hoja>
    );
  }

  return (
    <Hoja
      titulo="Cómo pagar"
      abajo={(
        <>
          <Boton texto="Copiar todos los datos" icono="copy-outline" onPress={copiarTodo} />
          {!r.pagado || estado!.deudaAnterior > 0
            ? <Boton tipo="secundario" texto={avisoTransferencia ? 'Avisar otra transferencia' : 'Ya transferí'} onPress={() => setAvisando(true)} />
            : null}
        </>
      )}
    >
      <View style={{ gap: 2 }}>
        <Texto v="chico">Monto a transferir</Texto>
        <Texto v="cifra">{clp(r.total)}</Texto>
        <Texto v="suave">Usa como glosa «{glosa}» para que la administración identifique tu pago.</Texto>
      </View>
      <Tarjeta style={{ gap: 0, paddingVertical: 6 }}>
        <Dato etiqueta="Titular" valor={tr.titular} />
        <Dato etiqueta="RUT" valor={tr.rut} />
        <Dato etiqueta="Banco" valor={tr.banco} />
        <Dato etiqueta={tr.tipoCuenta} valor={tr.numero} />
        <Dato etiqueta="Correo para el comprobante" valor={tr.correo} />
      </Tarjeta>
      {avisoTransferencia && (
        <View style={{ backgroundColor: t.accionSoft, borderRadius: 12, padding: 12 }}>
          <Texto>Ya avisaste una transferencia de {clp(avisoTransferencia.monto)}. Cuando la administración la marque, el estado cambia a Pagado.</Texto>
        </View>
      )}
    </Hoja>
  );
}
