<!--
  状态机时间轴 —— 入驻 7 态 / 工单 5 态 / 告警 4 态 / 绑定 4 态共用
  已完成节点 success 色，当前节点 primary 色，未到达节点 closed 色
-->
<template>
  <div class="hi-timeline">
    <div
      v-for="(step, index) in steps"
      :key="step.status"
      class="hi-timeline__node"
      :class="nodeClass(step.status, index)"
    >
      <div
        class="hi-timeline__dot"
        @mouseenter="hoverIndex = index"
        @mouseleave="hoverIndex = -1"
      >
        <el-icon v-if="stateOf(step.status) === 'done'">
          <Select />
        </el-icon>
        <span v-else>{{ index + 1 }}</span>

        <!-- 悬浮显示该节点的操作人 / 时间 / 备注 -->
        <el-popover
          v-if="recordOf(step.status)"
          placement="top"
          :width="260"
          trigger="hover"
        >
          <template #reference>
            <span />
          </template>
          <div class="hi-timeline__pop">
            <div class="hi-timeline__pop-title">{{ recordOf(step.status)!.action }}</div>
            <div>操作人：{{ recordOf(step.status)!.operator }}</div>
            <div>时间：{{ formatDateTime(recordOf(step.status)!.time) }}</div>
            <div v-if="recordOf(step.status)!.remark">
              备注：{{ recordOf(step.status)!.remark }}
            </div>
          </div>
        </el-popover>
      </div>
      <div class="hi-timeline__label">
        {{ step.label }}
      </div>
      <div
        v-if="index < steps.length - 1"
        class="hi-timeline__line"
        :class="{ 'is-done': isDone(steps[index + 1]!.status) }"
      />
    </div>
  </div>
</template>

<script setup lang="ts" name="TimelineSteps">
import { computed, ref } from 'vue';

import { formatDateTime } from '@/utils/date';

import type { TimelineRecord, TimelineStep } from '@/types';

interface Props {
  /** 流转记录（append-only，页面只读） */
  records: TimelineRecord[];
  /** 当前状态 */
  current: string;
  /** 节点顺序 */
  steps: TimelineStep[];
}

const props = defineProps<Props>();

const hoverIndex = ref(-1);

/** 当前状态在步骤中的下标 */
const currentIndex = computed(() => props.steps.findIndex((s) => s.status === props.current));

/**
 * 节点状态：done（已过）/ current（当前）/ todo（未到）
 * @param status 状态码
 * @returns 节点状态
 */
function stateOf(status: string): 'done' | 'current' | 'todo' {
  const idx = props.steps.findIndex((s) => s.status === status);
  if (idx < currentIndex.value) return 'done';
  if (idx === currentIndex.value) return 'current';
  return 'todo';
}

/**
 * 某节点是否已走过
 * @param status 状态码
 * @returns 已走过返回 true
 */
function isDone(status: string): boolean {
  return stateOf(status) === 'done' || stateOf(status) === 'current';
}

/**
 * 查某状态对应的流转记录（取最后一条）
 * @param status 状态码
 * @returns 记录；无则 undefined
 */
function recordOf(status: string): TimelineRecord | undefined {
  const hits = props.records.filter((r) => r.toStatus === status);
  return hits.length ? hits[hits.length - 1] : undefined;
}

/**
 * 节点 class
 * @param status 状态码
 * @param _index 下标（保留给未来分支）
 * @returns class 字符串
 */
function nodeClass(status: string, _index: number): string {
  return `is-${stateOf(status)}`;
}
</script>

<style scoped lang="scss">
.hi-timeline {
  display: flex;
  align-items: flex-start;
  width: 100%;
  padding: 8px 0;

  &__node {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__dot {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    background: var(--color-bg-container);
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: default;
  }

  &__label {
    color: var(--color-text-secondary);
    font-size: 12px;
    white-space: nowrap;
  }

  &__line {
    position: absolute;
    top: 13px;
    left: 50%;
    width: 100%;
    height: 2px;
    background: var(--color-border);

    &.is-done {
      background: var(--color-success);
    }
  }

  &__pop-title {
    margin-bottom: 4px;
    color: var(--color-text-title);
    font-weight: 600;
  }

  // 三种节点状态
  .is-done {
    .hi-timeline__dot {
      border-color: var(--color-success);
      background: var(--color-success);
      color: #FFFFFF;
    }

    .hi-timeline__label {
      color: var(--color-text-body);
    }
  }

  .is-current {
    .hi-timeline__dot {
      border-color: var(--color-primary-text);
      background: var(--color-primary-bg);
      color: var(--color-primary-text);
      box-shadow: 0 0 0 3px var(--color-primary-bg);
    }

    .hi-timeline__label {
      color: var(--color-primary-text);
      font-weight: 600;
    }
  }

  .is-todo {
    .hi-timeline__dot {
      background: var(--color-fill-light);
    }
  }
}
</style>