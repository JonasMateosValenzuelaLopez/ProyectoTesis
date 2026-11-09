import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as finanzas from '@/api/finanzas';
import { mensajeDe } from '@/api/cliente';
import { nombrePeriodo, useMiCuenta } from '@/api/useMiCuenta';
import { clp, fecha } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Campo from '@/components/ec/Campo';

// Pedir que no se cobre un cobro pendiente (POST finanzas/mi-cuenta/exenciones). Pasa por dos etapas:
// Tesorería la revisa y la Presidencia decide. Mientras tanto, el cobro sigue vigente.
export default function Exencion() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { acciones } = useSesion();
  const { cuenta, error, recargar } = useMiCuenta();
  const [motivo, setMotivo] = useState('');
  const [intento, setIntento] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const cobro = cuenta?.cobros.find((c) => c.idCobroUnidad === Number(id));

  const enviar = async () => {
    setIntento(true);
    if (!cobro || !motivo.trim()) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await finanzas.solicitarExencion(cobro.idCobroUnidad, motivo.trim());
      acciones.avisar('Solicitud enviada. Tesorería la revisará y la Presidencia decide.');
      router.back();
    } catch (e) {
      setErrorEnvio(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  if (!cuenta) {
    return (
      <Hoja titulo="Pedir exención">
        {error ? (
          <>
            <Texto color={t.bad}>{error.message}</Texto>
            <Boton tipo="texto" texto="Reintentar" onPress={recargar} />
          </>
        ) : <ActivityIndicator color={t.accion} accessibilityLabel="Cargando el cobro" />}
      </Hoja>
    );
  }
  if (!cobro || cobro.estado !== 'Pendiente') {
    return (
      <Hoja titulo="Pedir exención" abajo={<Boton texto="Volver" onPress={() => router.back()} />}>
        <Texto v="suave">Este cobro ya no está pendiente, así que no se puede pedir una exención.</Texto>
      </Hoja>
    );
  }

  return (
    <Hoja titulo="Pedir exención" abajo={<Boton texto="Enviar solicitud" cargando={enviando} onPress={enviar} />}>
      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Texto v="fuerte" style={{ flex: 1 }}>{cobro.concepto}</Texto>
          <Texto v="fuerte">{clp(cobro.monto)}</Texto>
        </View>
        <Texto v="suave" style={{ textTransform: 'capitalize' }}>{nombrePeriodo(cobro.periodo)}</Texto>
        <Texto v="chico">Vence el {fecha(cobro.fechaVencimiento)}</Texto>
      </Tarjeta>
      <Texto v="suave">Cuéntale a la directiva por qué no debería cobrarse. Primero lo revisa Tesorería y después decide la Presidencia. Mientras tanto, el cobro sigue vigente.</Texto>
      <Campo
        etiqueta="Motivo" value={motivo} onChangeText={(v) => { setMotivo(v); setErrorEnvio(null); }} maxLength={finanzas.MAX_TEXTO}
        multiline style={{ minHeight: 110, paddingTop: 12, textAlignVertical: 'top' }}
        error={intento && !motivo.trim() && 'Escribe el motivo'} ayuda={`${motivo.length}/${finanzas.MAX_TEXTO}`}
      />
      {errorEnvio && <Texto color={t.bad}>{errorEnvio}</Texto>}
    </Hoja>
  );
}
