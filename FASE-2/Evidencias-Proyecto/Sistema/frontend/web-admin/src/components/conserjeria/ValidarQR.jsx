import { useState } from 'react';
import { Box, Button, Chip, Paper, TextField, Typography } from '@mui/material';
import { QrCodeScannerOutlined as QrIcon } from '@mui/icons-material';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { revisarCodigo } from '../../utils/porteria';
import { residentes } from '../../data/finanzasMock';
import { horaMinuto, nombreUnidad } from '../../utils/formato';
import PlacaUnidad from '../marca/PlacaUnidad';

const MODO_PRUEBA = import.meta.env.VITE_MODO_PRUEBA !== 'false';

const RESULTADOS = {
  valido: { titulo: 'Puede ingresar', color: 'success' },
  temprano: { titulo: 'Todavía no es su hora', color: 'warning' },
  vencido: { titulo: 'Invitación vencida', color: 'error' },
  usado: { titulo: 'Este código ya se usó', color: 'error' },
  adentro: { titulo: 'Ya está adentro', color: 'warning' },
  cancelada: { titulo: 'Invitación cancelada', color: 'error' },
  no_existe: { titulo: 'Código no encontrado', color: 'error' },
};

const motivo = (r) => {
  const { inv } = r;
  switch (r.resultado) {
    case 'temprano': return `Puede entrar desde las ${horaMinuto(inv.desde)}. Si el residente lo autoriza, regístralo como ingreso manual.`;
    case 'vencido': return `La invitación terminó a las ${horaMinuto(inv.hasta)}. Pide al residente que la renueve desde la app.`;
    case 'usado': return 'La visita ya entró y salió con este código. Cada código sirve para una visita.';
    case 'adentro': return 'Su ingreso ya está registrado. Si va saliendo, registra la salida en la lista de visitas.';
    case 'cancelada': return 'El residente canceló esta invitación.';
    case 'no_existe': return 'Revisa que el código esté completo. Si la persona no tiene invitación, llama a la unidad.';
    default: return null;
  }
};

// Validación de invitaciones: el lector de QR escribe el código y presiona Enter, igual que un teclado.
export default function ValidarQR() {
  const { invitaciones, unidadPorId, acciones } = useConserjeria();
  const [codigo, setCodigo] = useState('');
  const [revision, setRevision] = useState(null);

  const validar = (e) => {
    e?.preventDefault();
    if (!codigo.trim()) return;
    setRevision(revisarCodigo(invitaciones, codigo));
  };
  const registrar = () => {
    acciones.ingresoInvitacion(revision.inv, 'QR');
    setRevision(null);
    setCodigo('');
  };

  const r = revision && RESULTADOS[revision.resultado];
  const inv = revision?.inv;
  const unidad = inv && unidadPorId[inv.idUnidad];
  const ejemplos = invitaciones.filter((i) => i.estado !== 'adentro').slice(0, 4);

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
            onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setRevision(null); }}
            slotProps={{ htmlInput: { autoComplete: 'off', spellCheck: false, style: { fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '0.12em' } } }}
          />
          <Button type="submit" variant="contained" size="large" disabled={!codigo.trim()} sx={{ px: 3 }}>Validar</Button>
        </Box>

        {MODO_PRUEBA && !revision && ejemplos.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">Códigos de prueba:</Typography>
            {ejemplos.map((i) => (
              <Chip key={i.id} size="small" variant="outlined" label={i.codigo} onClick={() => { setCodigo(i.codigo); setRevision(revisarCodigo(invitaciones, i.codigo)); }} />
            ))}
          </Box>
        )}

        {r && (
          <Box role="status" sx={{ borderRadius: 1.5, border: 2, borderColor: `${r.color}.main`, p: 2, display: 'grid', gap: 1.5 }}>
            <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.5rem', color: `${r.color}.main` }}>{r.titulo}</Typography>
            {inv && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <PlacaUnidad tipo={unidad.tipo} numero={unidad.numero} size="md" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.2rem' }}>{inv.visitante}</Typography>
                  <Typography color="text.secondary">{inv.rut}{inv.patente ? ` · patente ${inv.patente}` : ''}</Typography>
                  <Typography color="text.secondary">Invita {residentes[inv.idUnidad] ?? 'el residente'}, {nombreUnidad(unidad)} · de {horaMinuto(inv.desde)} a {horaMinuto(inv.hasta)}</Typography>
                </Box>
              </Box>
            )}
            {motivo(revision) && <Typography>{motivo(revision)}</Typography>}
            {revision.resultado === 'valido' && (
              <Button variant="contained" color="success" size="large" onClick={registrar} sx={{ py: 1.5, fontSize: '1.1rem' }}>Registrar ingreso</Button>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
