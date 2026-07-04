import { StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';

type Style = ViewStyle | TextStyle | ImageStyle;

interface VariantsConfig<V extends Record<string, Record<string, Style>>> {
  base?: Style;
  variants: V;
  defaultVariants?: { [K in keyof V]?: keyof V[K] };
}

type VariantProps<V extends Record<string, Record<string, Style>>> = {
  [K in keyof V]?: keyof V[K];
};

export function createVariants<V extends Record<string, Record<string, Style>>>(
  config: VariantsConfig<V>
) {
  return function styleFor(props: VariantProps<V> = {}): StyleProp<Style> {
    const merged: Style[] = [];
    if (config.base) merged.push(config.base);

    for (const key in config.variants) {
      const chosen = (props[key] ?? config.defaultVariants?.[key]) as keyof V[typeof key] | undefined;
      if (chosen && config.variants[key][chosen as string]) {
        merged.push(config.variants[key][chosen as string]);
      }
    }
    return merged;
  };
}
