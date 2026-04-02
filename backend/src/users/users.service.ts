import { Injectable } from '@nestjs/common';
import { KeycloakAdminService, KeycloakUser } from './keycloak-admin.service';
import { CreateAdminEntrepotDto } from './dto/create-admin-entrepot.dto';
import { UpdateAdminStatutDto }   from './dto/update-admin-statut.dto';

export interface AdminEntrepotDto {
  id:         string;
  username:   string;
  email:      string;
  firstName:  string;
  lastName:   string;
  enabled:    boolean;
  entrepotId: string | null;
  createdAt:  number;
}

@Injectable()
export class UsersService {
  constructor(private readonly keycloak: KeycloakAdminService) {}

  async findAll(): Promise<AdminEntrepotDto[]> {
    const users = await this.keycloak.listAdminsEntrepot();
    return users.map(this.toDto);
  }

  async findOne(id: string): Promise<AdminEntrepotDto> {
    return this.toDto(await this.keycloak.getById(id));
  }

  async create(dto: CreateAdminEntrepotDto): Promise<AdminEntrepotDto> {
    return this.toDto(await this.keycloak.createAdminEntrepot(dto));
  }

  async updateStatut(id: string, dto: UpdateAdminStatutDto): Promise<AdminEntrepotDto> {
    return this.toDto(await this.keycloak.updateStatut(id, dto.enabled));
  }

  async delete(id: string): Promise<void> {
    return this.keycloak.delete(id);
  }

  async resetPassword(id: string): Promise<void> {
    return this.keycloak.sendResetPasswordEmail(id);
  }

  private toDto(u: KeycloakUser): AdminEntrepotDto {
    return {
      id:         u.id,
      username:   u.username,
      email:      u.email ?? '',
      firstName:  u.firstName ?? '',
      lastName:   u.lastName ?? '',
      enabled:    u.enabled,
      entrepotId: u.attributes?.entrepot_id?.[0] ?? null,
      createdAt:  u.createdTimestamp,
    };
  }
}
