<template>
  <PanelCard
    title="自然灾害预警"
  >
    <div class="emergency-warning">
      <div class="emergency-warning__stats">
        <StatCard
          v-for="item in data.stats"
          :key="item.label"
          :label="item.label"
          :value="item.value"
          :unit="item.unit"
        />
      </div>
      <SubTitle
        class="emergency-warning__subtitle"
        title="灾害预警"
      />
      <div class="emergency-warning__table">
        <ScreenTable
          :columns="columns"
          :data="tableData"
          :header-height="32"
          :row-height="28"
          :font-size="10"
          :cell-padding="6"
        />
      </div>
    </div>
  </PanelCard>
</template>

<script setup lang="ts" name="EmergencyWarning">
import { computed } from 'vue';

import { getWarningData } from '../../situation-data';
import StatCard from '../stat-card/index.vue';

import PanelCard from '@/components/panel-card/index.vue';
import ScreenTable, { type ScreenTableColumn } from '@/components/screen-table/index.vue';
import SubTitle from '@/components/sub-title/index.vue';

interface Props {
  /** 省码,不传 = 全国 */
  city?: string;
  /** 网格 orgId */
  gridOrgId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  city: '',
  gridOrgId: '',
});

const data = computed(() => getWarningData({ city: props.city || undefined, gridOrgId: props.gridOrgId || undefined }));

const columns: ScreenTableColumn[] = [
  {
    prop: 'content', label: '灾害内容', width: '19%'
  },
  {
    prop: 'level', label: '灾害等级', width: '17%'
  },
  {
    prop: 'time', label: '预计发生时间', width: '33%'
  },
  { prop: 'location', label: '预计发生地点' },
];

const tableData = computed(() => data.value.warnings.map(row => ({
  ...row,
  time: `${row.time}时`,
})));
</script>

<style lang="scss" scoped>
.emergency-warning {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__stats {
    display: flex;
    gap: 6px;
  }

  &__table {
    flex: 1;
    min-height: 0;
  }
}
</style>
