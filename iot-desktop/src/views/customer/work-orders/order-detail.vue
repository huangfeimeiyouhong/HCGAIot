<!--
  C-08 工单详情 —— 客户视角（工单闭环核心页）
  含：进度时间轴 / 工单信息 / 验收区（客户验收通过·驳回，驳回必填原因）/
  处理进展 / 备件更换记录 / 现场照片 / 评价
-->
<template>
  <PageContainer
    v-if="order"
    :title="`工单 ${order.code}`"
    :desc="order.description"
  >
    <template #extra>
      <StatusBadge :status="order.status" />
      <el-button @click="router.back()">返回列表</el-button>
    </template>

    <DemoTipBar />

    <!-- 需要平台介入提示 -->
    <el-alert
      v-if="detail?.needPlatform"
      class="platform-alert"
      type="error"
      :closable="false"
      title="已多次驳回，建议转平台仲裁"
      :description="`本工单已被驳回 ${order.rejectCount} 次，超过阈值，建议联系平台仲裁专员共同处理。`"
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

    <!-- 工单信息 + 设备/厂家信息 -->
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
          关联设备与责任厂家
        </h3>
        <DescList
          :items="assetItems"
          :columns="2"
        />
      </div>
    </section>

    <!-- 验收区（断点一主链路：客户验收工单） -->
    <section
      v-if="order.status === 'PENDING_CONFIRM'"
      class="card accept-card"
    >
      <div class="accept-head">
        <div>
          <h3 class="section-title">
            验收确认
          </h3>
          <p class="accept-desc">
            厂家已反馈处理结果，请核对设备恢复情况后验收。验收通过即视为工单闭环；如未恢复可驳回，厂家将重新处理。
          </p>
        </div>
        <div class="accept-actions">
          <el-button
            type="success"
            @click="acceptVisible = true"
          >
            验收通过
          </el-button>
          <el-button
            type="danger"
            plain
            @click="rejectVisible = true"
          >
            验收驳回
          </el-button>
        </div>
      </div>
    </section>

    <!-- 状态机驱动的其他可执行操作（如已完成后的「评价」） -->
    <section
      v-if="order.status !== 'PENDING_CONFIRM' && actions.length"
      class="card"
    >
      <h3 class="section-title">
        可执行操作
      </h3>
      <div class="order-actions">
        <el-button
          v-for="action in actions"
          :key="action.key"
          :type="action.tone"
          :plain="action.tone !== 'primary'"
          @click="onActionClick(action)"
        >
          {{ action.label }}
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

    <!-- 现场照片 -->
    <section
      v-if="order.attachments?.length"
      class="card"
    >
      <h3 class="section-title">
        现场照片（{{ order.attachments.length }} 张）
      </h3>
      <div class="photos">
        <div
          v-for="a in order.attachments"
          :key="a.id"
          class="photo"
        >
          <NoImagePlaceholder
            :width="120"
            :height="90"
            :text="a.name"
          />
          <span class="photo-name">{{ a.name }}</span>
        </div>
      </div>
    </section>

    <!-- 验收通过确认 -->
    <ConfirmDialog
      v-model="acceptVisible"
      title="确认验收通过"
      message="验收通过后工单将闭环为「已完成」，您可在完成后对其进行服务评价。确认验收通过？"
      tone="success"
      @confirm="onAccept"
    />

    <!-- 验收驳回确认（必填原因） -->
    <ConfirmDialog
      v-model="rejectVisible"
      title="验收驳回"
      message="驳回后工单将退回厂家重新处理，请填写驳回原因以便厂家定位问题。"
      require-reason
      reason-label="驳回原因"
      reason-placeholder="请填写驳回原因（必填），如：设备仍未制冷 / 异响未消除"
      tone="danger"
      @confirm="onReject"
    />

    <!-- 评价弹窗 -->
    <el-dialog
      v-model="rateVisible"
      title="服务评价"
      width="480"
      align-center
      append-to-body
    >
      <el-form label-width="80px">
        <el-form-item label="评分">
          <el-rate
            v-model="rateForm.score"
            :max="5"
            show-score
            score-template="{value} 分"
          />
        </el-form-item>
        <el-form-item label="评价内容">
          <el-input
            v-model="rateForm.comment"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="请对本次维修服务进行评价"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rateVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="onRate"
        >
          提交评价
        </el-button>
      </template>
    </el-dialog>
  </PageContainer>

  <PageContainer v-else>
    <el-skeleton :rows="8" animated />
  </PageContainer>
</template>

<script setup lang="ts" name="CustomerOrderDetail">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue';
import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DescList from '@/components/data/DescList.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import NoImagePlaceholder from '@/components/feedback/NoImagePlaceholder.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';
import TimelineSteps from '@/components/data/TimelineSteps.vue';

import { WORK_ORDER_STEPS, actionsOf } from '@/constants/stateMachine';
import { PROBLEM_TYPE_LABEL } from '@/constants/dict';
import { PRIORITY_LABEL } from '@/constants/sla';
import { formatDateTime } from '@/utils/date';
import { useAuthStore } from '@/store/auth';

import { customerApi } from '@/api/customer';

import type {
  ProgressRecord,
  SparePart,
  StateAction,
  TimelineRecord,
  WorkOrder,
} from '@/types';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const workOrderSteps = WORK_ORDER_STEPS;

const detail = ref<{
  order: WorkOrder;
  timeline: TimelineRecord[];
  progress: ProgressRecord[];
  spareParts: SparePart[];
  deviceName: string;
  vendorName: string;
  needPlatform: boolean;
} | null>(null);

const order = computed(() => detail.value?.order ?? null);
/** 模板内已由 v-if="order" 包裹，这里给出非空视图对象简化模板类型收窄 */
const bundle = computed(() => detail.value!);

const acceptVisible = ref(false);
const rejectVisible = ref(false);
const rateVisible = ref(false);
const submitting = ref(false);

const rateForm = reactive<{ score: number; comment: string }>({ score: 5, comment: '' });

/** 状态机驱动的动作（客户视角：PENDING_CONFIRM → 验收通过/驳回；COMPLETED → 评价） */
const actions = computed<StateAction[]>(() =>
  order.value ? actionsOf('WORK_ORDER', order.value.status, auth.role ?? 'CUSTOMER') : [],
);

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
    { label: '验收驳回次数', value: `${o.rejectCount} 次` },
    { label: 'SLA 截止', value: formatDateTime(o.deadlineAt) },
    ...(o.rating ? [{ label: '我的评价', value: `${o.rating.score} 分 · ${o.rating.comment}` }] : []),
  ];
});

/** 设备与责任厂家条目 */
const assetItems = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return [
    { label: '关联设备', value: d.deviceName },
    { label: '设备 SN', value: order.value?.deviceSn ?? '—' },
    { label: '责任厂家', value: d.vendorName },
    { label: '状态', value: order.value?.status ?? '—' },
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
    detail.value = await customerApi.getWorkOrderDetail(route.params.id as string);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载工单失败');
    void router.replace('/customer/work-orders');
  }
};

/** 点击状态机动作 */
const onActionClick = (action: StateAction): void => {
  if (action.key === 'rate') {
    rateForm.score = 5;
    rateForm.comment = '';
    rateVisible.value = true;
    return;
  }
  ElMessage.info(`该动作「${action.label}」需由对应角色执行`);
};

/** 验收通过 */
const onAccept = async (): Promise<void> => {
  if (!order.value) return;
  submitting.value = true;
  try {
    await customerApi.acceptWorkOrder(order.value.code, { pass: true });
    ElMessage.success('验收通过，工单已闭环');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '验收失败');
  } finally {
    submitting.value = false;
  }
};

/** 验收驳回 */
const onReject = async (reason: string): Promise<void> => {
  if (!order.value) return;
  submitting.value = true;
  try {
    await customerApi.acceptWorkOrder(order.value.code, { pass: false, rejectReason: reason });
    ElMessage.success('已驳回，厂家将重新处理');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '驳回失败');
  } finally {
    submitting.value = false;
  }
};

/** 提交评价 */
const onRate = async (): Promise<void> => {
  if (!order.value) return;
  if (!rateForm.comment.trim()) {
    ElMessage.warning('请填写评价内容');
    return;
  }
  submitting.value = true;
  try {
    await customerApi.rateWorkOrder(order.value.code, { score: rateForm.score, comment: rateForm.comment });
    ElMessage.success('评价已提交，感谢您的反馈');
    rateVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '评价失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  void load();
  // 列表页带 ?rate=1 跳入时自动打开评价弹窗（仅已完成工单）
  if (route.query.rate === '1' && order.value?.status === 'COMPLETED') {
    rateForm.score = 5;
    rateForm.comment = '';
    rateVisible.value = true;
  }
});
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.section-title {
  color: var(--color-text-title);
  font-size: 15px;
  font-weight: 600;
}

.platform-alert {
  margin-bottom: var(--layout-card-gap);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.accept-card {
  border: 1px solid var(--color-primary-text);
  background: var(--color-primary-bg);
}

.accept-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.accept-desc {
  margin-top: 6px;
  max-width: 640px;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.accept-actions {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
}

.order-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.progress-content {
  color: var(--color-text-body);
  font-size: 13px;
  line-height: 1.7;
}

.progress-meta {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.photos {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.photo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.photo-name {
  color: var(--color-text-secondary);
  font-size: 12px;
}

@media (max-width: 1100px) {
  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .accept-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
