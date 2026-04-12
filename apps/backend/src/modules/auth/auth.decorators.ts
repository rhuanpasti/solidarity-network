import { SetMetadata } from '@nestjs/common';
import type { AccountType } from '@solidarity-network/shared';
import type { AdministratorRole } from '@prisma/client';

export const IS_PUBLIC_KEY = 'isPublic';
export const ALLOW_PASSWORD_CHANGE_WHEN_REQUIRED_KEY = 'allowPasswordChangeWhenRequired';
export const ACCOUNT_TYPES_KEY = 'accountTypes';
export const ADMINISTRATOR_ROLES_KEY = 'administratorRoles';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const AllowPasswordChangeWhenRequired = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_WHEN_REQUIRED_KEY, true);
export const AccountTypes = (...accountTypes: AccountType[]) =>
  SetMetadata(ACCOUNT_TYPES_KEY, accountTypes);
export const AdministratorRoles = (...roles: AdministratorRole[]) =>
  SetMetadata(ADMINISTRATOR_ROLES_KEY, roles);
