<template>
  <div>
    <div
      v-if="title"
      class="numeric-title"
      :style="{ fontSize: titleFontSize, textAlign: titleAlign, display: titleAlign === 'center' ? 'block' : 'flex' }"
    >
      <div
        v-if="mark"
        :style="`margin-right: 4px;width: 6px; height: 6px; background: ${mark}`"
      />
      {{ title }}
    </div>
    <div
      :class="{'numeric-with-unit': true, 'text-bg': bg, 'grey': grey}"
      :style="`justify-content: ${valueAlign}`"
    >
      <div
        v-thousand="value"
        class="numeric-value font-digital"
        :style="{ fontSize: valueFontSize }"
      >
        {{ value }}
      </div>
      <div
        v-if="unit"
        class="unit"
        :style="{ fontSize: unitFontSize }"
      >
        {{ unit }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="NumWithUnit">
interface Props {
  value?: string | number;
  unit?: string;
  titleAlign?: string;
  valueAlign?: string;
  valueFontSize?: string;
  unitFontSize?: string;
  titleFontSize?: string;
  title?: string;
  bg?: boolean;
  mark?: string;
  grey?: boolean;
}

withDefaults(defineProps<Props>(), {
  value: 0,
  unit: '',
  titleAlign: 'left',
  valueAlign: 'start',
  valueFontSize: '40px',
  unitFontSize: '12px',
  titleFontSize: '16px',
  title: '',
  bg: false,
  mark: '',
  grey: false,
});
</script>

<style scoped>
.numeric-with-unit {
  display: flex;
  align-items: baseline;
  color: #fff;
  /* background: linear-gradient(to bottom, #ffffff 50%, #5883FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  &.grey {
    background: rgba(255, 255, 255, 0.3);
    -webkit-background-clip: text;/
    -webkit-text-fill-color: transparent;
  } */
}
.numeric-value {
  font-size: 24px;
  line-height: 1;
  padding-right: 4px;
  letter-spacing: -2px;
}
.unit {
  font-size: 18px;
  color: #fff;
  line-height: 1;
  white-space: nowrap;
}
.numeric-title {
  font-size: 16px;
  color: #fff;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}
</style>
