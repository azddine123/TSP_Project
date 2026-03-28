/**
 * MTSPC26 — Point d'entrée du Backend NestJS
 * Plateforme Logistique Humanitaire — Béni Mellal-Khénifra
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── 1. CORS : autoriser le frontend React et l'app mobile ──────────────────
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      // Expo Go utilise ces origines en développement
      /^exp:\/\//,
      /^http:\/\/192\.168\./,
      /^http:\/\/10\.0\./,
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── 2. Validation globale des DTOs ─────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Supprimer les champs non déclarés dans les DTOs
      forbidNonWhitelisted: true,
      transform: true,         // Convertir automatiquement les types (string → number)
    }),
  );

  // ── 3. Préfixe global de l'API ─────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── 4. Documentation Swagger (utile pour la démo jury) ────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MTSPC26 — API Logistique Humanitaire')
    .setDescription(
      'API sécurisée de gestion des ressources humanitaires — Région Béni Mellal-Khénifra\n\n' +
      '**Authentification :** Bearer Token JWT fourni par Keycloak\n\n' +
      '**Rôles :** SUPER_ADMIN | ADMIN_ENTREPOT | DISTRIBUTEUR',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-Keycloak',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 9090;
  await app.listen(port);

  console.log(`\n🚀 API Logistique MTSPC26 démarrée`);
  console.log(`   → Backend  : http://localhost:${port}/api/v1`);
  console.log(`   → Swagger  : http://localhost:${port}/api/docs`);
  console.log(`   → Keycloak : ${process.env.KEYCLOAK_SERVER}/realms/${process.env.KEYCLOAK_REALM}\n`);
}

bootstrap();
