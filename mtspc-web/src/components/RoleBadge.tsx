/**
 * ROLE BADGE — Chip de rôle réutilisable
 * ========================================
 * Usage :
 *   <RoleBadge role="SUPER_ADMIN" />
 *   <RoleBadge role="ADMIN_ENTREPOT" outlined />
 */
import React from 'react';
import { Chip } from '@mui/material';
import { ROLE_CHIP_COLOR } from '../constants';
import type { UserRole } from '../types';

interface RoleBadgeProps {
  role:      string;
  outlined?: boolean;
  size?:     'small' | 'medium';
}

export default function RoleBadge({ role, outlined = false, size = 'small' }: RoleBadgeProps) {
  const color = ROLE_CHIP_COLOR[role as UserRole] ?? 'default';
  return (
    <Chip
      label={role}
      color={color}
      size={size}
      variant={outlined ? 'outlined' : 'filled'}
      aria-label={`Rôle : ${role}`}
    />
  );
}
