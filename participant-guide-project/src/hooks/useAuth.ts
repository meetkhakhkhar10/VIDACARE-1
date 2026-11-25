/**
 * useAuth.ts - Convenient React Hook for accessing Authentication State
 */

import { useAuthContext } from '../context/AuthContext';

export function useAuth() {
  return useAuthContext();
}
