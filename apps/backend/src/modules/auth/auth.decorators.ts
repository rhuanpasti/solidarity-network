import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const ALLOW_PASSWORD_CHANGE_WHEN_REQUIRED_KEY = 'allowPasswordChangeWhenRequired';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const AllowPasswordChangeWhenRequired = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_WHEN_REQUIRED_KEY, true);
