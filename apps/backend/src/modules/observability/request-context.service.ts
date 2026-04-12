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

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextState>();

  run<T>(state: RequestContextState, callback: () => T) {
    return this.storage.run(state, callback);
  }

  get() {
    return this.storage.getStore();
  }

  setAuthenticatedUser(user: AuthenticatedUser) {
    const store = this.storage.getStore();

    if (!store) {
      return;
    }

    store.accountId = user.sub;
    store.accountType = user.accountType;
    store.role = user.role;
  }
}

