import { useState, useCallback, useEffect } from 'react';
import { getAuthCookie } from '../utils/api';

/**
 * Hook to manage Google OAuth token validation state.
 * Encapsulates the logic to check if a valid access token is available
 * via the server-side cookie.
 */
export function useGoogleToken() {
  const [hasValidToken, setHasValidToken] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkToken = useCallback(async () => {
    try {
      const res = await getAuthCookie();
      setHasValidToken(res.success && !!res.access_token);
    } catch {
      setHasValidToken(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  return { hasValidToken, isChecking, checkToken };
}
