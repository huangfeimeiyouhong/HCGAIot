<!--
 * P6 告警信息面板
 * 上部:紧急/重要/一般三级统计
 * 下部:告警滚动列表(JS 定时器驱动,避免与同屏 canvas 争 GPU;hover 暂停)
-->
<template>
  <div class="alarm-panel">
    <div class="level-row">
      <div
        v-for="stat in levelStats"
        :key="stat.level"
        class="level-card"
        :style="{ borderColor: levelColor(stat.level) }"
      >
        <div
          class="level-card__count font-digital"
          :style="{ color: levelColor(stat.level) }"
        >
          {{ stat.count }}
        </div>
        <div class="level-card__label">{{ stat.label }}告警</div>
        <div class="level-card__sub">今日累计</div>
      </div>
    </div>

    <div
      class="alarm-ticker"
      @mouseenter="pauseTicker"
      @mouseleave="resumeTicker"
    >
      <div class="alarm-ticker__head">
        <span class="alarm-ticker__title">实时告警</span>
        <span class="alarm-ticker__hint">hover 暂停滚动</span>
      </div>
      <div class="alarm-ticker__viewport">
        <div
          class="alarm-ticker__track"
          :class="{ 'alarm-ticker__track--no-anim': !animating }"
          :style="{ transform: `translateY(${-index * ITEM_STEP}px)` }"
        >
          <div
            v-for="(item, i) in displayList"
            :key="`${item.id}-${i}`"
            class="alarm-item"
            :style="{ height: `${ITEM_STEP}px` }"
          >
            <div
              class="alarm-item__level"
              :style="{ background: levelColor(item.level) }"
            >
              {{ levelText(item.level) }}
            </div>
            <div class="alarm-item__body">
              <div class="alarm-item__row1">
                <span class="alarm-item__device">{{ item.device }}</span>
                <span class="alarm-item__time">{{ item.time }}</span>
              </div>
              <div class="alarm-item__row2">
                {{ item.platform }} · {{ item.location }}
              </div>
              <div class="alarm-item__content">{{ item.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="alarm-footer">每 60s 自动刷新 · 数据来源:各厂商平台告警推送</div>
  </div>
</template>

<script setup lang="ts" name="AlarmPanel">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { ALARM_LEVEL_COLOR } from '@/constants/chart';
import type { AlarmItem, AlarmLevel, AlarmLevelStat } from '@/views/iot-cockpit/types';

const props = defineProps<{
  levelStats: AlarmLevelStat[];
  alarms: AlarmItem[];
}>();

/** 可见条数 / 每条步进高度(含间距) */
const VISIBLE = 7;
const ITEM_STEP = 100;

const levelText = (level: AlarmLevel) =>
  ({ urgent: '紧急', important: '重要', normal: '一般' })[level];
const levelColor = (level: AlarmLevel) => ALARM_LEVEL_COLOR[level];

/** 列表 + 尾部克隆 VISIBLE 条,实现无缝循环 */
const displayList = computed(() => [
  ...props.alarms,
  ...props.alarms.slice(0, VISIBLE),
]);

const index = ref(0);
const animating = ref(true);
let timer: number | null = null;

function tick(): void {
  if (props.alarms.length <= VISIBLE) return;
  if (index.value >= props.alarms.length) {
    // 克隆区与主区内容一致:关过渡瞬移回起点,视觉无感
    animating.value = false;
    index.value = 0;
    requestAnimationFrame(() => {
      animating.value = true;
    });
  } else {
    index.value += 1;
  }
}

function startTicker(): void {
  stopTicker();
  timer = window.setInterval(tick, 3000);
}
function stopTicker(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}
function pauseTicker(): void {
  stopTicker();
}
function resumeTicker(): void {
  startTicker();
}

onMounted(startTicker);
onBeforeUnmount(stopTicker);

// 数据刷新后回到顶部,避免索引越界导致空窗
watch(
  () => props.alarms,
  () => {
    animating.value = false;
    index.value = 0;
    requestAnimationFrame(() => {
      animating.value = true;
    });
  }
);
</script>

<style scoped lang="scss">
.alarm-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.level-row {
  display: flex;
  gap: 10px;
  height: 84px;
  flex-shrink: 0;

  .level-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    background: rgba(65, 192, 255, 0.06);
    border: 1px solid rgba(65, 192, 255, 0.18);
    border-radius: 6px;

    &__count {
      font-size: 30px;
      line-height: 1.05;
    }

    &__label {
      font-size: 13px;
      color: #e6f1ff;
    }

    &__sub {
      font-size: 10px;
      color: rgba(143, 179, 217, 0.7);
    }
  }
}

.alarm-ticker {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
  display: flex;
  flex-direction: column;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 24px;
    flex-shrink: 0;
  }

  &__title {
    font-size: 15px;
    font-weight: 600;
    color: #e6f1ff;

    &::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 12px;
      margin-right: 6px;
      vertical-align: -1px;
      background: #41c0ff;
      border-radius: 2px;
    }
  }

  &__hint {
    font-size: 11px;
    color: rgba(143, 179, 217, 0.6);
  }

  &__viewport {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    margin-top: 4px;
  }

  &__track {
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);

    &--no-anim {
      transition: none;
    }
  }
}

.alarm-item {
  display: flex;
  gap: 8px;
  box-sizing: border-box;
  padding: 6px 8px;
  margin-bottom: 8px;
  background: rgba(65, 192, 255, 0.05);
  border: 1px solid rgba(65, 192, 255, 0.12);
  border-radius: 6px;

  &__level {
    flex-shrink: 0;
    width: 22px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #041234;
    font-weight: 700;
    writing-mode: vertical-lr;
    letter-spacing: 2px;
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  &__row1 {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  &__device {
    font-size: 14px;
    color: #e6f1ff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__time {
    font-size: 11px;
    color: rgba(143, 179, 217, 0.75);
    flex-shrink: 0;
    font-family: 'DIN Alternate', 'Bahnschrift', sans-serif;
  }

  &__row2 {
    font-size: 12px;
    color: #8fb3d9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__content {
    font-size: 12px;
    color: rgba(143, 179, 217, 0.65);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.alarm-footer {
  flex-shrink: 0;
  margin-top: 8px;
  text-align: center;
  font-size: 11px;
  color: rgba(143, 179, 217, 0.55);
}
</style>
