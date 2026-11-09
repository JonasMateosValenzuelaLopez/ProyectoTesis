import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import * as finanzas from './finanzas';
import { useConsulta } from './useConsulta';

// GET finanzas/mi-cuenta para la vivienda elegida. Se vuelve a pedir al volver a la pantalla
// (por ejemplo, después de avisar una transferencia), sin repetir la primera consulta.
export function useMiCuenta() {
  const { comunidad, unidad } = useSesion();
  const consulta = useConsulta(finanzas.miCuenta, [comunidad?.idRed]);
  const primera = useRef(true);
  const { recargar } = consulta;
  useFocusEffect(useCallback(() => {
    if (primera.current) { primera.current = false; return; }
    recargar();
  }, [recargar]));

  const cuenta = consulta.datos?.unidades.find((u) => u.idUnidad === unidad?.idUnidad) ?? null;
  return { ...consulta, cuenta, datosTransferencia: consulta.datos?.datosTransferencia ?? null };
}

// 'AAAA-MM-01' → «noviembre 2026»
const formatoMes = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' });
export const nombrePeriodo = (periodo: string) => formatoMes.format(new Date(`${periodo.slice(0, 7)}-15T12:00:00`));

// Fecha local como 'AAAA-MM-DD', `dias` atrás
export const diaLocal = (dias = 0) => {
  const f = new Date();
  f.setDate(f.getDate() - dias);
  return new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
