/**
 * 千分位格式化指令
 * 使用方式:
 *   v-thousand="12345"
 *   v-thousand="{ value: 12345, decimals: 2, round: true }"
 */
import type { Directive } from 'vue';

import { formatThousand, isEmpty, type FormatThousandConfig } from '@/utils/format';

type ThousandBinding = number | string | { value: number | string } & FormatThousandConfig;

function updateValue(el: HTMLElement, binding: { value: ThousandBinding }) {
  const value = binding.value;

  if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'value' in value) {
    const { value: val, ...config } = value;
    el.textContent = isEmpty(val) ? '-' : formatThousand(val, config);
  } else {
    el.textContent = isEmpty(value) ? '-' : formatThousand(value);
  }
}

export const thousand: Directive<HTMLElement, ThousandBinding> = {
  mounted(el, binding) {
    updateValue(el, binding);
  },
  updated(el, binding) {
    updateValue(el, binding);
  },
};
