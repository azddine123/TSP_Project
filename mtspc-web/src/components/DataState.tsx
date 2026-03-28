/**
 * DATA STATE — États loading / error / empty standardisés
 * =========================================================
 * Remplace les blocs conditionnels répétés dans chaque page.
 *
 * Usage :
 *   <DataState loading={loading} error={error} empty={stocks.length === 0} emptyLabel="Aucun stock">
 *     <MonContenu />
 *   </DataState>
 */
import React, { ReactNode } from 'react';
import {
  Box, CircularProgress, Alert, Typography,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

interface DataStateProps {
  loading:     boolean;
  error?:      string | null;
  empty?:      boolean;
  emptyLabel?: string;
  onRetry?:    () => void;
  children:    ReactNode;
}

export default function DataState({
  loading,
  error,
  empty,
  emptyLabel = 'Aucune donnée disponible',
  onRetry,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <Box
        role="status"
        aria-label="Chargement en cours"
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Typography
              component="button"
              variant="body2"
              onClick={onRetry}
              sx={{
                cursor: 'pointer', background: 'none', border: 'none',
                color: 'error.main', fontWeight: 'bold', textDecoration: 'underline',
              }}
            >
              Réessayer
            </Typography>
          ) : undefined
        }
      >
        {error}
      </Alert>
    );
  }

  if (empty) {
    return (
      <Box
        sx={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          py:             8,
          gap:            1,
          color:          'text.disabled',
        }}
      >
        <InboxIcon sx={{ fontSize: 48 }} />
        <Typography variant="body2">{emptyLabel}</Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
