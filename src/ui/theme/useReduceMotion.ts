// Respects the phone's "reduce motion" setting (04 §11).
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [isReduced, setIsReduced] = useState(false);
  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (isMounted) setIsReduced(value);
      })
      .catch(() => {
        // Platform can't report the setting (some web browsers): keep animations on.
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setIsReduced);
    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);
  return isReduced;
}
