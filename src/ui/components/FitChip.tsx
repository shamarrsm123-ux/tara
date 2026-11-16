// Sensor Fit Chip (04 §9.3, 04a): pill with a colored dot and a word — green "Good", amber "Adjust", red "No contact".
import type { FitLevel } from '../../shared/types';
import { useUi } from '../theme/UiProvider';
import { Tag } from './Surface';

const COLOR = { good: 'calm', adjust: 'rising', none: 'high' } as const;
const WORD = { good: 'fit.good', adjust: 'fit.adjust', none: 'fit.none' } as const;

export function FitChip({ fit, testID }: { fit: FitLevel; testID?: string }) {
  const { palette, t } = useUi();
  return <Tag label={t(WORD[fit])} color={palette[COLOR[fit]]} testID={testID} />;
}
