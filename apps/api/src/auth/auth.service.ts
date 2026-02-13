import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { DatabaseService } from '../database/database.service';
import {
  createAccount,
  findAccountByEmail,
  findAccountById,
  updateLastLogin,
} from '@into-the-void/database';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService
  ) {}

  async register(dto: RegisterDto) {
    const db = this.databaseService.getClient();

    // Check if email already exists
    const existingAccount = await findAccountByEmail(db, dto.email);
    if (existingAccount) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create account
    const account = await createAccount(db, {
      email: dto.email,
      passwordHash,
    });

    // Generate token
    const token = this.generateToken(account.id);

    return {
      account: {
        id: account.id,
        email: account.email,
        createdAt: account.createdAt,
      },
      token,
    };
  }

  async login(dto: LoginDto) {
    const db = this.databaseService.getClient();

    // Find account
    const account = await findAccountByEmail(db, dto.email);
    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, account.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await updateLastLogin(db, account.id);

    // Generate token
    const token = this.generateToken(account.id);

    return {
      account: {
        id: account.id,
        email: account.email,
        createdAt: account.createdAt,
        lastLoginAt: new Date(),
      },
      token,
    };
  }

  async getProfile(accountId: string) {
    const db = this.databaseService.getClient();
    const account = await findAccountById(db, accountId);

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    return {
      id: account.id,
      email: account.email,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
    };
  }

  async logout(accountId: string) {
    // In a more complete implementation, we'd invalidate the token
    // For now, the client just discards the token
    return { success: true };
  }

  async validateToken(accountId: string): Promise<boolean> {
    const db = this.databaseService.getClient();
    const account = await findAccountById(db, accountId);
    return !!account;
  }

  private generateToken(accountId: string): string {
    return this.jwtService.sign({ accountId });
  }
}
