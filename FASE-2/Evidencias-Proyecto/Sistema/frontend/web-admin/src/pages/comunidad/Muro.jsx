import { useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Tab, Tabs, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { EditNoteOutlined as RedactarIcon, FlagOutlined as ReporteIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { useAdmin } from '../../context/AdminContext';
import { residentes } from '../../data/finanzasMock';
import { cargosEfectivos } from '../../config/navegacion';
import { fecha, fechaHora } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

function DialogoRedactar({ onClose }) {
  const { cargo } = useSesion();
  const { acciones } = useFinanzas();
  const [form, setForm] = useState({ tipo: 'Comunicado', titulo: '', texto: '' });
  const directo = cargo === 'presidente';
  const valido = form.titulo.trim() && form.texto.trim().length >= 20;
  const enviar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.enviarPublicacion({ tipo: form.tipo, titulo: form.titulo.trim(), texto: form.texto.trim() });
    onClose();
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={enviar}>
      <DialogTitle>Redactar publicación oficial</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <ToggleButtonGroup exclusive fullWidth value={form.tipo} onChange={(_, v) => v && setForm({ ...form, tipo: v })}>
          <ToggleButton value="Comunicado">Comunicado</ToggleButton>
          <ToggleButton value="Norma">Norma</ToggleButton>
        </ToggleButtonGroup>
        <TextField required label="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        <TextField
          required label="Texto" value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} multiline minRows={5}
          helperText={form.texto.trim().length < 20 ? 'Escribe al menos 20 caracteres.' : `${form.texto.trim().length} caracteres`}
        />
        <Alert severity="info" variant="outlined">
          {directo
            ? 'Como Presidente, se publica de inmediato y se avisa a todos los residentes.'
            : 'Se envía al Presidente. Cuando lo apruebe, se publica y se avisa a todos los residentes.'}
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>{directo ? 'Publicar' : 'Enviar a aprobación'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function Publicacion({ pub, unidad, moderar, onModerar }) {
  const oculta = pub.estado === 'oculta';
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'grid', gap: 1.5, opacity: oculta ? 0.75 : 1, borderColor: pub.reportes.length && !oculta ? 'warning.main' : 'divider' }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        {unidad && <PlacaUnidad tipo={unidad.tipo} numero={unidad.numero} size="sm" />}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{residentes[pub.idUnidad] ?? 'Vecino'}</Typography>
          <Typography variant="body2" color="text.secondary">{pub.lugar === 'marketplace' ? 'Marketplace' : 'Muro'} · {fechaHora(pub.fecha)}</Typography>
        </Box>
        {oculta && <Chip size="small" variant="outlined" label="Oculta" />}
      </Box>
      <Typography sx={{ textDecoration: oculta ? 'line-through' : 'none', textDecorationColor: 'currentColor' }}>{pub.texto}</Typography>
      {pub.reportes.length > 0 && (
        <Box sx={{ display: 'grid', gap: 0.5, p: 1.25, borderRadius: 2, bgcolor: 'warning.light' }}>
          {pub.reportes.map((r, i) => (
            <Typography key={i} variant="body2" sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
              <ReporteIcon sx={{ fontSize: 16 }} /> <b>{r.motivo}</b> · reportado por {r.por}
            </Typography>
          ))}
        </Box>
      )}
      {oculta && pub.moderadaPor && <Typography variant="body2" color="text.secondary">Oculta por {pub.moderadaPor}.</Typography>}
      {moderar && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {oculta ? (
            <Button variant="outlined" onClick={() => onModerar(pub, 'restaurar')}>Restaurar</Button>
          ) : (
            <>
              <Button variant={pub.reportes.length ? 'contained' : 'outlined'} color="error" onClick={() => onModerar(pub, 'ocultar')}>Ocultar</Button>
              {pub.reportes.length > 0 && <Button color="inherit" onClick={() => onModerar(pub, 'descartar')}>Descartar reportes</Button>}
            </>
          )}
        </Box>
      )}
    </Paper>
  );
}

const ESTADO_OFICIAL = { pendiente: 'Esperando aprobación', rechazada: 'Devuelto' };

// Muro de la comunidad. Administración modera; la directiva redacta comunicados y normas.
// Con lugar="marketplace" muestra solo las publicaciones del marketplace.
export default function Muro({ lugar }) {
  const { comunidad, cargo } = useSesion();
  const { datos } = useFinanzas();
  const { publicaciones, unidadPorId, acciones } = useAdmin();
  const modera = cargosEfectivos(cargo, comunidad).includes('administrador');
  const soloMarket = lugar === 'marketplace';
  const propias = publicaciones.filter((p) => !soloMarket || p.lugar === 'marketplace');
  const reportadas = propias.filter((p) => p.estado === 'visible' && p.reportes.length);
  const [pestana, setPestana] = useState(() => (modera && reportadas.length ? 'reportadas' : soloMarket ? 'vecinos' : 'oficiales'));
  const [redactar, setRedactar] = useState(false);
  const oficiales = datos.porAprobar;

  const lista = pestana === 'reportadas' ? reportadas : propias;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo={soloMarket ? 'Marketplace' : 'Muro y comunicados'}
        descripcion={soloMarket
          ? 'Publicaciones de compra, venta y servicios entre vecinos.'
          : modera ? 'Revisa lo que reportan los vecinos. Al ocultar una publicación, su autor recibe un aviso.' : 'Los comunicados y normas oficiales que se publican en la app.'}
        acciones={!soloMarket && cargo !== 'conserje' && (
          <Button variant="contained" startIcon={<RedactarIcon />} onClick={() => setRedactar(true)}>Redactar comunicado</Button>
        )}
      />

      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile>
        {modera && <Tab value="reportadas" label={`Reportadas (${reportadas.length})`} />}
        {!soloMarket && <Tab value="oficiales" label="Oficiales" />}
        <Tab value="vecinos" label={soloMarket ? 'Publicaciones' : 'De vecinos'} />
      </Tabs>

      {pestana === 'oficiales' ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {oficiales.length === 0 && <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}><Typography color="text.secondary">Todavía no hay publicaciones oficiales.</Typography></Paper>}
          {oficiales.map((x) => (
            <Paper key={x.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3, display: 'grid', gap: 1, borderLeft: 4, borderLeftColor: x.estado === 'aprobada' ? 'info.main' : 'divider' }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip size="small" label={x.tipo} sx={{ bgcolor: 'info.light', color: 'info.main' }} />
                <Typography variant="body2" color="text.secondary">{x.autor} · {fecha(x.fecha)}</Typography>
                {x.estado !== 'aprobada' && <Chip size="small" variant="outlined" color={x.estado === 'pendiente' ? 'warning' : 'error'} label={ESTADO_OFICIAL[x.estado]} />}
              </Box>
              <Typography variant="h6" component="h2">{x.titulo}</Typography>
              <Typography color="text.secondary" sx={{ maxWidth: '68ch' }}>{x.texto}</Typography>
            </Paper>
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {lista.length === 0 && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography color="text.secondary">{pestana === 'reportadas' ? 'No hay publicaciones reportadas. Todo en orden.' : 'Todavía no hay publicaciones.'}</Typography>
            </Paper>
          )}
          {lista.map((p) => <Publicacion key={p.id} pub={p} unidad={unidadPorId[p.idUnidad]} moderar={modera} onModerar={acciones.moderar} />)}
        </Box>
      )}

      {redactar && <DialogoRedactar onClose={() => setRedactar(false)} />}
    </Box>
  );
}
