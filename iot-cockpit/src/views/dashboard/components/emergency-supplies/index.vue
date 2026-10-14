<template>
  <PanelCard title="应急物资">
    <div class="emergency-supplies">
      <SubTitle title="应急物资分类分布" />
      <Pie3dPanel
        class="emergency-supplies__panel"
        :data="data.pie"
        :colors="SUPPLY_COLORS"
        unit="个"
      >
        <template #label>
          <div class="emergency-supplies__panel-label">
            应急物资
          </div>
        </template>
        <template #center>
          <div class="emergency-supplies__center-value">
            {{ data.pieTotal }}
          </div>
        </template>
      </Pie3dPanel>
      <SubTitle title="应急处置物资" />
      <ScreenTable
        class="emergency-supplies__table"
        :columns="columns"
        :data="data.table"
        :header-height="30"
        :row-height="32"
      />
    </div>
  </PanelCard>
</template>

<script setup lang="ts" name="EmergencySupplies">
import { computed } from 'vue';

import { getSuppliesData } from '../../situation-data';

import type { ScreenTableColumn } from '@/components/screen-table/index.vue';

import PanelCard from '@/components/panel-card/index.vue';
import Pie3dPanel from '@/components/pie-3d-panel/index.vue';
import ScreenTable from '@/components/screen-table/index.vue';
import SubTitle from '@/components/sub-title/index.vue';

/** 设计稿图例五色:蓝水泵/青沙袋/紫手电筒/橙担架/绿救生衣 */
const SUPPLY_COLORS = ['#0194F6', '#00E8F0', '#877EFF', '#FFA86E', '#43DF9D'];

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

const data = computed(() => getSuppliesData({ city: props.city || undefined, gridOrgId: props.gridOrgId || undefined }));

const columns: ScreenTableColumn[] = [
  {
    prop: 'company',
    label: '所属公司',
  },
  {
    prop: 'total',
    label: '物资总数',
    width: 80,
  },
  {
    prop: 'completion',
    label: '盘点完成情况',
    width: 100,
  },
];
</script>

<style lang="scss" scoped>
.emergency-supplies {
  height: 100%;
  display: flex;
  flex-direction: column;

  // pie-3d-panel 根元素自带 height:100%,列 flex 里 flex-basis 会被解析成整个剩余高,
  // 饼图/图例在超高容器内垂直居中(顶部大片空白)且把表格挤成 0 高——压回内容高(图例行数)。
  // 须写在父级 :deep(后代选择器),写在 __panel 内是同一元素永不匹配
  :deep(.pie-3d-panel) {
    height: auto;
    /* 设计稿:饼图右缘与图例面板间距 28px */
    gap: 28px;
  }

  // label 插槽定位在饼图上方 -22px;底座发光向下溢出 ~18px 由下方间距吸收
  &__panel {
    flex: 0 0 auto;
    margin: 12px 0 8px;
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
