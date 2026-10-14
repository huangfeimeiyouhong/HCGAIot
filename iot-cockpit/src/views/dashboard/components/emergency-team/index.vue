<template>
  <PanelCard
    title="应急队伍"
  >
    <div class="emergency-team">
      <div class="emergency-team__stats">
        <StatCard
          v-for="item in data.stats"
          :key="item.label"
          :label="item.label"
          :value="item.value"
          :unit="item.unit"
        />
      </div>
      <SubTitle
        class="emergency-team__subtitle"
        title="应急队伍"
      />
      <div class="emergency-team__table">
        <ScreenTable
          :columns="columns"
          :data="tableData"
          :header-height="28"
          :row-height="28"
          :font-size="10"
          :cell-padding="12"
        />
      </div>
    </div>
  </PanelCard>
</template>

<script setup lang="ts" name="EmergencyTeam">
import { computed } from 'vue';

import { getTeamData } from '../../situation-data';
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

const data = computed(() => getTeamData({ city: props.city || undefined, gridOrgId: props.gridOrgId || undefined }));

// 列宽对齐设计稿:145.6 / 166.6 / 65.8(总宽 378)
const columns: ScreenTableColumn[] = [
  {
    prop: 'company', label: '所属公司', width: '38.5%'
  },
  {
    prop: 'location', label: '所在位置', width: '44.1%'
  },
  { prop: 'status', label: '状态' },
];

const tableData = computed(() => data.value.teams);
</script>

<style lang="scss" scoped>
.emergency-team {
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
