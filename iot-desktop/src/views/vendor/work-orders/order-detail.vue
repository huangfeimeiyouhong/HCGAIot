<!--
  V-11 工单详情 —— 接单 / 多次进展 / 反馈含备件登记（工单闭环核心页）
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

    <!-- 升级提示 -->
    <EscalationAlert
      :level="order.escalationLevel"
      :countdown="countdown"
    />

    <el-alert
      v-if="order.rejectCount > 3"
      class="platform-alert"
      type="error"
      :closable="false"
      :title="`客户已驳回 ${order.rejectCount} 次，需平台介入`"
      description="驳回次数超过 3 次，建议联系平台仲裁专员共同处理。"
    />

    <section class="card">
      <div class="order-head">
        <h3 class="section-title">
          工单进度
        </h3>
        <SlaCountdown
          :deadline-at="order.deadlineAt"
          :level="order.escalationLevel"
        />
      </div>
      <TimelineSteps
        :records="bundle.timeline"
        :current="order.status"
        :steps="workOrderSteps"
      />
    </section>

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
          设备档案
        </h3>
        <DescList
          :items="deviceItems"
          :columns="2"
        />
      </div>
    </section>

    <!-- 状态机驱动的动作按钮组 -->
    <section class="card">
      <h3 class="section-title">
        可执行操作
      </h3>
      <div
        v-if="actions.length"
        class="order-actions"
      >
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
      <el-alert
        v-else
        type="info"
        :closable="false"
        title="该工单已到终态，无可执行操作"
      />
    </section>

    <!-- 进展记录（可多次添加） -->
    <section class="card">
      <div class="order-head">
        <h3 class="section-title">
          处理进展（{{ bundle.progress.length }} 条）
        </h3>
        <el-button
          v-if="order.status === 'IN_PROGRESS'"
          type="primary"
          plain
          size="small"
          @click="openProgress"
        >
          更新进展
        </el-button>
      </div>

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
            {{ p.operator }}
          </p>
        </el-timeline-item>
      </el-timeline>
      <EmptyState
        v-else
        text="暂无进展记录"
        desc="接单后可多次更新进展，客户详情页会同步看到"
      />
    </section>

    <!-- 备件记录 -->
    <section class="card">
      <h3 class="section-title">
        备件更换记录（{{ bundle.spareParts.length }} 条）
      </h3>
      <SparePartTable :parts="bundle.spareParts" />
    </section>

    <!-- 现场照片 -->
    <section
      v-if="order.attachments?.length"
      class="card"
    >
      <h3 class="section-title">
        现场照片
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

    <!-- 历史告警速览 -->
    <section
      v-if="bundle.deviceAlarms.length"
      class="card"
    >
      <h3 class="section-title">
        该设备历史告警（近 {{ bundle.deviceAlarms.length }} 条）
      </h3>
      <DataTable
        :data="bundle.deviceAlarms"
        :columns="alarmColumns"
        row-key="id"
        max-height="300"
      />
    </section>

    <!-- 接单弹窗 -->
    <AcceptDialog
      v-model="acceptVisible"
      :order-code="order.code"
      @accepted="onAccepted"
    />

    <!-- 更新进展 -->
    <FormDialog
      v-model="progressVisible"
      title="更新处理进展"
      :model="progressForm"
      :loading="submitting"
      confirm-text="提交进展"
      @confirm="onSubmitProgress"
    >
      <el-form-item label="进展内容">
        <el-input
          v-model="progressForm.content"
          type="textarea"
          :rows="4"
          placeholder="如：工程师已到场，正在拆卸故障部件"
        />
      </el-form-item>
      <el-form-item label="附件">
        <UploadField v-model="progressForm.attachments" />
      </el-form-item>
    </FormDialog>

    <!-- 反馈处理结果 -->
    <FormDialog
      v-model="feedbackVisible"
      title="反馈处理结果"
      width="720"
      :model="feedbackForm"
      :loading="submitting"
      confirm-text="提交并转待验收"
      @confirm="onSubmitFeedback"
    >
      <el-form-item label="处理过程说明">
        <el-input
          v-model="feedbackForm.content"
          type="textarea"
          :rows="3"
          placeholder="必填：如已更换温控器与加热管，设备恢复正常"
        />
      </el-form-item>
      <el-form-item label="备件登记">
        <SparePartTable
          :parts="parts"
          editable
          @update:parts="parts = $event"
        />
      </el-form-item>
      <el-form-item label="现场照片">
        <UploadField v-model="feedbackForm.attachments" />
      </el-form-item>
    </FormDialog>

    <!-- 归档确认 -->
    <ConfirmDialog
      v-model="archiveVisible"
      title="确认归档关闭"
      message="归档后工单状态变为「已关闭」，整页转为只读。确认归档？"
      tone="warning"
      @confirm="onArchive"
    />
  </PageContainer>

  <PageContainer v-else>
    <el-skeleton :rows="8" animated />
  </PageContainer>
</template>

<script setup lang="ts" name="VendorWorkOrderDetail">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import AcceptDialog from './components/AcceptDialog.vue';
import EscalationAlert from './components/EscalationAlert.vue';
import ProgressForm from './components/ProgressForm.vue';
import SparePartTable from './components/SparePartTable.vue';
import SlaCountdown from './components/SlaCountdown.vue';

import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue';
import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DescList from '@/components/data/DescList.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FormDialog from '@/components/form/FormDialog.vue';
import NoImagePlaceholder from '@/components/feedback/NoImagePlaceholder.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';
import TimelineSteps from '@/components/data/TimelineSteps.vue';
import UploadField from '@/components/form/UploadField.vue';

import { WORK_ORDER_STEPS, actionsOf } from '@/constants/stateMachine';
import { DEVICE_CATEGORY_OPTIONS, PROBLEM_TYPE_LABEL } from '@/constants/dict';
import { PRIORITY_LABEL } from '@/constants/sla';
import { formatCountdown, formatDateOnly, formatDateTime } from '@/utils/date';
import { useAuthStore } from '@/store/auth';

import { vendorApi } from '@/api/vendor';

import type { Alarm, Attachment, Device, ProgressRecord, SparePart, StateAction, TimelineRecord, WorkOrder } from '@/types';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const workOrderSteps = WORK_ORDER_STEPS;

const detail = ref<{
  order: WorkOrder;
  timeline: TimelineRecord[];
  device: Device;
  deviceAlarms: Alarm[];
  progress: ProgressRecord[];
  spareParts: SparePart[];
} | null>(null);

const order = computed(() => detail.value?.order ?? null);
/** 模板内已由 v-if="order" 包裹，这里给出非空视图对象简化模板类型收窄 */
const bundle = computed(() => detail.value!);
const countdown = computed(() => formatCountdown(detail.value?.order.deadlineAt));

const acceptVisible = ref(false);
const progressVisible = ref(false);
const feedbackVisible = ref(false);
const archiveVisible = ref(false);
const submitting = ref(false);

const progressForm = reactive<{ content: string; attachments: Attachment[] }>({ content: '', attachments: [] });
const feedbackForm = reactive<{ content: string; attachments: Attachment[] }>({ content: '', attachments: [] });
const parts = ref<SparePart[]>([]);

const actions = computed<StateAction[]>(() =>
  order.value ? actionsOf('WORK_ORDER', order.value.status, auth.role ?? 'VENDOR') : [],
);

const orderItems = computed(() => {
  const o = order.value;
  if (!o) return [];
  return [
    { label: '工单编号', value: o.code },
    { label: '工单来源', value: o.source === 'ALARM_TRANSFER' ? '告警转单' : o.source === 'CUSTOMER_REPAIR' ? '客户报修' : '厂家发起' },
    { label: '设备 SN', value: o.deviceSn },
    { label: '问题类型', value: PROBLEM_TYPE_LABEL[o.problemType] ?? o.problemType },
    { label: '优先级', value: PRIORITY_LABEL[o.priority] ?? o.priority },
    { label: '客户租户', value: o.customerId },
    { label: '创建时间', value: formatDateTime(o.createdAt) },
    { label: 'SLA 时限', value: `接单 ${o.sla.acceptHours}h / 处理 ${o.sla.handleHours}h / 验收 ${o.sla.confirmHours}h` },
    { label: '验收驳回次数', value: `${o.rejectCount} 次` },
    ...(o.acceptRemark ? [{ label: '接单说明', value: o.acceptRemark }] : []),
    ...(o.etaAt ? [{ label: '预计到场', value: formatDateTime(o.etaAt) }] : []),
    ...(o.rating ? [{ label: '客户评价', value: `${o.rating.score} 分 · ${o.rating.comment}` }] : []),
  ];
});

const deviceItems = computed(() => {
  const d = detail.value?.device;
  if (!d) return [];
  return [
    { label: '设备名称', value: d.name },
    { label: '型号', value: d.modelCode },
    { label: '品类', value: DEVICE_CATEGORY_OPTIONS.find((c) => c.value === d.category)?.label ?? d.category },
    { label: '安装位置', value: d.location },
    { label: '出厂日期', value: formatDateOnly(d.manufactureDate) },
    { label: '质保期至', value: formatDateOnly(d.warrantyUntil) },
  ];
});

const alarmColumns: DataTableColumn[] = [
  { prop: 'id', label: '告警编号', width: 140 },
  { prop: 'type', label: '类型', width: 110 },
  {
    prop: 'level',
    label: '等级',
    width: 90,
    render: (row) => h(StatusBadge, { status: row.level as string }),
  },
  {
    prop: 'actualValue',
    label: '实测值',
    width: 110,
    align: 'right',
    render: (row) => `${row.actualValue ?? '-'} ${row.unit ?? ''}`,
  },
  {
    prop: 'triggerTime',
    label: '触发时间',
    width: 150,
    render: (row) => formatDateTime(row.triggerTime as string),
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
];

const load = async (): Promise<void> => {
  try {
    detail.value = await vendorApi.getWorkOrderDetail(route.params.id as string);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载工单失败');
    void router.replace('/vendor/work-orders');
  }
};

const onActionClick = (action: StateAction): void => {
  switch (action.key) {
    case 'accept':
      acceptVisible.value = true;
      break;
    case 'addProgress':
      openProgress();
      break;
    case 'submitFeedback':
      feedbackForm.content = '';
      feedbackForm.attachments = [];
      parts.value = [];
      feedbackVisible.value = true;
      break;
    case 'archive':
      archiveVisible.value = true;
      break;
    default:
      ElMessage.info(`该动作「${action.label}」需由对应角色执行`);
  }
};

/** 打开「更新进展」弹窗 */
const openProgress = (): void => {
  progressForm.content = '';
  progressForm.attachments = [];
  progressVisible.value = true;
};

const onAccepted = async (): Promise<void> => {
  ElMessage.success('接单成功，状态变更为「处理中」');
  await load();
};

const onSubmitProgress = async (): Promise<void> => {
  if (!progressForm.content.trim()) {
    ElMessage.warning('请填写进展内容');
    return;
  }
  submitting.value = true;
  try {
    await vendorApi.addProgress(order.value!.code, { ...progressForm });
    ElMessage.success('进展已提交');
    progressVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交失败');
  } finally {
    submitting.value = false;
  }
};

const onSubmitFeedback = async (): Promise<void> => {
  if (!feedbackForm.content.trim()) {
    ElMessage.warning('请填写处理过程说明（必填）');
    return;
  }
  submitting.value = true;
  try {
    await vendorApi.submitFeedback(order.value!.code, {
      content: feedbackForm.content,
      spareParts: parts.value,
      attachments: feedbackForm.attachments,
    });
    ElMessage.success('反馈已提交，状态变更为「待验收」，等待客户确认');
    feedbackVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交失败');
  } finally {
    submitting.value = false;
  }
};

const onArchive = async (): Promise<void> => {
  ElMessage.success('工单已归档关闭');
  // 归档动作走状态机（COMPLETED → CLOSED），此处由演示脚本驱动，工单已完成的直接提示
  await load();
};

onMounted(load);
void ProgressForm;
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

.order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.order-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.platform-alert {
  margin-bottom: var(--layout-card-gap);
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
}
</style>