<!--
  P-03 入驻审核详情 —— 四维度 + 状态流转按钮组（平台方最重页面）
  ★ 按钮组由 ONBOARDING_MACHINE 驱动，改状态机即全局同步
-->
<template>
  <PageContainer
    v-if="application"
    :title="`入驻审核 · ${application.id}`"
    :desc="application.vendorName"
  >
    <template #extra>
      <StatusBadge :status="application.status" />
      <el-button @click="router.back()">返回列表</el-button>
    </template>

    <DemoTipBar />

    <!-- 当前状态卡 + 时间轴 -->
    <section class="card status-card">
      <div class="status-card__head">
        <h3 class="section-title">
          审核进度
        </h3>
        <div class="status-card__hint">
          当前停留：<strong>{{ currentStepLabel }}</strong>
          <template v-if="application.stayDays">
            · 已停留 {{ application.stayDays }} 天
          </template>
        </div>
      </div>

      <TimelineSteps
        :records="timeline"
        :current="application.status"
        :steps="onboardingSteps"
      />

      <!-- 状态机驱动的按钮组 -->
      <div
        v-if="actions.length"
        class="status-card__actions"
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
        class="status-card__done"
        type="success"
        :closable="false"
        title="该申请已到终态，无可执行操作"
      />
    </section>

    <!-- 四维度审核卡 -->
    <section class="audit-grid">
      <AuditChecklistCard
        title="主体资质"
        :items="checklistByDimension('主体资质')"
      />
      <AuditChecklistCard
        title="产品能力"
        :items="checklistByDimension('产品能力')"
      />
      <AuditChecklistCard
        title="售后能力"
        :items="checklistByDimension('售后能力')"
      />
      <AuditChecklistCard
        title="商务条件"
        :items="checklistByDimension('商务条件')"
      />
    </section>

    <!-- 申请信息 + 材料 + 技术对接 + 商务条件 -->
    <section class="detail-grid">
      <div class="card">
        <h3 class="section-title">
          申请信息
        </h3>
        <DescList
          :items="basicItems"
          :columns="2"
        />
      </div>

      <div class="card">
        <h3 class="section-title">
          提交材料
        </h3>
        <MaterialPreview :attachments="application.attachments" />
      </div>
    </section>

    <section class="detail-grid">
      <div class="card">
        <h3 class="section-title">
          技术对接（复审阶段填写）
        </h3>
        <TechIntegrationForm
          v-model="techForm"
        />
      </div>

      <div class="card">
        <h3 class="section-title">
          商务条件确认
        </h3>
        <BusinessTermsForm
          v-model="slaForm"
        />
      </div>
    </section>

    <!-- 完整流转时间轴 -->
    <section class="card">
      <h3 class="section-title">
        流转记录（append-only，只读）
      </h3>
      <el-timeline>
        <el-timeline-item
          v-for="record in timeline"
          :key="record.id"
          :timestamp="formatDateTime(record.time)"
          placement="top"
        >
          <div class="tl-row">
            <strong>{{ record.action }}</strong>
            <StatusBadge
              v-if="record.toStatus"
              :status="record.toStatus"
              size="small"
            />
          </div>
          <div class="tl-meta">
            操作人：{{ record.operator }}
            <span v-if="record.fromStatus && record.toStatus">
              （{{ labelOf(record.fromStatus) }} → {{ labelOf(record.toStatus) }}）
            </span>
          </div>
          <div
            v-if="record.remark"
            class="tl-remark"
          >
            {{ record.remark }}
          </div>
        </el-timeline-item>
      </el-timeline>
    </section>

    <!-- 二次确认弹窗 -->
    <ConfirmDialog
      v-model="confirmVisible"
      :title="pendingAction?.confirm?.title ?? pendingAction?.label ?? '确认操作'"
      :message="confirmMessage"
      :require-reason="Boolean(pendingAction?.confirm?.requireReason)"
      reason-label="审核意见"
      :tone="pendingAction?.tone === 'danger' ? 'danger' : 'warning'"
      @confirm="onConfirm"
    />
  </PageContainer>

  <PageContainer v-else>
    <el-skeleton :rows="8" animated />
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformApplicationDetail">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import AuditChecklistCard from './components/AuditChecklistCard.vue';
import BusinessTermsForm from './components/BusinessTermsForm.vue';
import MaterialPreview from './components/MaterialPreview.vue';
import TechIntegrationForm from './components/TechIntegrationForm.vue';

import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DescList from '@/components/data/DescList.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';
import TimelineSteps from '@/components/data/TimelineSteps.vue';

import { ONBOARDING_STEPS, actionsOf, nodeOf, targetOf } from '@/constants/stateMachine';
import { labelOf } from '@/constants/statusMap';
import { VENDOR_TYPE_LABEL } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';

import { platformApi } from '@/api';

import type { AuditChecklistItem } from '@/api/platform';
import type { OnboardingAction } from '@/api/types';
import type { OnboardingApplication, Priority, SlaCommitment, StateAction, TimelineRecord } from '@/types';

const route = useRoute();
const router = useRouter();

const application = ref<OnboardingApplication | null>(null);
const timeline = ref<TimelineRecord[]>([]);
const checklist = ref<AuditChecklistItem[]>([]);

const confirmVisible = ref(false);
const pendingAction = ref<StateAction | null>(null);
const remark = ref('');

const techForm = reactive({
  protocol: '',
  fieldMapping: [] as Array<{ source: string; target: string }>,
  note: '',
});

const slaForm = reactive<Record<Priority, SlaCommitment>>({
  URGENT: { acceptHours: 0.5, handleHours: 4, confirmHours: 24 },
  HIGH: { acceptHours: 2, handleHours: 8, confirmHours: 48 },
  NORMAL: { acceptHours: 8, handleHours: 24, confirmHours: 72 },
  LOW: { acceptHours: 24, handleHours: 72, confirmHours: 168 },
});

/** 入驻 6 步渲染顺序 */
const onboardingSteps = ONBOARDING_STEPS;

/** 当前可用动作（状态机驱动，仅平台角色） */
const actions = computed<StateAction[]>(() =>
  application.value ? actionsOf('ONBOARDING', application.value.status, 'PLATFORM') : [],
);

/** 当前节点中文名 */
const currentStepLabel = computed(() =>
  application.value ? nodeOf('ONBOARDING', application.value.status).label : '',
);

/** 基础信息项 */
const basicItems = computed(() => {
  const a = application.value;
  if (!a) return [];
  return [
    { label: '申请编号', value: a.id },
    { label: '厂家名称', value: a.vendorName },
    { label: '厂家类型', value: VENDOR_TYPE_LABEL[a.vendorType] ?? a.vendorType },
    { label: '审核状态', value: labelOf(a.status) },
    { label: '主体名称', value: a.legalEntity },
    { label: '营业执照号', value: a.licenseNo },
    { label: '法人代表', value: a.legalPerson },
    { label: '注册地址', value: a.registeredAddress },
    { label: '工程师数量', value: `${a.engineerCount} 人` },
    { label: '服务半径', value: a.serviceRadius },
    { label: '备件仓', value: a.hasSpareWarehouse ? '有' : '无' },
    { label: '提交时间', value: formatDateTime(a.submitTime) },
    { label: '审核员', value: a.reviewer ?? '未分配' },
    ...(a.rectifyReason ? [{ label: '整改原因', value: a.rectifyReason, span: 2 }] : []),
    ...(a.rejectReason ? [{ label: '驳回原因', value: a.rejectReason, span: 2 }] : []),
  ];
});

/** 二次确认文案 */
const confirmMessage = computed(() => {
  const a = application.value;
  const act = pendingAction.value;
  if (!a || !act) return '';
  if (act.key === 'passPrimary') {
    return `确认「${a.vendorName}」通过初审？将进入待复审阶段，平台需填写技术对接与商务条件。`;
  }
  if (act.key === 'passSecondary') {
    return '确认通过复审？将进入试运营阶段（60 天）。';
  }
  if (act.key === 'confirmActive') {
    return '确认转为正式入驻？将解锁型号档案与子账号管理等能力。';
  }
  if (act.confirm?.requireReason) {
    return `确认执行「${act.label}」？该操作会变更申请状态，请填写原因（必填）。`;
  }
  return `确认执行「${act.label}」？`;
});

/** 按维度取审核检查项 */
function checklistByDimension(dimension: string): AuditChecklistItem[] {
  return checklist.value.filter((c) => c.dimension === dimension);
}

/** 点动作 → 需要原因的走 ConfirmDialog，其余直接执行 */
const onActionClick = (action: StateAction): void => {
  pendingAction.value = action;
  remark.value = '';
  if (action.confirm) {
    confirmVisible.value = true;
    return;
  }
  void doTransition(action);
};

/** ConfirmDialog 确认 */
const onConfirm = (reason: string): void => {
  if (!pendingAction.value) return;
  void doTransition(pendingAction.value, reason);
};

/** 执行状态流转 */
const doTransition = async (action: StateAction, reason = ''): Promise<void> => {
  const a = application.value;
  if (!a) return;
  const to = targetOf('ONBOARDING', action.key);
  if (!to) {
    ElMessage.error(`未定义的动作目标：${action.key}`);
    return;
  }
  try {
    const payload: Parameters<typeof platformApi.transitionApplication>[2] = { remark: reason };
    // 通过初审时带上技术对接与商务确认
    if (action.key === 'passPrimary') {
      payload.techIntegration = {
        protocol: techForm.protocol || 'MQTT/JSON v3.2',
        fieldMapping: techForm.fieldMapping.length ? techForm.fieldMapping : [{ source: 'deviceSn', target: 'device.sn' }],
        note: techForm.note,
      };
      payload.slaCommitment = slaForm.NORMAL;
    }
    const updated = await platformApi.transitionApplication(a.id, action.key as OnboardingAction, payload);
    application.value = updated;
    await loadTimeline();
    ElMessage.success(`${a.id} 已${action.label}，状态变更为「${labelOf(updated.status)}」`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '状态流转失败');
  }
};

/** 拉时间轴 */
const loadTimeline = async (): Promise<void> => {
  if (!application.value) return;
  const res = await platformApi.getApplicationDetail(application.value.id);
  timeline.value = res.timeline;
  checklist.value = res.checklist;
  const tech = res.application.techIntegration;
  if (tech) {
    techForm.protocol = tech.protocol;
    techForm.fieldMapping = [...tech.fieldMapping];
    techForm.note = tech.note ?? '';
  }
  slaForm.NORMAL = { ...res.application.slaCommitment };
};

/** 初始加载 */
onMounted(async () => {
  const id = route.params.id as string;
  try {
    const res = await platformApi.getApplicationDetail(id);
    application.value = res.application;
    timeline.value = res.timeline;
    checklist.value = res.checklist;
    const tech = res.application.techIntegration;
    if (tech) {
      techForm.protocol = tech.protocol;
      techForm.fieldMapping = [...tech.fieldMapping];
      techForm.note = tech.note ?? '';
    }
    slaForm.NORMAL = { ...res.application.slaCommitment };
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载入驻申请失败');
    void router.replace('/platform/review/applications');
  }
});
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.section-title {
  margin-bottom: 14px;
  color: var(--color-text-title);
  font-size: 15px;
  font-weight: 600;
}

.status-card {
  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }

  &__hint {
    color: var(--color-text-secondary);
    font-size: 13px;

    strong {
      color: var(--color-primary-text);
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding-top: 16px;
    margin-top: 8px;
    border-top: 1px solid var(--color-border-light);
  }

  &__done {
    margin-top: 12px;
  }
}

.audit-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.tl-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tl-meta {
  margin-top: 2px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.tl-remark {
  margin-top: 4px;
  color: var(--color-text-body);
  font-size: 13px;
}

@media (max-width: 1400px) {
  .audit-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .audit-grid,
  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>