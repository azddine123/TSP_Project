import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CreateAdminEntrepotDto } from './dto/create-admin-entrepot.dto';

export interface KeycloakUser {
  id:         string;
  username:   string;
  email:      string;
  firstName:  string;
  lastName:   string;
  enabled:    boolean;
  attributes: Record<string, string[]> | null;
  createdTimestamp: number;
}

/**
 * Service d'administration Keycloak.
 * Gère la création/modification/suppression des comptes ADMIN_ENTREPOT
 * via l'API REST Admin de Keycloak.
 *
 * Authentification : client_credentials (service account) avec le rôle
 * realm-management/manage-users accordé au client NestJS.
 */
@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private readonly server:       string;
  private readonly realm:        string;
  private readonly clientId:     string;
  private readonly clientSecret: string;
  private readonly http: AxiosInstance;

  /** Cache du token admin (évite de le re-demander à chaque requête) */
  private adminToken: string | null = null;
  private tokenExpiry = 0;

  constructor(private readonly config: ConfigService) {
    this.server       = config.getOrThrow<string>('KEYCLOAK_SERVER');
    this.realm        = config.getOrThrow<string>('KEYCLOAK_REALM');
    this.clientId     = config.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
    this.clientSecret = config.getOrThrow<string>('KEYCLOAK_CLIENT_SECRET');

    this.http = axios.create({ baseURL: `${this.server}/admin/realms/${this.realm}` });
  }

  // ── Token admin ────────────────────────────────────────────────────────────

  private async getAdminToken(): Promise<string> {
    if (this.adminToken && Date.now() < this.tokenExpiry - 10_000) {
      return this.adminToken;
    }

    const tokenUrl = `${this.server}/realms/${this.realm}/protocol/openid-connect/token`;
    const resp = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     this.clientId,
        client_secret: this.clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    this.adminToken = resp.data.access_token as string;
    this.tokenExpiry = Date.now() + (resp.data.expires_in as number) * 1000;
    return this.adminToken;
  }

  private async authHeaders() {
    const token = await this.getAdminToken();
    return { Authorization: `Bearer ${token}` };
  }

  // ── Lister les utilisateurs avec le rôle ADMIN_ENTREPOT ───────────────────

  async listAdminsEntrepot(): Promise<KeycloakUser[]> {
    try {
      const headers = await this.authHeaders();
      const resp = await this.http.get<KeycloakUser[]>(
        `/roles/ADMIN_ENTREPOT/users`,
        { headers },
      );
      return resp.data;
    } catch (err: unknown) {
      this.logger.error('listAdminsEntrepot failed', err);
      throw new InternalServerErrorException('Impossible de récupérer les utilisateurs Keycloak');
    }
  }

  // ── Lister TOUS les utilisateurs du realm avec leur rôle principal ─────────

  async listAll(): Promise<(KeycloakUser & { role: string })[]> {
    try {
      const headers = await this.authHeaders();

      // Role-based queries work with query-users permission (already proven to work)
      const [superUsers, adminUsers, distUsers] = await Promise.all([
        this.http.get<KeycloakUser[]>('/roles/SUPER_ADMIN/users',    { headers }).then(r => r.data).catch(() => []),
        this.http.get<KeycloakUser[]>('/roles/ADMIN_ENTREPOT/users', { headers }).then(r => r.data).catch(() => []),
        this.http.get<KeycloakUser[]>('/roles/DISTRIBUTEUR/users',   { headers }).then(r => r.data).catch(() => []),
      ]);

      // Build map with role priority: SUPER_ADMIN > ADMIN_ENTREPOT > DISTRIBUTEUR
      const seen = new Map<string, KeycloakUser & { role: string }>();
      for (const u of superUsers) seen.set(u.id, { ...u, role: 'SUPER_ADMIN' });
      for (const u of adminUsers) if (!seen.has(u.id)) seen.set(u.id, { ...u, role: 'ADMIN_ENTREPOT' });
      for (const u of distUsers)  if (!seen.has(u.id)) seen.set(u.id, { ...u, role: 'DISTRIBUTEUR' });

      // Try to include users without any role — requires view-users permission (optional)
      try {
        const allUsers = await this.http.get<KeycloakUser[]>('/users?max=200', { headers }).then(r => r.data);
        for (const u of allUsers) {
          if (!seen.has(u.id)) seen.set(u.id, { ...u, role: 'AUCUN' });
        }
      } catch {
        // view-users not granted — only role-based users returned, which is acceptable
        this.logger.warn('listAll: /users?max=200 inaccessible (view-users permission missing) — showing role-based users only');
      }

      return [...seen.values()];
    } catch (err: unknown) {
      this.logger.error('listAll failed', err);
      throw new InternalServerErrorException('Impossible de récupérer les utilisateurs Keycloak');
    }
  }

  // ── Créer un utilisateur ADMIN_ENTREPOT ───────────────────────────────────

  async createAdminEntrepot(dto: CreateAdminEntrepotDto): Promise<KeycloakUser> {
    const headers = await this.authHeaders();

    // 1. Créer l'utilisateur
    const createResp = await this.http.post(
      '/users',
      {
        username:  dto.username,
        email:     dto.email,
        firstName: dto.firstName,
        lastName:  dto.lastName,
        enabled:   true,
        emailVerified: true,
        credentials: [{
          type:      'password',
          value:     dto.password,
          temporary: false,
        }],
        attributes: dto.entrepotId ? { entrepot_id: [dto.entrepotId] } : {},
      },
      { headers },
    );

    // Keycloak retourne 201 avec Location header contenant l'ID
    const location = createResp.headers['location'] as string;
    const userId = location.split('/').pop()!;

    // 2. Assigner le rôle ADMIN_ENTREPOT
    await this.assignRole(userId, 'ADMIN_ENTREPOT');

    return this.getById(userId);
  }

  // ── Récupérer un utilisateur par ID ──────────────────────────────────────

  async getById(id: string): Promise<KeycloakUser> {
    try {
      const headers = await this.authHeaders();
      const resp = await this.http.get<KeycloakUser>(`/users/${id}`, { headers });
      return resp.data;
    } catch {
      throw new NotFoundException(`Utilisateur ${id} introuvable dans Keycloak`);
    }
  }

  // ── Activer / Désactiver un compte ────────────────────────────────────────

  async updateStatut(id: string, enabled: boolean): Promise<KeycloakUser> {
    const headers = await this.authHeaders();
    await this.http.put(`/users/${id}`, { enabled }, { headers });
    return this.getById(id);
  }

  // ── Supprimer un utilisateur ──────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const headers = await this.authHeaders();
    await this.http.delete(`/users/${id}`, { headers });
  }

  // ── Réinitialiser le mot de passe (envoi email) ───────────────────────────

  async sendResetPasswordEmail(id: string): Promise<void> {
    const headers = await this.authHeaders();
    await this.http.put(
      `/users/${id}/execute-actions-email`,
      ['UPDATE_PASSWORD'],
      { headers },
    );
  }

  // ── Assigner un rôle realm ────────────────────────────────────────────────

  private async assignRole(userId: string, roleName: string): Promise<void> {
    const headers = await this.authHeaders();

    // Récupérer la représentation du rôle
    const roleResp = await this.http.get<{ id: string; name: string }>(
      `/roles/${roleName}`,
      { headers },
    );

    await this.http.post(
      `/users/${userId}/role-mappings/realm`,
      [{ id: roleResp.data.id, name: roleResp.data.name }],
      { headers },
    );
  }
}
