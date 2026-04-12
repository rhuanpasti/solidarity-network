import { SetMetadata } from '@nestjs/common';
import type { AccountType } from '@solidarity-network/shared';

export const IS_PUBLIC_KEY = 'isPublic';
export const ALLOW_PASSWORD_CHANGE_WHEN_REQUIRED_KEY = 'allowPasswordChangeWhenRequired';
export const ACCOUNT_TYPES_KEY = 'accountTypes';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const AllowPasswordChangeWhenRequired = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_WHEN_REQUIRED_KEY, true);
export const AccountTypes = (...accountTypes: AccountType[]) =>
  SetMetadata(ACCOUNT_TYPES_KEY, accountTypes);
