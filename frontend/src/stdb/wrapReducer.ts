import { errText, pushToast } from '../components/Toast';

export function wrapReducer<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<boolean> {
  return async (...args: A) => {
    try {
      await fn(...args);
      return true;
    } catch (e) {
      pushToast(errText(e));
      return false;
    }
  };
}
