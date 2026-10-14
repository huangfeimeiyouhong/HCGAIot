<!--
  P-12 履约考核
-->
<template>
  <PageContainer
    title="履约考核"
    desc="厂家 SLA 履约指标按季度考核，口径全平台统一"
  >
    <DemoTipBar />

    <FilterBar :has-filter="false">
      <template #fields>
        <el-select
          v-model="quarter"
          class="quarter-select"
          placeholder="考核季度"
        >
          <el-option
            v-for="q in quarters"
            :key="q"
            :label="q"
            :value="q"
          />
        </el-select>
      </template>
      <template #actions>
        <el-button plain @click="onExport">导出报表</el-button>
      </template>
    </FilterBar>

    <section
      v-for="row in rows"
      :key="row.vendorId"
      class="card perf-card"
    >
      <div class="perf-card__head">
        <div class="perf-card__titles">
          <h3 class="perf-card__name">
            {{ row.vendorName }}
          </h3>
          <span class="perf-card__meta">
            {{ row.vendorId }} · 在管设备 {{ row.deviceCount }} 台
          </span>
        </div>
        <StatusBadge
          :status="row.vendorId"
          :label="gradeOf(row.passRate)"
          :tone="gradeTone(row.passRate)"
        />
      </div>

      <div class="perf-card__metrics">
        <div class="perf-metric">
          <span class="perf-metric__label">接单及时率</span>
          <span class="perf-metric__value">{{ row.onTimeAcceptRate }}%</span>
          <el-progress
            :percentage="row.onTimeAcceptRate"
            :stroke-width="6"
            :show-text="false"
          />
        </div>
        <div class="perf-metric">
          <span class="perf-metric__label">处理及时率</span>
          <span class="perf-metric__value">{{ row.onTimeHandleRate }}%</span>
          <el-progress
            :percentage="row.onTimeHandleRate"
            :stroke-width="6"
            :show-text="false"
          />
        </div>
        <div class="perf-metric">
          <span class="perf-metric__label">验收通过率</span>
          <span class="perf-metric__value">{{ row.passRate }}%</span>
          <el-progress
            :percentage="row.passRate"
            :stroke-width="6"
            :show-text="false"
          />
        </div>
        <div class="perf-metric">
          <span class="perf-metric__label">平均响应</span>
          <span class="perf-metric__value">{{ row.avgResponseHours }} 小时</span>
        </div>
        <div class="perf-metric">
          <span class="perf-metric__label">平均确认时长</span>
          <span class="perf-metric__value">{{ row.avgConfirmHours }} 小时</span>
        </div>
        <div class="perf-metric">
          <span class="perf-metric__label">违约次数</span>
          <span
            class="perf-metric__value"
            :class="{ 'is-danger': row.breachCount > 5 }"
          >{{ row.breachCount }} 次</span>
        </div>
      </div>
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformPerformance">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';

import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { QUARTERS } from '@/mock/factories/performance';

import { platformApi } from '@/api';

import type { StatusTone, VendorSlaStat } from '@/types';

type PerfRow = VendorSlaStat & { vendorName: string; deviceCount: number };

const quarters = QUARTERS;
const quarter = ref(QUARTERS[QUARTERS.length - 1]!);
const rows = ref<PerfRow[]>([]);

/** 评级 */
const gradeOf = (passRate: number): string =>
  passRate >= 95 ? '优秀' : passRate >= 88 ? '良好' : passRate >= 80 ? '合格' : '待改进';

const gradeTone = (passRate: number): StatusTone =>
  passRate >= 95 ? 'success' : passRate >= 88 ? 'processing' : passRate >= 80 ? 'notice' : 'reject';

const load = async (): Promise<void> => {
  rows.value = await platformApi.getVendorPerformance(quarter.value);
};

const onExport = (): void => {
  ElMessage.info('演示环境不生成真实文件，正式环境将导出履约报表');
};

onMounted(load);
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.quarter-select {
  width: 140px;
}

.perf-card {
  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__name {
    color: var(--color-text-title);
    font-size: 16px;
    font-weight: 600;
  }

  &__meta {
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 16px;
  }
}

.perf-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__label {
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  &__value {
    color: var(--color-text-title);
    font-size: 18px;
    font-weight: 600;

    &.is-danger {
      color: var(--color-danger);
    }
  }
}

@media (max-width: 1400px) {
  .perf-card__metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>