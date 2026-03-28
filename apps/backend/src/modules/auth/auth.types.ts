import type { AdministratorRole } from '@prisma/client';

export interface AuthenticatedUser {
  sub: string;
  username: string;
  name: string;
  email: string;
  role: AdministratorRole;
  mustChangePassword: boolean;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    role: AdministratorRole;
    mustChangePassword: boolean;
  };
}
