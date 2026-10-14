<template>
  <PanelCard
    title="隐患治理"
  >
    <template #action>
      <LinkTag
        text="隐患台账"
        @click="goLedger"
      />
    </template>
    <div class="security-hazard">
      <div class="security-hazard__stats">
        <StatCard
          v-for="item in data.stats"
          :key="`t-${item.label}`"
          :label="item.label"
          :value="item.value"
          :unit="item.unit"
        />
      </div>
      <div class="security-hazard__stats security-hazard__stats--major">
        <StatCard
          v-for="item in data.majorStats"
          :key="`m-${item.label}`"
          :label="item.label"
          :value="item.value"
          :unit="item.unit"
        />
      </div>
      <SwitchTab
        v-model="activeCategory"
        :options="tabOptions"
      />
      <div class="security-hazard__tree">
        <HiTree
          :data="treeData"
          :indent="0"
          default-expand-all
        >
          <template #default="{ node, level }">
            <span
              v-if="level === 0"
              class="security-hazard__company"
            >{{ node.label }}</span>
            <div
              v-else
              class="hazard-card"
            >
              <div class="hazard-card__head">
                <span class="hazard-card__title">{{ node.title }}</span>
                <span class="hazard-card__status">{{ node.status }}</span>
              </div>
              <div class="hazard-card__meta">
                {{ node.device }} | {{ node.location }} | {{ node.time }}
              </div>
            </div>
          </template>
          <template #actions="{ node, level }">
            <LinkTag
              v-if="level > 0"
              text="应急指挥调度"
              show-icon
              @click="handleDispatch(node)"
            />
          </template>
        </HiTree>
      </div>
    </div>

    <!-- 任务调度弹窗(挂 body,不受面板缩放容器限制) -->
    <DispatchDialog ref="dispatchDialogRef" />
  </PanelCard>
</template>

<script setup lang="ts" name="SecurityHazard">
import { computed, ref, watch } from 'vue';

import { useRouter } from 'vue-router';

import { getHazardData } from '../../situation-data';
import DispatchDialog from '../dispatch-dialog/index.vue';
import LinkTag from '../link-tag/index.vue';
import StatCard from '../stat-card/index.vue';
import SwitchTab from '../switch-tab/index.vue';

import type { HazardItem } from '../../situation-data';
import type { TreeNodeData } from '@/components/tree/types';

import PanelCard from '@/components/panel-card/index.vue';
import HiTree from '@/components/tree/index.vue';
import { buildLedgerQuery } from '@/utils/ledger';

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

const data = computed(() => getHazardData({ city: props.city || undefined, gridOrgId: props.gridOrgId || undefined }));

const activeCategory = ref<string>('fire');

// 切换数据范围后,若当前 tab 不存在则回退到第一个
watch(data, (next) => {
  if (!next.categories.some((item) => item.value === activeCategory.value)) {
    activeCategory.value = next.categories[0]?.value ?? '';
  }
});

const categoryCount = (groups: { items: HazardItem[] }[]) =>
  groups.reduce((sum, group) => sum + group.items.length, 0);

const tabOptions = computed(() =>
  data.value.categories.map((category) => ({
    value: category.value,
    label: `${category.label}(${categoryCount(category.groups)})`,
  })),
);

const treeData = computed<TreeNodeData[]>(() => {
  const category = data.value.categories.find((item) => item.value === activeCategory.value);
  if (!category) return [];
  return category.groups.map((group) => ({
    id: `${category.value}-${group.company}`,
    label: `${group.company}(${group.items.length})`,
    children: group.items.map((item, index) => ({
      id: `${category.value}-${group.company}-${index}`,
      title: `${group.company}${item.name}`,
      device: item.device,
      location: item.location,
      time: item.time,
      status: item.status,
    })),
  }));
});

/** 应急指挥调度:打开任务调度弹窗(节点信息回显摘要) */
const dispatchDialogRef = ref<InstanceType<typeof DispatchDialog>>();

const handleDispatch = (node: TreeNodeData) => {
  dispatchDialogRef.value?.open({
    id: String(node.id ?? ''),
    title: (node.title as string) || '',
    device: node.device as string,
    location: node.location as string,
    time: node.time as string,
    status: node.status as string,
  });
};

const router = useRouter();

/** 跳转隐患台账页(省域/网格视角携带当前上下文,全国视角无参) */
const goLedger = () => {
  router.push({ path: '/ledger/index', query: { type: 'hazard', ...buildLedgerQuery(props.city, props.gridOrgId) } });
};
</script>

<style lang="scss" scoped>
.security-hazard {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__stats {
    display: flex;
    gap: 4px;
  }

  &__tree {
    flex: 1;
    min-height: 0;
    overflow-y: auto;

    // 叶子节点不显示占位箭头,卡片通宽
    :deep(.hi-tree-node__arrow--placeholder) {
      display: none;
    }

    :deep(.hi-tree-node__row) {
      // padding: 0;
    }
  }

  &__company {
    font-size: 12px;
    line-height: 20px;
    color: #ffffff;
  }
}

.hazard-card {
  box-sizing: border-box;
  width: 100%;
  padding: 6px 8px 6px 20px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__title {
    font-size: 10px;
    line-height: 16px;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__status {
    flex-shrink: 0;
    padding: 1px 6px;
    font-size: 10px;
    line-height: 14px;
    color: #ff6b5e;
    background: rgba(255, 77, 79, 0.12);
    border: 1px solid rgba(255, 107, 94, 0.55);
    border-radius: 2px;
  }

  &__meta {
    margin-top: 2px;
    font-size: 10px;
    line-height: 14px;
    color: rgba(255, 255, 255, 0.65);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
