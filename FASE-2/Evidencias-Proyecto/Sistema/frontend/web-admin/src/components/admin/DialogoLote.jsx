import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAdmin } from '../../context/AdminContext';
import PlacaUnidad from '../marca/PlacaUnidad';
import { generar, grupoDe, pisoDe } from '../../utils/unidades';

const inicial = (comunidad) => {
  const nums = comunidad.unidades.map((u) => Number(u.numero_identificador)).filter(Number.isFinite);
  const siguiente = nums.length ? Math.max(...nums) + 1 : 1;
  if (comunidad.tipo === 'Edificio') {
    const pisos = comunidad.unidades.map(pisoDe);
    const piso = pisos.length ? Math.max(...pisos) + 1 : 1;
    const torre = grupoDe(comunidad.unidades[0] ?? {}).replace(/^Torre /, '') || 'A';
    return { torre, pisoDesde: piso, pisoHasta: piso, porPiso: 4 };
  }
  // En la villa se escribe solo la letra de la manzana; en el condominio, la hilera o pasaje
  const ultimo = grupoDe(comunidad.unidades.at(-1) ?? {});
  const grupo = comunidad.tipo === 'Villa' ? ultimo.replace(/^Manzana /, '') || 'A' : ultimo || 'Lado norte';
  return { grupo, desde: siguiente, hasta: siguiente + 3 };
};

export default function DialogoLote({ onClose }) {
  const { comunidad } = useSesion();
  const { acciones } = useAdmin();
  const [f, setF] = useState(() => inicial(comunidad));
  const cambiar = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const generadas = generar(comunidad, f);
  // En un edificio el número se puede repetir entre torres; en casas es único en la comunidad
  const clave = (u) => (comunidad.tipo === 'Edificio' ? `${grupoDe(u)}-${u.numero_identificador}` : u.numero_identificador);
  const existentes = new Set(comunidad.unidades.map(clave));
  const nuevas = generadas.filter((u) => !existentes.has(clave(u)));
  const repetidas = generadas.length - nuevas.length;

  const crear = (e) => {
    e.preventDefault();
    if (!nuevas.length) return;
    acciones.crearUnidades(nuevas);
    onClose();
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
            <TextField label="Desde el piso" name="pisoDesde" type="number" value={f.pisoDesde} onChange={cambiar} slotProps={{ htmlInput: { min: 1 } }} />
            <TextField label="Hasta el piso" name="pisoHasta" type="number" value={f.pisoHasta} onChange={cambiar} slotProps={{ htmlInput: { min: 1 } }} />
            <TextField label="Deptos por piso" name="porPiso" type="number" value={f.porPiso} onChange={cambiar} slotProps={{ htmlInput: { min: 1, max: 30 } }} />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr 1fr' } }}>
            <TextField label={etiquetaGrupo} name="grupo" value={f.grupo} onChange={cambiar} />
            <TextField label="Desde el número" name="desde" type="number" value={f.desde} onChange={cambiar} slotProps={{ htmlInput: { min: 1 } }} />
            <TextField label="Hasta el número" name="hasta" type="number" value={f.hasta} onChange={cambiar} slotProps={{ htmlInput: { min: 1 } }} />
          </Box>
        )}

        <Box sx={{ display: 'grid', gap: 1.25, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>
            {nuevas.length === 0 ? 'Ninguna unidad nueva con estos datos' : nuevas.length === 1 ? 'Se creará 1 unidad' : `Se crearán ${nuevas.length} unidades`}
          </Typography>
          {nuevas.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {nuevas.slice(0, 8).map((u) => <PlacaUnidad key={u.id_unidad} unidad={u} size="sm" />)}
              {nuevas.length > 8 && <Typography color="text.secondary">y {nuevas.length - 8} más</Typography>}
            </Box>
          )}
        </Box>
        {repetidas > 0 && <Alert severity="warning" variant="outlined">{repetidas} {repetidas === 1 ? 'número ya existe y se omitirá' : 'números ya existen y se omitirán'}.</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!nuevas.length}>Crear {nuevas.length || ''} unidades</Button>
      </DialogActions>
    </Dialog>
  );
}
