import { useState, useEffect } from 'react';
import { updaterContext } from './sync';

export function useUpdate() {
  // force update component on component value change, since what we get till now is just a reference, it won't change despite of internal value changed by ecs engines
  const [, set] = useState(true);
  useEffect(() => {
    const subscription = updaterContext.subscribe(() => set(value => !value));
    return () => subscription.unsubscribe();
  }, []);
}
