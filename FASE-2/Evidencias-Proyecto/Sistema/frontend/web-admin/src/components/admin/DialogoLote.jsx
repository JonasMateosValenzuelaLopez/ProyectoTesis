import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import { crearLoteUnidades } from '../../api/admin';
import PlacaUnidad from '../marca/PlacaUnidad';
import { claveUnidad, errorLote, generarLote, grupoDe, lotePara, pisoDe } from '../../utils/unidades';

// Valores sugeridos: el piso o el número que sigue al último, en la última torre, hilera o manzana
const inicial = (tipo, unidades) => {
  const nums = unidades.map((u) => Number(u.numeroIdentificador)).filter(Number.isFinite);
  const siguiente = nums.length ? Math.max(...nums) + 1 : 1;
  if (tipo === 'Edificio') {
    const pisos = unidades.map(pisoDe);
    const piso = pisos.length ? Math.min(Math.max(...pisos) + 1, 99) : 1;
    return { torre: unidades.at(-1)?.torre ?? 'A', pisoDesde: piso, pisoHasta: piso, porPiso: 4 };
  }
  // En la villa se escribe solo la letra de la manzana; en el condominio, la hilera o pasaje
  const ultimo = unidades.at(-1);
  const grupo = tipo === 'Villa' ? ultimo?.manzana ?? 'A' : grupoDe(ultimo ?? {}) || 'Lado norte';
  return { grupo, desde: siguiente, hasta: siguiente + 3 };
};

// POST unidades/lote. La API omite los números que ya existen y devuelve { creadas, omitidas }.
export default function DialogoLote({ unidades, onClose, onCreadas }) {
  const { comunidad } = useSesion();
  const { avisar } = useAviso();
  const [f, setF] = useState(() => inicial(comunidad.tipo, unidades));
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const cambiar = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setError(null); };

  const problema = errorLote(comunidad.tipo, f);
  const generadas = generarLote(comunidad.tipo, f);
  const existentes = new Set(unidades.map(claveUnidad));
  const nuevas = generadas.filter((u) => !existentes.has(claveUnidad(u)));
  const repetidas = generadas.length - nuevas.length;

  const crear = async (e) => {
    e.preventDefault();
    if (!nuevas.length) return;
    setEnviando(true);
    try {
      const r = await crearLoteUnidades(lotePara(comunidad.tipo, f));
      avisar(`${r.creadas.length === 1 ? 'Se creó 1 unidad' : `Se crearon ${r.creadas.length} unidades`}${r.omitidas.length ? ` (${r.omitidas.length} ya existían)` : ''}.`);
      onCreadas();
      onClose();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  const edificio = comunidad.tipo === 'Edificio';
  const etiquetaGrupo = comunidad.tipo === 'Villa' ? 'Letra de la manzana' : 'Hilera o pasaje';

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={crear}>
      <DialogTitle>Crear unidades en lote</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <Typography color="text.secondary">
          {edificio
            ? 'Se crea un departamento por cada número en cada piso: piso 7 con 4 deptos genera 701, 702, 703 y 704.'
            : `Se crea una casa por cada número del rango, ${comunidad.tipo === 'Villa' ? 'en la manzana' : 'en la hilera o pasaje'} que indiques.`}
        </Typography>
        {edificio ? (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' } }}>
            <TextField label="Torre" name="torre" value={f.torre} onChange={cambiar} slotProps={{ htmlInput: { maxLength: 3 } }} />
            <TextField label="Desde el piso" name="pisoDesde" type="number" value={f.pisoDesde} onChange={cambiar} slotProps={{ htmlInput: { min: 1, max: 99 } }} />
            <TextField label="Hasta el piso" name="pisoHasta" type="number" value={f.pisoHasta} onChange={cambiar} slotProps={{ htmlInput: { min: 1, max: 99 } }} />
            <TextField label="Deptos por piso" name="porPiso" type="number" value={f.porPiso} onChange={cambiar} slotProps={{ htmlInput: { min: 1, max: 30 } }} />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr 1fr' } }}>
            <TextField label={etiquetaGrupo} name="grupo" value={f.grupo} onChange={cambiar} slotProps={{ htmlInput: { maxLength: comunidad.tipo === 'Villa' ? 3 : 100 } }} />
            <TextField label="Desde el número" name="desde" type="number" value={f.desde} onChange={cambiar} slotProps={{ htmlInput: { min: 1, max: 99999 } }} />
            <TextField label="Hasta el número" name="hasta" type="number" value={f.hasta} onChange={cambiar} slotProps={{ htmlInput: { min: 1, max: 99999 } }} />
          </Box>
        )}

        {problema ? <Alert severity="warning" variant="outlined">{problema}</Alert> : (
          <Box sx={{ display: 'grid', gap: 1.25, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>
              {nuevas.length === 0 ? 'Ninguna unidad nueva con estos datos' : nuevas.length === 1 ? 'Se creará 1 unidad' : `Se crearán ${nuevas.length} unidades`}
            </Typography>
            {nuevas.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {nuevas.slice(0, 8).map((u) => <PlacaUnidad key={u.idUnidad} unidad={u} size="sm" />)}
                {nuevas.length > 8 && <Typography color="text.secondary">y {nuevas.length - 8} más</Typography>}
              </Box>
            )}
          </Box>
        )}
        {repetidas > 0 && <Alert severity="warning" variant="outlined">{repetidas} {repetidas === 1 ? 'número ya existe y se omitirá' : 'números ya existen y se omitirán'}.</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" loading={enviando} disabled={!nuevas.length}>Crear {nuevas.length || ''} unidades</Button>
      </DialogActions>
    </Dialog>
  );
}
