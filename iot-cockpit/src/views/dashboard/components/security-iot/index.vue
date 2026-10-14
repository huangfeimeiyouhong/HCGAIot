<template>
  <PanelCard
    title="智慧物联"
  >
    <template #action>
      <div class="security-iot__tags">
        <HeaderTab
          v-model="deviceTab"
          :options="DEVICE_TABS"
        />
        <LinkTag
          text="设备台账"
          @click="goLedger"
        />
      </div>
    </template>
    <div class="security-iot">
      <div class="security-iot__stats">
        <StatCard
          v-for="item in stats"
          :key="item.label"
          :label="item.label"
          :value="item.value"
          :unit="item.unit"
        />
      </div>
      <div
        v-if="deviceTab === 'security'"
        class="security-iot__chart"
      >
        <SubTitle title="AI隐患分类">
          <HeaderTab
            v-model="categoryTab"
            :options="categoryTabs"
          />
        </SubTitle>
        <Pie3dPanel
          class="security-iot__pie"
          :data="pieData"
          unit="个"
        >
          <template #label>
            <div class="security-iot__pie-label">
              隐患总数
            </div>
          </template>
          <template #center>
            <div class="security-iot__pie-value">
              {{ pieTotal }}
            </div>
          </template>
        </Pie3dPanel>
      </div>
    </div>
  </PanelCard>
</template>

<script setup lang="ts" name="SecurityIot">
import { computed, ref, watch } from 'vue';

import { useRouter } from 'vue-router';

import { getMockDeviceOnlineInfo, getMockFireGroupOverview, getMockWorkOrderCategoryStat } from '../../iot-data';
import { IOT_FIRE_TAIL_STATS } from '../../situation-data';
import HeaderTab from '../header-tab/index.vue';
import LinkTag from '../link-tag/index.vue';
import StatCard from '../stat-card/index.vue';

import type { DeviceOnlineStatData, FireGroupOverviewData, WorkOrderCategoryStatData } from '../../iot-data';
import type { SituPieItem, SituStat } from '../../situation-data';

import PanelCard from '@/components/panel-card/index.vue';
import Pie3dPanel from '@/components/pie-3d-panel/index.vue';
import SubTitle from '@/components/sub-title/index.vue';
import { usePolling } from '@/hooks/use-polling';
import { parcelOrgIdsOf, scopeOrgIdOf } from '@/store/org';
import { formatThousand, formatValue, trimDecimalZeros } from '@/utils/format';
import { buildLedgerQuery } from '@/utils/ledger';
import { getCompanyByCityCode } from '@/views/dashboard/grid-data';

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

const DEVICE_TABS = [
  { value: 'security', label: '安防' },
  { value: 'fire', label: '消防' },
];

const deviceTab = ref('security');
const categoryTab = ref('all');

/** 视角组织 orgId(网格级 = 网格,省级 = 公司;公司无 adCode 时为空走空态) */
const scopeOrgId = computed(() => (props.gridOrgId
  || (props.city ? getCompanyByCityCode(props.city)?.orgId ?? '' : '')));

/** 视角范围内全量宗地 orgId */
const orgIds = computed(() => {
  if (!props.city) return parcelOrgIdsOf();
  return scopeOrgId.value ? parcelOrgIdsOf(scopeOrgId.value) : [];
});

/** 消防视角入参 orgId(全国 = 集团根节点,省域/网格 = 对应组织节点) */
const fireScopeOrgId = computed(() => {
  if (!props.city) return scopeOrgIdOf();
  return scopeOrgId.value ? scopeOrgIdOf(scopeOrgId.value) : '';
});

/** 设备数量/在线率/离线率(mock,安防 tab 摄像头口径) */
const deviceStat = ref<DeviceOnlineStatData | null>(null);

/** 消防设备三指标(mock) */
const fireOverview = ref<FireGroupOverviewData[] | FireGroupOverviewData | null>(null);

/** 消防组数据(回包为分组数组时取 name === '消防' 项) */
const fireData = computed<FireGroupOverviewData | null>(() =>
  Array.isArray(fireOverview.value)
    ? fireOverview.value.find((item) => item.name === '消防') ?? null
    : fireOverview.value);

/** AI识别隐患数/完结率/隐患分类统计(mock) */
const aiStat = ref<WorkOrderCategoryStatData | null>(null);

/** 快速切视角时丢弃过期响应 */
let deviceRequestSeq = 0;
let fireRequestSeq = 0;
let aiStatRequestSeq = 0;

/**
 * 拉设备三指标(mock)。isSilent = 轮询/补刷静默模式:不清旧值不闪空,失败保持原值;
 * 默认(视角切换)清空走空态过渡。接真实接口:换成 device-stat 请求,orgIds 直接作入参
 */
const fetchDeviceStat = async (isSilent = false) => {
  const seq = ++deviceRequestSeq;
  if (!isSilent) deviceStat.value = null;
  const ids = orgIds.value;
  if (!ids.length) return;
  try {
    const { data: result } = await getMockDeviceOnlineInfo(ids);
    if (seq === deviceRequestSeq) {
      deviceStat.value = result;
    }
  } catch {
    // 错误提示由请求层统一弹出,非静默保持空态/静默保持旧值
  }
};

const fetchFireOverview = async (isSilent = false) => {
  const seq = ++fireRequestSeq;
  if (!isSilent) fireOverview.value = null;
  const orgId = fireScopeOrgId.value;
  if (!orgId) return;
  try {
    const { data: result } = await getMockFireGroupOverview();
    if (seq === fireRequestSeq) {
      fireOverview.value = result;
    }
  } catch {
    // 静默保持旧值
  }
};

const fetchAiStat = async (isSilent = false) => {
  const seq = ++aiStatRequestSeq;
  if (!isSilent) aiStat.value = null;
  const ids = orgIds.value;
  if (!ids.length) return;
  try {
    const { data: result } = await getMockWorkOrderCategoryStat(ids);
    if (seq === aiStatRequestSeq) {
      aiStat.value = result;
    }
  } catch {
    // 静默保持旧值
  }
};

watch(orgIds, () => {
  fetchDeviceStat();
  fetchAiStat();
}, { immediate: true });
watch(fireScopeOrgId, fetchFireOverview, { immediate: true });

/** 静默刷新当前 tab 可见面板的数据(安防 = 设备 + AI 指标,消防 = 消防三指标) */
const refreshActiveTabStats = () => {
  if (deviceTab.value === 'fire') {
    void fetchFireOverview(true);
    return;
  }
  void fetchDeviceStat(true);
  void fetchAiStat(true);
};

// 切 tab 即补刷该 tab 口径(在场的值可能是停留另一 tab 期间的旧值)
watch(deviceTab, refreshActiveTabStats);

// 60s 静默轮询实时刷新(keep-alive 离场停表/回场补刷续表由 usePolling 管)
usePolling(refreshActiveTabStats, 1000 * 60);

/** 在线/离线率:接口 0~1 小数 → 一位小数百分数;空态显示 - */
const formatRate = (rate: number | null | undefined): string =>
  rate === null || rate === undefined ? '-' : formatThousand(rate * 100, { decimals: 1, round: true });

/** 消防在线/故障率:两位小数字符串去尾零显;设备总数 0 时率值无意义,按空态显示 - */
const fireRate = (rate: string | null | undefined): string => {
  const fire = fireData.value;
  if (!fire || Number(fire.equipNum) === 0 || rate === null || rate === undefined) return '-';
  return trimDecimalZeros(rate);
};

/** 安防 tab:设备 + AI 指标;消防 tab:消防三指标,尾部指标仍为 mock */
const stats = computed<SituStat[]>(() => {
  if (deviceTab.value === 'fire') {
    return [
      {
        label: '接入设备数量', value: formatValue(fireData.value?.equipNum), unit: '个'
      },
      {
        label: '设备在线率', value: fireRate(fireData.value?.onlineRate), unit: '%'
      },
      {
        label: '设备故障率', value: fireRate(fireData.value?.faultRate), unit: '%'
      },
      ...IOT_FIRE_TAIL_STATS,
    ];
  }
  return [
    {
      label: '接入设备数量', value: formatValue(deviceStat.value?.totalAmount), unit: '个'
    },
    {
      label: '设备在线率', value: formatRate(deviceStat.value?.onlineRate), unit: '%'
    },
    {
      label: 'AI识别隐患', value: formatValue(aiStat.value?.totalAmount), unit: '个'
    },
    {
      label: 'AI工单完结率', value: formatRate(aiStat.value?.finishRate), unit: '%'
    },
  ];
});

/** AI隐患分类 tab:全部 + 一级大类 */
const categoryTabs = computed(() => [
  { value: 'all', label: '全部' },
  ...(aiStat.value?.categoryList ?? []).map(node => ({ value: node.code, label: node.name })),
]);

/** 拉到新分类后,选中的大类已不存在时回落「全部」 */
watch(() => aiStat.value?.categoryList, (list) => {
  if (categoryTab.value !== 'all' && !list?.some(node => node.code === categoryTab.value)) {
    categoryTab.value = 'all';
  }
});

/** AI隐患分类环形图:全部 = 一级大类各自值;单选大类 = 其下二级分类(无二级回落自身) */
const pieData = computed<SituPieItem[]>(() => {
  const list = aiStat.value?.categoryList ?? [];
  if (categoryTab.value === 'all') {
    return list.map(node => ({ name: node.name, value: node.total }));
  }
  const node = list.find(item => item.code === categoryTab.value);
  if (!node) return [];
  const children = node.children?.length ? node.children : [node];
  return children.map(child => ({ name: child.name, value: child.total }));
});

/** 饼图中心数 = 当前扇区求和(与图例恒自洽,勿手填常量) */
const pieTotal = computed(() => pieData.value.reduce((sum, item) => sum + item.value, 0));

const router = useRouter();

/** 跳转设备台账页 */
const goLedger = () => {
  router.push({ path: '/ledger/index', query: { type: 'device', ...buildLedgerQuery(props.city, props.gridOrgId) } });
};
</script>

<style lang="scss" scoped>
.security-iot {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__tags {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px 6px;
  }

  &__chart {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__pie {
    flex: 1;
    min-height: 0;
    gap: 28px;
  }

  &__pie-label {
    font-size: 12px;
    color: rgb(255 255 255 / 80%);
    line-height: 1.3;
  }

  &__pie-value {
    font-size: 20px;
    font-weight: 600;
    font-family: 'DIN', sans-serif;
    color: #fff;
    line-height: 1.2;
  }
}
</style>
