import { Box } from '@mui/material';

/** Currency icon for Ngultrum (Nu.), sized like an MUI icon. */
function NuIcon({ fontSize = 'medium', sx = {}, ...props }) {
  const isSmall = fontSize === 'small';
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: isSmall ? 20 : 24,
        height: isSmall ? 20 : 24,
        fontSize: isSmall ? '0.7rem' : '0.8rem',
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-0.03em',
        flexShrink: 0,
        ...sx,
      }}
      {...props}
    >
      Nu.
    </Box>
  );
}

export default NuIcon;
