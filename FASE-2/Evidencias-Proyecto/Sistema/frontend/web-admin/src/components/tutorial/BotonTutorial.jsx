import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { HelpOutlineOutlined as AyudaIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import TutorialPanel from './TutorialPanel';

// Botón «?» de la barra. El tutorial se abre solo si la membresía actual no lo ha visto
// (`membresias.fecha_tutorial_visto`); al cerrarlo, también al saltarlo, queda visto.
export default function BotonTutorial({ cargo }) {
  const { usuario, comunidad, tutorialPendiente, marcarTutorialVisto } = useSesion();
  const [manual, setManual] = useState(false);
  return (
    <>
      <Tooltip title="Cómo usar el panel">
        <IconButton aria-label="Cómo usar el panel" onClick={() => setManual(true)} sx={{ color: 'text.secondary' }}>
          <AyudaIcon />
        </IconButton>
      </Tooltip>
      <TutorialPanel
        key={`${cargo}-${comunidad?.id_red ?? 'plataforma'}`}
        open={manual || tutorialPendiente} primeraVez={tutorialPendiente}
        onClose={() => { setManual(false); if (tutorialPendiente) marcarTutorialVisto(); }}
        usuario={usuario} cargo={cargo} comunidad={comunidad}
      />
    </>
  );
}
