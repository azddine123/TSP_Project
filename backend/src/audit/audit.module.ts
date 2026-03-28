/**
 * Module Audit — Enregistre et expose les Audit Logs.
 * Exporte le repository pour que l'Interceptor puisse y accéder.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogInterceptor } from './audit-log.interceptor';

@Module({
  imports: [
    // Enregistre l'entité AuditLog pour injection via @InjectRepository
    TypeOrmModule.forFeature([AuditLog]),
  ],
  providers: [AuditLogInterceptor],
  // Exporter le module TypeORM pour que AppModule puisse l'utiliser
  exports: [TypeOrmModule, AuditLogInterceptor],
})
export class AuditModule {}
