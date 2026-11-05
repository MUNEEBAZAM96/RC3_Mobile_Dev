import { api } from '../../services/api/client';
import type { AuthClient } from './types';

export const jwtAuth: AuthClient = {
  id: 'jwt',
  signIn(email, password) {
    return api.login(email, password);
  },
  signUp(email, password) {
    return api.signup(email, password);
  },
  async signOut() {},
};
