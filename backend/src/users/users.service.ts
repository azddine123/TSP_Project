import { Injectable } from '@nestjs/common';
import { KeycloakAdminService, KeycloakUser } from './keycloak-admin.service';
import { CreateAdminEntrepotDto } from './dto/create-admin-entrepot.dto';
import { UpdateAdminStatutDto }   from './dto/update-admin-statut.dto';
import { EntrepotsService }       from '../entrepots/entrepots.service';

export interface AdminEntrepotDto {
  id:         string;
  username:   string;
  email:      string;
  firstName:  string;
  lastName:   string;
  enabled:    boolean;
  entrepotId: string | null;
  createdAt:  number;
  role:       string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly keycloak: KeycloakAdminService,
    private readonly entrepots: EntrepotsService,
  ) {}

  async findAll(): Promise<AdminEntrepotDto[]> {
    const users = await this.keycloak.listAdminsEntrepot();
    return users.map(u => this.toDto(u, 'ADMIN_ENTREPOT'));
  }

  async findAllUsers(): Promise<AdminEntrepotDto[]> {
    const [users, entrepots] = await Promise.all([
      this.keycloak.listAll(),
      this.entrepots.findAll(),
    ]);
    // Build map: keycloakAdminId → entrepotId from the DB (source of truth)
    const adminToEntrepot = new Map<string, string>(
      entrepots
        .filter(e => e.keycloakAdminId)
        .map(e => [e.keycloakAdminId!, e.id]),
    );
    return users.map(u => ({
      ...this.toDto(u, u.role),
      // DB takes priority over Keycloak attributes for entrepot assignment
      entrepotId: adminToEntrepot.get(u.id) ?? u.attributes?.entrepot_id?.[0] ?? null,
    }));
  }

  async findOne(id: string): Promise<AdminEntrepotDto> {
    return this.toDto(await this.keycloak.getById(id));
  }

  async create(dto: CreateAdminEntrepotDto): Promise<AdminEntrepotDto> {
    const user = await this.keycloak.createAdminEntrepot(dto);
    // Si un entrepôt est sélectionné, mettre à jour keycloak_admin_id dans la DB
    if (dto.entrepotId) {
      await this.entrepots.assignAdmin(dto.entrepotId, user.id);
    }
    return this.toDto(user);
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

  private toDto(u: KeycloakUser, role = 'AUCUN'): AdminEntrepotDto {
    return {
      id:         u.id,
      username:   u.username,
      email:      u.email ?? '',
      firstName:  u.firstName ?? '',
      lastName:   u.lastName ?? '',
      enabled:    u.enabled,
      entrepotId: u.attributes?.entrepot_id?.[0] ?? null,
      createdAt:  u.createdTimestamp,
      role,
    };
  }
}
