/**
 * Module d'Authentification.
 * Enregistre la JwtStrategy et exporte les Guards pour usage global.
 */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [
    // La stratégie de validation des tokens Keycloak
    JwtStrategy,

    /**
     * Guard JWT enregistré GLOBALEMENT via APP_GUARD.
     * Toutes les routes sont protégées par défaut.
     * Utiliser @Public() pour les routes ouvertes.
     */
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    /**
     * Guard RBAC enregistré GLOBALEMENT.
     * S'active uniquement sur les routes décorées avec @Roles().
     */
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [PassportModule],
})
export class AuthModule {}
