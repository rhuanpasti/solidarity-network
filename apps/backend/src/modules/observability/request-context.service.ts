import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthenticatedUser } from '../auth/auth.types';

export interface RequestContextState {
  requestId: string;
  method: string;
  path: string;
  ipAddress?: string;
  userAgent?: string;
  startedAt: number;
  accountId?: string;
  accountType?: string;
  role?: string | null;
}

export const requestContextStorage =
  new AsyncLocalStorage<RequestContextState>();

@Injectable()
export class RequestContextService {
  run<T>(state: RequestContextState, callback: () => T) {
    return requestContextStorage.run(state, callback);
  }

  get() {
    return requestContextStorage.getStore();
  }

  setAuthenticatedUser(user: AuthenticatedUser) {
    const store = requestContextStorage.getStore();

    if (!store) {
      return;
    }

    store.accountId = user.sub;
    store.accountType = user.accountType;
    store.role = user.role;
  }
}
