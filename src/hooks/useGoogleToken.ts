import { useState, useCallback, useEffect, useRef } from 'react';
import { getAuthCookie } from '../utils/api';

/**
 * Hook to manage Google OAuth token validation state.
 * Encapsulates the logic to check if a valid access token is available
 * via the server-side cookie.
 */
export function useGoogleToken() {
  const [hasValidToken, setHasValidToken] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const checkedRef = useRef(false);

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
    // Guard ensures we only check once per hook instance lifetime
    if (!checkedRef.current) {
      checkedRef.current = true;
      checkToken();
    }
  }, [checkToken]);

  return { hasValidToken, isChecking, checkToken };
}
