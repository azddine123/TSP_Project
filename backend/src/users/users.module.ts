import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KeycloakAdminService } from './keycloak-admin.service';
import { UsersService }         from './users.service';
import { UsersController }      from './users.controller';

@Module({
  imports:     [HttpModule],
  providers:   [KeycloakAdminService, UsersService],
  controllers: [UsersController],
  exports:     [UsersService],
})
export class UsersModule {}
