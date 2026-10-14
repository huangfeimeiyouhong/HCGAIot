<!--
  P-08b 工单详情（平台方只读视角）
  平台方对工单只有「查看 + 标记争议」权限（PRD Q6），
  因此本页不含接单 / 处理 / 验收 / 评价等写操作入口，仅呈现只读信息与争议标记。
-->
<template>
  <PageContainer
    v-if="order"
    :title="`工单 ${order.code}`"
    :desc="order.description"
  >
    <template #extra>
      <StatusBadge :status="order.status" />
      <el-button @click="router.back()">
        返回列表
      </el-button>
    </template>

    <DemoTipBar />

    <el-alert
      class="readonly-alert"
      type="info"
      :closable="false"
      show-icon
      title="平台方为只读视角"
      description="平台不参与工单处理，仅可查看全过程记录；如认定责任不清，可「标记争议」进入仲裁流程。"
    />

    <el-alert
      v-if="order.disputeFlag"
      class="readonly-alert"
      type="warning"
      :closable="false"
      show-icon
      title="本工单已被标记为争议"
      description="该工单已进入仲裁流程，可在「争议仲裁」中查看判定结果与处理进度。"
    />

    <!-- 工单进度时间轴 -->
    <section class="card">
      <h3 class="section-title">
        工单进度
      </h3>
      <TimelineSteps
        :records="bundle.timeline"
        :current="order.status"
        :steps="workOrderSteps"
      />
    </section>

    <!-- 工单信息 + 关联方信息 -->
    <section class="detail-grid">
      <div class="card">
        <h3 class="section-title">
          工单信息
        </h3>
        <DescList
          :items="orderItems"
          :columns="2"
        />
      </div>
      <div class="card">
        <h3 class="section-title">
          关联设备与客户 / 厂家
        </h3>
        <DescList
          :items="assetItems"
          :columns="2"
        />
      </div>
    </section>

    <!-- 平台方唯一可执行动作：标记争议 -->
    <section class="card">
      <div class="dispute-head">
        <div>
          <h3 class="section-title">
            平台介入
          </h3>
          <p class="dispute-desc">
            仅在责任认定不清、双方对处理结果存在分歧时标记争议。标记后工单进入仲裁流程，需填写争议原因。
          </p>
        </div>
        <el-button
          type="danger"
          plain
          :disabled="Boolean(order.disputeFlag)"
          @click="disputeVisible = true"
        >
          {{ order.disputeFlag ? '已标记争议' : '标记争议' }}
        </el-button>
      </div>
    </section>

    <!-- 处理进展 -->
    <section class="card">
      <h3 class="section-title">
        处理进展（{{ bundle.progress.length }} 条）
      </h3>
      <el-timeline v-if="bundle.progress.length">
        <el-timeline-item
          v-for="p in bundle.progress"
          :key="p.id"
          :timestamp="formatDateTime(p.time)"
          placement="top"
        >
          <p class="progress-content">
            {{ p.content }}
          </p>
          <p class="progress-meta">
            操作人：{{ p.operator }}
          </p>
        </el-timeline-item>
      </el-timeline>
      <EmptyState
        v-else
        text="暂无进展记录"
        desc="厂家处理过程中会多次更新进展，此处实时同步"
      />
    </section>

    <!-- 备件更换记录 -->
    <section class="card">
      <h3 class="section-title">
        备件更换记录（{{ bundle.spareParts.length }} 条）
      </h3>
      <DataTable
        v-if="bundle.spareParts.length"
        :data="bundle.spareParts"
        :columns="spareColumns"
        :loading="false"
        row-key="id"
      />
      <EmptyState
        v-else
        text="本次维修未登记备件更换"
      />
    </section>

    <!-- 变更留痕（append-only，只追加不覆盖） -->
    <section class="card">
      <h3 class="section-title">
        流转留痕（{{ bundle.timeline.length }} 条）
      </h3>
      <el-timeline v-if="bundle.timeline.length">
        <el-timeline-item
          v-for="t in bundle.timeline"
          :key="t.id"
          :timestamp="formatDateTime(t.time)"
          placement="top"
        >
          <strong>{{ t.action }}</strong>
          <p class="progress-meta">
            {{ t.operator }} · {{ t.remark || '无备注' }}
          </p>
        </el-timeline-item>
      </el-timeline>
      <EmptyState
        v-else
        text="暂无流转记录"
      />
    </section>

    <!-- 标记争议（必填原因） -->
    <ConfirmDialog
      v-model="disputeVisible"
      title="标记工单争议"
      :message="`标记后工单 ${order.code} 将进入仲裁流程，由平台仲裁专员判定责任。请填写争议原因。`"
      require-reason
      reason-label="争议原因"
      reason-placeholder="请填写争议原因（必填），如：双方对故障责任认定不一致"
      tone="danger"
      @confirm="onMarkDispute"
    />
  </PageContainer>

  <PageContainer v-else>
    <el-skeleton :rows="8" animated />
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformOrderDetail">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue';
import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DescList from '@/components/data/DescList.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';
import TimelineSteps from '@/components/data/TimelineSteps.vue';

import { WORK_ORDER_STEPS } from '@/constants/stateMachine';
import { PROBLEM_TYPE_LABEL } from '@/constants/dict';
import { PRIORITY_LABEL } from '@/constants/sla';
import { formatDateTime } from '@/utils/date';

import { platformApi } from '@/api/platform';

import type {
  Device,
  ProgressRecord,
  SparePart,
  TimelineRecord,
  WorkOrder,
} from '@/types';

const route = useRoute();
const router = useRouter();

const workOrderSteps = WORK_ORDER_STEPS;

const detail = ref<{
  order: WorkOrder & { deviceName: string; customerName: string; vendorName: string };
  timeline: TimelineRecord[];
  device: Device | null;
  progress: ProgressRecord[];
  spareParts: SparePart[];
} | null>(null);

const order = computed(() => detail.value?.order ?? null);
/** 模板内已由 v-if="order" 包裹，这里给出非空视图对象简化模板类型收窄 */
const bundle = computed(() => detail.value!);

const disputeVisible = ref(false);

/** 工单信息条目 */
const orderItems = computed(() => {
  const o = order.value;
  if (!o) return [];
  return [
    { label: '工单编号', value: o.code },
    {
      label: '工单来源',
      value: o.source === 'ALARM_TRANSFER' ? '告警转单' : o.source === 'CUSTOMER_REPAIR' ? '客户报修' : '厂家发起',
    },
    { label: '问题类型', value: PROBLEM_TYPE_LABEL[o.problemType] ?? o.problemType },
    { label: '优先级', value: PRIORITY_LABEL[o.priority] ?? o.priority },
    { label: '创建时间', value: formatDateTime(o.createdAt) },
    {
      label: 'SLA 时限',
      value: `接单 ${o.sla.acceptHours}h / 处理 ${o.sla.handleHours}h / 验收 ${o.sla.confirmHours}h`,
    },
    { label: 'SLA 截止', value: formatDateTime(o.deadlineAt) },
    { label: '验收驳回次数', value: `${o.rejectCount} 次` },
    { label: '争议标记', value: o.disputeFlag ? '已标记' : '未标记' },
  ];
});

/** 关联方条目 */
const assetItems = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return [
    { label: '关联设备', value: d.order.deviceName },
    { label: '设备 SN', value: d.order.deviceSn },
    { label: '设备品类', value: d.device?.category ?? '—' },
    { label: '设备状态', value: d.device?.status ?? '—' },
    { label: '报修客户', value: d.order.customerName },
    { label: '责任厂家', value: d.order.vendorName },
  ];
});

/** 备件表列 */
const spareColumns: DataTableColumn[] = [
  { prop: 'name', label: '备件名称', minWidth: 140 },
  { prop: 'spec', label: '规格', minWidth: 120 },
  { prop: 'quantity', label: '数量', width: 80, align: 'right', type: 'number' },
  {
    prop: 'oldPartRecycled',
    label: '旧件回收',
    width: 100,
    render: (row) => (row.oldPartRecycled ? '已回收' : '未回收'),
  },
  {
    prop: 'createdAt',
    label: '登记时间',
    width: 160,
    render: (row) => formatDateTime(row.createdAt as string),
  },
];

/** 加载详情 */
const load = async (): Promise<void> => {
  try {
    detail.value = await platformApi.getWorkOrderDetail(route.params.id as string);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载工单失败');
    void router.replace('/platform/work-orders');
  }
};

/** 标记争议（平台方唯一可执行的工单动作） */
const onMarkDispute = async (reason: string): Promise<void> => {
  const o = order.value;
  if (!o) return;
  try {
    await platformApi.markDispute(o.code, reason);
    ElMessage.success('已标记争议，工单进入仲裁流程');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '标记争议失败');
  }
};

onMounted(load);
</script>

<style scoped lang="scss">
.readonly-alert {
  margin-bottom: var(--layout-card-gap);
}

.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);

  .card {
    margin-bottom: 0;
  }
}

.section-title {
  margin-bottom: 12px;
  color: var(--color-text-title);
  font-size: 15px;
  font-weight: 600;
}

.dispute-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dispute-desc {
  max-width: 640px;
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.8;
}

.progress-content {
  color: var(--color-text-body);
  font-size: 13px;
  line-height: 1.8;
}

.progress-meta {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
