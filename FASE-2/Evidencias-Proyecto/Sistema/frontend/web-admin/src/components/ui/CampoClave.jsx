import { useState } from 'react';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import { VisibilityOutlined as VerIcon, VisibilityOffOutlined as OcultarIcon } from '@mui/icons-material';

// Campo de contraseña con un ojo para ver lo que se escribió. Acepta las mismas props que TextField;
// las de `slotProps.input` y `slotProps.htmlInput` se conservan.
export default function CampoClave({ slotProps = {}, ...props }) {
  const [visible, setVisible] = useState(false);
  const texto = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      slotProps={{
        ...slotProps,
        htmlInput: { autoCapitalize: 'none', spellCheck: false, ...slotProps.htmlInput },
        input: {
          ...slotProps.input,
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={texto}>
                <IconButton
                  edge="end" aria-label={texto} aria-pressed={visible}
                  onClick={() => setVisible((v) => !v)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {visible ? <OcultarIcon /> : <VerIcon />}
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
