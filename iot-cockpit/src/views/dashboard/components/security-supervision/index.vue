<template>
  <PanelCard
    title="督办管理"
  >
    <template #action>
      <div class="security-supervision__tags">
        <HeaderTab
          v-model="activeTab"
          :options="TAB_OPTIONS"
        />
        <LinkTag
          text="督办台账"
          @click="goLedger"
        />
      </div>
    </template>
    <div class="security-supervision">
      <div class="security-supervision__stats">
        <StatCard
          v-for="item in data.stats"
          :key="item.label"
          :label="item.label"
          :value="item.value"
          :unit="item.unit"
        />
      </div>
      <SwitchTab
        v-model="activeCategory"
        :options="tabOptions"
      />
      <div class="security-supervision__tree">
        <HiTree
          :data="treeData"
          :indent="0"
          default-expand-all
        >
          <template #default="{ node, level }">
            <span
              v-if="level === 0"
              class="security-supervision__company"
            >{{ node.label }}</span>
            <div
              v-else
              class="supervision-card"
            >
              <div class="supervision-card__head">
                <span class="supervision-card__title">{{ node.title }}</span>
                <span class="supervision-card__overdue">{{ node.overdue }}</span>
              </div>
              <div class="supervision-card__meta">
                {{ node.hazard }} | {{ node.owner }} | {{ node.status }}
              </div>
            </div>
          </template>
        </HiTree>
      </div>
    </div>
  </PanelCard>
</template>

<script setup lang="ts" name="SecuritySupervision">
import { computed, ref, watch } from 'vue';

import { useRouter } from 'vue-router';

import { getSupervisionData } from '../../situation-data';
import HeaderTab from '../header-tab/index.vue';
import LinkTag from '../link-tag/index.vue';
import StatCard from '../stat-card/index.vue';
import SwitchTab from '../switch-tab/index.vue';

import type { SupervisionItem } from '../../situation-data';
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

const TAB_OPTIONS = [
  { value: 'major', label: '重大隐患' },
  { value: 'general', label: '一般隐患' },
];

const activeTab = ref('major');

const data = computed(() => getSupervisionData({ city: props.city || undefined, gridOrgId: props.gridOrgId || undefined }));

const activeCategory = ref<string>('overdue1');

// 切换数据范围后,若当前 tab 不存在则回退到第一个
watch(data, (next) => {
  if (!next.categories.some((item) => item.value === activeCategory.value)) {
    activeCategory.value = next.categories[0]?.value ?? '';
  }
});

const categoryCount = (groups: { items: SupervisionItem[] }[]) =>
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
      hazard: item.hazard,
      owner: item.owner,
      status: item.status,
      overdue: item.overdue,
    })),
  }));
});

const router = useRouter();

/** 跳转督办台账页(占位) */
const goLedger = () => {
  router.push({ path: '/ledger/index', query: { type: 'supervision', ...buildLedgerQuery(props.city, props.gridOrgId) } });
};
</script>

<style lang="scss" scoped>
.security-supervision {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__tags {
    display: flex;
    align-items: center;
    gap: 6px;
  }

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

.supervision-card {
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

  &__overdue {
    flex-shrink: 0;
    padding: 1px 6px;
    font-size: 10px;
    line-height: 14px;
    color: #ff9f40;
    background: rgba(255, 159, 64, 0.12);
    border: 1px solid rgba(255, 159, 64, 0.55);
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
