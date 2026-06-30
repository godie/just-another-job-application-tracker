import { useState, useCallback, useEffect, useRef } from 'react';
import { getAuthCookie } from '../utils/api';

export function useGoogleToken() {
  const [tokenCheckResult, setTokenCheckResult] = useState<boolean | null>(null);
  const checkedRef = useRef(false);

  const checkToken = useCallback(async () => {
    try {
      const res = await getAuthCookie();
      setTokenCheckResult(res.success && !!res.access_token);
    } catch {
      setTokenCheckResult(false);
    }
  }, []);

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      void checkToken();
    }
  }, [checkToken]);

  const hasValidToken = tokenCheckResult === true;
  const isChecking = tokenCheckResult === null;

  return { hasValidToken, isChecking, checkToken };
}
