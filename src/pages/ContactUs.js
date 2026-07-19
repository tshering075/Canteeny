import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { getPlatformSettings } from '../services/platformService';

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function ContactUs() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPlatformSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const name = (settings?.contactName || '').trim();
  const whatsapp = (settings?.contactWhatsapp || '').trim();
  const email = (settings?.contactEmail || '').trim();
  const hasAny = name || whatsapp || email;
  const waDigits = digitsOnly(whatsapp);
  const waLink = waDigits ? `https://wa.me/${waDigits}` : null;
  const mailLink = email ? `mailto:${email}` : null;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Reach out to us for support, billing, or general questions.
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 2, maxWidth: 520 }}>
        {!hasAny ? (
          <Typography color="text.secondary">
            Contact details are not available yet. Please check back later.
          </Typography>
        ) : (
          <Stack spacing={2.5}>
            {name ? (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <PersonOutlineIcon color="action" sx={{ mt: 0.25 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Name
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {name}
                  </Typography>
                </Box>
              </Box>
            ) : null}

            {whatsapp ? (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <WhatsAppIcon sx={{ mt: 0.25, color: '#25D366' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    WhatsApp
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {whatsapp}
                  </Typography>
                  {waLink ? (
                    <Button
                      component="a"
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{ mt: 0.5, px: 0, textTransform: 'none' }}
                    >
                      Chat on WhatsApp
                    </Button>
                  ) : null}
                </Box>
              </Box>
            ) : null}

            {email ? (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <EmailOutlinedIcon color="action" sx={{ mt: 0.25 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Email
                  </Typography>
                  {mailLink ? (
                    <Link href={mailLink} underline="hover" variant="body1" fontWeight={600}>
                      {email}
                    </Link>
                  ) : (
                    <Typography variant="body1" fontWeight={600}>
                      {email}
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : null}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}

export default ContactUs;
