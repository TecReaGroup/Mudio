import { MESSAGES, type Messages } from '../../shared/i18n/message';
import { useSetting } from './setting-context';

export function useMessage(): Messages {
  return MESSAGES[useSetting().setting.language];
}
