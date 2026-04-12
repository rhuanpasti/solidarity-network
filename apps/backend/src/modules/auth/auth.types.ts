import type { AccountType } from '@solidarity-network/shared';
import type { AdministratorRole } from '@prisma/client';

export interface AuthenticatedUser {
  sub: string;
  username: string;
  name: string;
  email: string;
  role: AdministratorRole | null;
  accountType: AccountType;
  programIds: string[];
  mustChangePassword: boolean;
  csrfToken: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  token: string;
  csrfToken: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    role: AdministratorRole | null;
    accountType: AccountType;
    mustChangePassword: boolean;
  };
}
