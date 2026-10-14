<template>
  <PanelCard title="应急预案">
    <div class="emergency-plan">
      <Pie3dPanel
        class="emergency-plan__panel"
        :data="data.pie"
        :colors="PLAN_COLORS"
      >
        <template #label>
          <div class="emergency-plan__panel-label">
            预案数量
          </div>
        </template>
        <template #center>
          <div class="emergency-plan__center-value">
            {{ data.pieTotal }}
          </div>
        </template>
      </Pie3dPanel>
      <SubTitle title="年度演练排名">
        <SectionTab
          :tabs="rankingTabs"
          :active-tab="activeTab"
          @tab-change="handleTabChange"
        />
      </SubTitle>
      <ScreenTable
        class="emergency-plan__table"
        :columns="columns"
        :data="tableData"
        :header-height="30"
        :row-height="32"
      />
    </div>
  </PanelCard>
</template>

<script setup lang="ts" name="EmergencyPlan">
import { computed, ref } from 'vue';

import { getPlanData } from '../../situation-data';

import type { ScreenTableColumn } from '@/components/screen-table/index.vue';
import type { SectionTabItem } from '@/components/section-tab/index.vue';

import PanelCard from '@/components/panel-card/index.vue';
import Pie3dPanel from '@/components/pie-3d-panel/index.vue';
import ScreenTable from '@/components/screen-table/index.vue';
import SectionTab from '@/components/section-tab/index.vue';
import SubTitle from '@/components/sub-title/index.vue';

/** 设计稿图例三色:蓝综合/青专项/紫现场 */
const PLAN_COLORS = ['#0194F6', '#00E8F0', '#877EFF'];

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

const data = computed(() => getPlanData({ city: props.city || undefined, gridOrgId: props.gridOrgId || undefined }));

const rankingTabs: SectionTabItem[] = [
  { label: '公司', value: 'company' },
  { label: '项目', value: 'project' },
];

const activeTab = ref('company');

const handleTabChange = (value: string) => {
  activeTab.value = value;
};

const COMPANY_COLUMNS: ScreenTableColumn[] = [
  {
    prop: 'rank',
    label: '排名',
    width: 48,
  },
  {
    prop: 'company',
    label: '所属公司',
  },
  {
    prop: 'rate',
    label: '演练率',
    width: 60,
  },
];

const PROJECT_COLUMNS: ScreenTableColumn[] = [
  {
    prop: 'rank',
    label: '排名',
    width: 48,
  },
  {
    prop: 'project',
    label: '所属项目',
  },
  {
    prop: 'count',
    label: '演练次数',
    width: 80,
  },
];

const columns = computed(() => (activeTab.value === 'company' ? COMPANY_COLUMNS : PROJECT_COLUMNS));

const tableData = computed(() => (activeTab.value === 'company' ? data.value.ranking : data.value.projectRanking));
</script>

<style lang="scss" scoped>
.emergency-plan {
  height: 100%;
  display: flex;
  flex-direction: column;

  :deep(.sub-title) {
    margin-top: 12px;
  }

  // label 插槽定位在饼图上方 -22px;底座发光向下溢出 ~18px 由下方间距吸收
  &__panel {
    flex: 0 0 auto;
    margin: 12px 0 8px;
    height: auto;
    gap: 28px;
  }

  &__panel-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.3;
  }

  &__center-value {
    font-size: 20px;
    font-weight: 600;
    font-family: 'DIN', sans-serif;
    color: #fff;
    line-height: 1.2;
  }

  &__table {
    flex: 1;
    min-height: 0;
    margin-top: 8px;
  }
}
</style>
