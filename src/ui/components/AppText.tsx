// The only Text used by ui/: applies the language's Noto font, 04 §4 sizes, theme color and font scale.
import { Text, type TextProps } from 'react-native';
import { useUi } from '../theme/UiProvider';
import { MAX_FONT_SCALE, TYPE_SIZE, type Palette, type TypeVariant } from '../theme/tokens';

type ColorToken = Exclude<keyof Palette, `band${string}`>;

interface AppTextProps extends TextProps {
  variant: TypeVariant;
  color?: ColorToken;
  isBold?: boolean;
}

const BOLD_VARIANTS: ReadonlySet<TypeVariant> = new Set(['calmNumber', 'headline', 'title', 'button', 'zone']);

export function AppText({ variant, color = 'text', isBold, style, ...rest }: AppTextProps) {
  const { palette, fonts, fontScale, lineHeightRatio, isRtl } = useUi();
  const size = TYPE_SIZE[variant] * fontScale;
  const bold = isBold ?? BOLD_VARIANTS.has(variant);
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE / fontScale}
      style={[
        {
          color: palette[color],
          fontFamily: bold ? fonts.bold : fonts.regular,
          fontSize: size,
          lineHeight: Math.round(size * lineHeightRatio),
          // Explicit, so runs with no letters (e.g. "٧٢٪") still order right-to-left in Arabic.
          writingDirection: isRtl ? 'rtl' : 'ltr',
        },
        style,
      ]}
      {...rest}
    />
  );
}
