/**
 * PAGE HEADER — En-tête de page standardisée
 * ============================================
 * Usage :
 *   <PageHeader
 *     title="Tableau de bord Admin"
 *     subtitle="Gestion du stock et des missions"
 *     actions={<Button>Actualiser</Button>}
 *   />
 */
import React, { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  actions?:  ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        mb:             3,
        gap:            2,
        flexWrap:       'wrap',
      }}
    >
      <Box>
        <Typography variant="h4" fontWeight="bold" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
