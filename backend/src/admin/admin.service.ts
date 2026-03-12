import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { users } from '../../drizzle/schema';
import { AuthService } from '../auth/auth.service';
import { DRIZZLE_CLIENT, DrizzleClient } from '../database';
import { LoggingService } from '../logging/logging.service';

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
    private readonly authService: AuthService,
    private readonly logging: LoggingService,
  ) {}

  async getUsers(): Promise<UserSummary[]> {
    const rows = await this.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .all();

    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
    }));
  }

  async approveUser(id: number): Promise<UserSummary> {
    const user = await this.getUserById(id);

    if (user.status === 'ACTIVE') {
      throw new BadRequestException('User is already active');
    }

    const updated = await this.updateStatus(id, 'ACTIVE');
    this.logging.log('User approved', 'AdminService', id, { previousStatus: user.status });
    return updated;
  }

  async banUser(id: number): Promise<UserSummary> {
    const user = await this.getUserById(id);

    if (user.role === 'SUPERADMIN') {
      throw new BadRequestException('Cannot ban a superadmin account');
    }

    if (user.status === 'BANNED') {
      throw new BadRequestException('User is already banned');
    }

    const updated = await this.updateStatus(id, 'BANNED');
    await this.authService.revokeAllTokensForUser(id);
    this.logging.log('User banned', 'AdminService', id, { previousStatus: user.status });

    return updated;
  }

  async unbanUser(id: number): Promise<UserSummary> {
    const user = await this.getUserById(id);

    if (user.status !== 'BANNED') {
      throw new BadRequestException('User is not banned');
    }

    const updated = await this.updateStatus(id, 'ACTIVE');
    this.logging.log('User unbanned', 'AdminService', id, { previousStatus: user.status });
    return updated;
  }

  private async getUserById(id: number): Promise<UserSummary> {
    const user = await this.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .get();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async updateStatus(id: number, status: string): Promise<UserSummary> {
    const updatedUser = await this.db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .get();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }
}
