import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as finanzas from '@/api/finanzas';
import { mensajeDe } from '@/api/cliente';
import { diaLocal, useMiCuenta } from '@/api/useMiCuenta';
import { clp, cuando, nombreUnidad } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Campo from '@/components/ec/Campo';
import Opciones from '@/components/ec/Opciones';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const t = useTema();
  const { acciones } = useSesion();
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

// Datos para transferir a la comunidad y aviso de que ya se transfirió (POST finanzas/avisos).
// La plataforma no cobra: la administración ve el aviso en el panel, revisa la cartola y marca el pago.
export default function Transferencia() {
  const t = useTema();
  const { unidad, acciones } = useSesion();
  const { cuenta, datosTransferencia: tr, error, recargar } = useMiCuenta();
  const [avisando, setAvisando] = useState(false);
  const [f, setF] = useState({ fechaPago: diaLocal(0), monto: '', observacion: '' });
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!unidad) return null;
  if (!cuenta || !tr) {
    return (
      <Hoja titulo="Cómo pagar">
        {error ? (
          <>
            <Texto color={t.bad}>{error.message}</Texto>
            <Boton tipo="texto" texto="Reintentar" onPress={recargar} />
          </>
        ) : <ActivityIndicator color={t.accion} accessibilityLabel="Cargando los datos de pago" />}
      </Hoja>
    );
  }

  // Lo que falta avisar: los cobros pendientes que no tienen un aviso en revisión
  const sinAviso = cuenta.cobros.filter((c) => c.estado === 'Pendiente' && !c.avisos.some((a) => a.estado === 'Pendiente'));
  const porAvisar = sinAviso.reduce((s, c) => s + c.monto, 0);
  const avisado = cuenta.cobros.flatMap((c) => c.avisos.filter((a) => a.estado === 'Pendiente')).reduce((s, a) => s + a.monto, 0);
  const glosa = nombreUnidad(unidad);
  const completos = !!(tr.titularCuenta && tr.identificadorTitular && tr.banco && tr.numeroCuenta);
  const monto = Number(f.monto) || 0;
  const errorMonto = f.monto && (monto < 1 || monto > finanzas.MAX_MONTO) ? `El monto debe ser entre $1 y ${clp(finanzas.MAX_MONTO)}` : null;

  const copiarTodo = async () => {
    await Clipboard.setStringAsync([
      tr.titularCuenta, `RUT ${tr.identificadorTitular}`, `${tr.banco} · ${tr.tipoCuenta ?? 'Cuenta'} ${tr.numeroCuenta}`,
      tr.correoTransferencias, `Monto ${clp(porAvisar || cuenta.total)}`, `Glosa: ${glosa}`,
    ].filter(Boolean).join('\n'));
    acciones.avisar('Datos copiados. Pégalos en la app de tu banco.');
  };
  const abrirAviso = () => { setF({ fechaPago: diaLocal(0), monto: String(porAvisar || ''), observacion: '' }); setErrorEnvio(null); setAvisando(true); };
  const enviar = async () => {
    if (!monto || errorMonto) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await finanzas.avisarTransferencia({
        idUnidad: unidad.idUnidad, monto, fechaPago: f.fechaPago,
        ...(f.observacion.trim() ? { observacion: f.observacion.trim() } : {}),
      });
      acciones.avisar('Aviso enviado. La administración revisará tu transferencia.');
      router.back();
    } catch (e) {
      setErrorEnvio(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  if (avisando) {
    return (
      <Hoja titulo="Avisar mi transferencia" abajo={<Boton texto="Enviar aviso" cargando={enviando} onPress={enviar} disabled={!monto || !!errorMonto} />}>
        <Texto v="suave">La administración revisa la cartola y marca tu pago. Este aviso le ayuda a encontrarlo.</Texto>
        <Opciones etiqueta="¿Cuándo transferiste?" valor={f.fechaPago} onCambio={(v) => setF({ ...f, fechaPago: v })}
          opciones={[0, 1, 2].map((n) => ({ valor: diaLocal(n), texto: n === 0 ? 'Hoy' : n === 1 ? 'Ayer' : cuando(diaLocal(n)).replace('el ', '') }))} />
        <Campo
          etiqueta="Monto transferido" value={f.monto} onChangeText={(v) => setF({ ...f, monto: v.replace(/\D/g, '').replace(/^0+(?=\d)/, '') })}
          keyboardType="number-pad" maxLength={8} error={errorMonto || false} ayuda={monto ? clp(monto) : undefined}
        />
        <Campo
          etiqueta="Nota (opcional)" value={f.observacion} onChangeText={(v) => setF({ ...f, observacion: v })} maxLength={finanzas.MAX_TEXTO}
          placeholder="Ej.: transferí desde la cuenta de mi pareja" multiline style={{ minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }}
        />
        {errorEnvio && <Texto color={t.bad}>{errorEnvio}</Texto>}
      </Hoja>
    );
  }

  return (
    <Hoja
      titulo="Cómo pagar"
      abajo={(
        <>
          {completos && <Boton texto="Copiar todos los datos" icono="copy-outline" onPress={copiarTodo} />}
          {sinAviso.length > 0 && <Boton tipo="secundario" texto={avisado ? 'Avisar otra transferencia' : 'Ya transferí'} onPress={abrirAviso} />}
        </>
      )}
    >
      <View style={{ gap: 2 }}>
        <Texto v="chico">{avisado ? 'Falta por avisar' : 'Monto a transferir'}</Texto>
        <Texto v="cifra">{clp(avisado ? porAvisar : cuenta.total)}</Texto>
        <Texto v="suave">Usa como glosa «{glosa}» para que la administración identifique tu pago.</Texto>
      </View>
      {completos ? (
        <Tarjeta style={{ gap: 0, paddingVertical: 6 }}>
          <Dato etiqueta="Titular" valor={tr.titularCuenta!} />
          <Dato etiqueta="RUT" valor={tr.identificadorTitular!} />
          <Dato etiqueta="Banco" valor={tr.banco!} />
          <Dato etiqueta={tr.tipoCuenta ?? 'Cuenta'} valor={tr.numeroCuenta!} />
          {tr.correoTransferencias && <Dato etiqueta="Correo para el comprobante" valor={tr.correoTransferencias} />}
        </Tarjeta>
      ) : (
        <Tarjeta><Texto v="suave">La administración todavía no carga los datos de la cuenta. Pídeselos o revisa más tarde.</Texto></Tarjeta>
      )}
      {avisado > 0 && (
        <View style={{ backgroundColor: t.accionSoft, borderRadius: 12, padding: 12 }}>
          <Texto>Ya avisaste {clp(avisado)}. Cuando la administración lo marque, el cobro cambia a Pagado.</Texto>
        </View>
      )}
    </Hoja>
  );
}
