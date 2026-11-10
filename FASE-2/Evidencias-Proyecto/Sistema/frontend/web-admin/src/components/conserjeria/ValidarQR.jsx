import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { QrCodeScannerOutlined as QrIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as porteria from '../../api/porteria';
import { RESULTADOS } from '../../utils/porteria';
import { horaMinuto, nombreUnidad } from '../../utils/formato';
import { conTipo } from '../../utils/unidades';
import PlacaUnidad from '../marca/PlacaUnidad';

const motivo = (resultado, inv) => {
  switch (resultado) {
    case 'temprano': return `Puede entrar desde las ${horaMinuto(new Date(new Date(inv.validaDesde).getTime() - 15 * 60000))}. Si el residente lo autoriza, regístralo como ingreso sin invitación.`;
    case 'vencido': return `La invitación terminó a las ${horaMinuto(inv.validaHasta)}. Pide al residente que la renueve desde la app.`;
    case 'usado': return 'La visita ya entró y salió con este código. Cada código sirve para una visita.';
    case 'adentro': return 'Su ingreso ya está registrado. Si va saliendo, registra la salida en «Adentro».';
    case 'cancelada': return 'El residente canceló esta invitación.';
    case 'sin_invitante': return 'Quien invitó ya no vive en la vivienda o no tiene acceso a la comunidad. Si la visita va a otra persona de la casa, regístrala como ingreso sin invitación.';
    case 'no_existe': return 'Revisa que el código esté completo (EC y 8 letras o números). Si la persona no tiene invitación, regístrala como ingreso sin invitación.';
    default: return null;
  }
};

// Validación de invitaciones (POST porteria/validacion): el lector de QR escribe el código y presiona Enter,
// igual que un teclado. Si es válido, «Registrar ingreso» hace POST porteria/ingresos.
export default function ValidarQR({ onIngreso }) {
  const { comunidad } = useSesion();
  const { avisar } = useAviso();
  const [codigo, setCodigo] = useState('');
  const [revision, setRevision] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(null);

  const validar = async (e) => {
    e?.preventDefault();
    if (!codigo.trim()) return;
    setEnviando('validar');
    setError(null);
    try {
      setRevision(await porteria.validar(codigo.trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(null);
    }
  };
  const registrar = async () => {
    setEnviando('ingreso');
    setError(null);
    try {
      const acceso = await porteria.ingresoConCodigo(codigo.trim());
      avisar(`Ingreso de ${acceso.visitante} registrado.`);
      setRevision(null);
      setCodigo('');
      onIngreso();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(null);
    }
  };

  const r = revision && RESULTADOS[revision.resultado];
  const inv = revision?.invitacion;
  const unidad = inv && conTipo(inv.unidad, comunidad);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', borderColor: 'marca.signal', borderWidth: 2 }}>
      <Box sx={{ bgcolor: 'marca.signal', color: 'marca.signalInk', px: 2.5, py: 1.25, display: 'flex', gap: 1, alignItems: 'center' }}>
        <QrIcon />
        <Typography sx={{ fontWeight: 800, fontFamily: 'Archivo, sans-serif' }}>Validar invitación</Typography>
      </Box>
      <Box sx={{ p: 2.5, display: 'grid', gap: 2 }}>
        <Box component="form" onSubmit={validar} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth autoFocus label="Escanea el QR o escribe el código" value={codigo}
            onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setRevision(null); setError(null); }}
            slotProps={{ htmlInput: { autoComplete: 'off', spellCheck: false, maxLength: 20, style: { fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '0.12em' } } }}
          />
          <Button type="submit" variant="contained" size="large" disabled={!codigo.trim()} loading={enviando === 'validar'} sx={{ px: 3 }}>Validar</Button>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}

        {r && (
          <Box role="status" sx={{ borderRadius: 1.5, border: 2, borderColor: `${r.color}.main`, p: 2, display: 'grid', gap: 1.5 }}>
            <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.5rem', color: `${r.color}.main` }}>{r.titulo}</Typography>
            {inv && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {unidad && <PlacaUnidad unidad={unidad} size="md" />}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.2rem' }}>{inv.nombreVisita}</Typography>
                  <Typography color="text.secondary">{inv.categoria} · {inv.rut ?? 'Sin RUT'}{inv.patente ? ` · patente ${inv.patente}` : ''}</Typography>
                  <Typography color="text.secondary">
                    Invita {inv.invitadaPor?.nombre ?? 'el residente'}{unidad ? `, ${nombreUnidad(unidad)}` : ''} · de {horaMinuto(inv.validaDesde)} a {horaMinuto(inv.validaHasta)}
                  </Typography>
                </Box>
              </Box>
            )}
            {motivo(revision.resultado, inv) && <Typography>{motivo(revision.resultado, inv)}</Typography>}
            {revision.resultado === 'valido' && (
              <Button variant="contained" color="success" size="large" loading={enviando === 'ingreso'} onClick={registrar} sx={{ py: 1.5, fontSize: '1.1rem' }}>Registrar ingreso</Button>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
