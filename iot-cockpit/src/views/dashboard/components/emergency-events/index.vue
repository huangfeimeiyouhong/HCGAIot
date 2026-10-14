<template>
  <PanelCard title="事件统计">
    <div class="emergency-events">
      <div
        v-for="(row, index) in data.rows"
        :key="row.name"
        class="emergency-events__row"
      >
        <img
          class="emergency-events__icon"
          :src="ROW_ICONS[index] ?? ROW_ICONS[0]"
          alt=""
        >
        <StatCard
          :label="row.name"
          :value="row.total"
          unit="个"
        />
        <StatCard
          label="已闭环"
          :value="row.closed"
          unit="个"
        />
        <StatCard
          label="处置中"
          :value="row.handling"
          unit="个"
        />
        <StatCard
          label="未响应"
          :value="row.unresponsive"
          unit="个"
        />
      </div>
    </div>
  </PanelCard>
</template>

<script setup lang="ts" name="EmergencyEvents">
import { computed } from 'vue';

import icEms from '../../assets/ic-ems.png';
import icNature from '../../assets/ic-nature.png';
import icPm from '../../assets/ic-pm.png';
import icSecurity from '../../assets/ic-security.png';
import { getEmergencyStatusData } from '../../situation-data';
import StatCard from '../stat-card/index.vue';

import PanelCard from '@/components/panel-card/index.vue';

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

/** 行序与数据 rows 对应:自然灾害/资产管护/安全生产/生态环保 */
const ROW_ICONS = [icNature, icPm, icSecurity, icEms];

const data = computed(() => getEmergencyStatusData({ city: props.city || undefined, gridOrgId: props.gridOrgId || undefined }));
</script>

<style lang="scss" scoped>
.emergency-events {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.emergency-events__row {
  flex: 1;
  min-height: 0;
  position: relative;
  // 四列非均分:设计稿第一列(类目名)比后三列宽,列宽比 ≈ 1.52 : 1(以各列单位「个」x 锚点间距 105.4/69.3 实测)
  display: grid;
  grid-template-columns: 1.52fr 1fr 1fr 1fr;
  column-gap: 4px;
  align-items: center;
  // 左内边距放大给行首徽章图标让位
  padding-left: 60px;
  &::before {
    content: "";
    position: absolute;
    width: 180px;
    height: 50px;
    left: 40px;
    background-image: url('../../assets/emergency-row-bg.png');
    background-repeat: no-repeat;
    background-size: 100% 100%;
    top: 50%;
    transform: translateY(-50%);
    z-index: -1;
  }
}

.emergency-events__icon {
  position: absolute;
  left: 0;
  top: 50%;
  width: 62px;
  height: 72px;
  transform: translateY(-50%);
}
</style>
