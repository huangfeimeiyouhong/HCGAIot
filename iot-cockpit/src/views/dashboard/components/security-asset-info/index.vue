<template>
  <PanelCard
    title="资产信息"
  >
    <div class="security-asset-info">
      <StatCard
        v-for="item in data.stats"
        :key="item.label"
        :label="item.label"
        :value="item.value"
        :unit="item.unit"
      />
    </div>
  </PanelCard>
</template>

<script setup lang="ts" name="SecurityAssetInfo">
import { computed } from 'vue';

import { getAssetInfoData } from '../../situation-data';
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

const data = computed(() => getAssetInfoData({ city: props.city || undefined, gridOrgId: props.gridOrgId || undefined }));
</script>

<style lang="scss" scoped>
.security-asset-info {
  height: 100%;
  display: flex;
  gap: 8px;
}
</style>
