<template>
  <div class="stat-card">
    <div class="stat-card__label">
      {{ label }}
    </div>
    <div class="stat-card__value font-digital">
      {{ value }}<span class="stat-card__unit">{{ unit }}</span>
    </div>
  </div>
</template>

<script setup lang="ts" name="StatCard">
interface Props {
  /** 指标名 */
  label: string;
  /** 数值 */
  value: number | string;
  /** 单位 */
  unit?: string;
}

withDefaults(defineProps<Props>(), {
  unit: '',
});
</script>

<style lang="scss" scoped>
.stat-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;

  &__label {
    font-size: 12px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__value {
    font-size: 30px;
    line-height: 1;
    background:
      linear-gradient(180deg, rgba(88, 131, 255, 0) 40.96%, rgba(88, 131, 255, 0.6) 100%),
      linear-gradient(0deg, #ffffff, #ffffff);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    filter: drop-shadow(0px 6px 2.5px rgba(0, 0, 0, 0.3));
  }

  &__unit {
    margin-left: 1px;
    font-size: 12px;
    color: #F0F9FF;
    -webkit-text-fill-color: #F0F9FF;
  }
}
</style>
