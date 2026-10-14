<!--
  空态 —— 图形 + 文案 + 「清除筛选」按钮
-->
<template>
  <div class="hi-empty">
    <svg
      class="hi-empty__img"
      width="120"
      height="90"
      viewBox="0 0 120 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="60"
        cy="78"
        rx="38"
        ry="6"
        fill="currentColor"
        opacity="0.08"
      />
      <rect
        x="28"
        y="22"
        width="64"
        height="48"
        rx="4"
        stroke="currentColor"
        stroke-width="2"
        opacity="0.5"
      />
      <path
        d="M28 58l14-16 12 12 10-9 18 17"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.35"
      />
      <circle
        cx="76"
        cy="36"
        r="5"
        stroke="currentColor"
        stroke-width="2"
        opacity="0.5"
      />
    </svg>
    <p class="hi-empty__text">
      {{ text }}
    </p>
    <p
      v-if="desc"
      class="hi-empty__desc"
    >
      {{ desc }}
    </p>
    <el-button
      v-if="actionable"
      size="small"
      @click="emit('clear')"
    >
      清除筛选
    </el-button>
  </div>
</template>

<script setup lang="ts" name="EmptyState">
interface Props {
  /** 主文案 */
  text?: string;
  /** 补充说明 */
  desc?: string;
  /** 是否显示「清除筛选」按钮 */
  actionable?: boolean;
}

withDefaults(defineProps<Props>(), {
  text: '暂无数据',
  desc: '',
  actionable: true,
});

const emit = defineEmits<{
  /** 点击「清除筛选」 */
  clear: [];
}>();
</script>

<style scoped lang="scss">
.hi-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--color-text-secondary);

  &__text {
    color: var(--color-text-body);
    font-size: 14px;
  }

  &__desc {
    color: var(--color-text-secondary);
    font-size: 12px;
  }
}
</style>