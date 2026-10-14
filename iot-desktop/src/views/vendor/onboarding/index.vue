<!--
  V-02 入驻申请 —— 未入驻创建 / 提交后锁定 / 整改 / 驳回 / 试运营转正
-->
<template>
  <PageContainer
    title="入驻申请"
    desc="厂家入驻申请的全流程：创建 → 提交 → 初审 → 复审 → 试运营 → 转正"
  >
    <DemoTipBar />

    <!-- 已有申请：状态卡 -->
    <section
      v-if="application"
      class="card status-card"
    >
      <div class="status-card__head">
        <h3 class="section-title">
          申请进度
        </h3>
        <div class="status-card__right">
          <span class="status-card__stay">
            已停留 <strong>{{ application.stayDays }}</strong> 天
          </span>
          <StatusBadge :status="application.status" />
        </div>
      </div>

      <TimelineSteps
        :records="timeline"
        :current="application.status"
        :steps="onboardingSteps"
      />

      <div class="status-card__hint">
        {{ statusHint }}
      </div>

      <!-- 整改 / 驳回分支 -->
      <RectifyNotice
        v-if="application.status === 'RECTIFY' && application.rectifyReason"
        :reason="application.rectifyReason"
      />

      <el-alert
        v-if="application.status === 'REJECTED' && application.rejectReason"
        class="status-card__reject"
        type="error"
        :closable="false"
        :title="`驳回原因：${application.rejectReason}`"
      />

      <div class="status-card__actions">
        <el-button
          v-if="application.status === 'RECTIFY'"
          type="primary"
          :loading="submitting"
          @click="onResubmit"
        >
          提交整改材料
        </el-button>
        <el-button
          v-if="application.status === 'REJECTED'"
          type="primary"
          :loading="submitting"
          @click="onRestart"
        >
          重新发起申请
        </el-button>
        <el-button
          v-if="application.status === 'DRAFT'"
          type="primary"
          :loading="submitting"
          @click="onSubmit"
        >
          提交审核
        </el-button>
        <el-tooltip
          v-if="application.status === 'TRIAL'"
          content="试运营期满后由平台在租户管理页确认转正"
        >
          <el-tag type="warning" effect="plain">等待平台确认转正</el-tag>
        </el-tooltip>
        <el-tag
          v-if="application.status === 'ACTIVE'"
          type="success"
          effect="plain"
        >
          已正式入驻
        </el-tag>
      </div>
    </section>

    <!-- 试运营说明 -->
    <section
      v-if="application?.status === 'TRIAL'"
      class="card trial-card"
    >
      <h3 class="section-title">
        试运营说明
      </h3>
      <p class="trial-card__text">{{ trialNotice?.text }}</p>
      <ul class="trial-card__points">
        <li>试运营期内可正常使用设备台账、绑定申报、告警响应与工单处理</li>
        <li>试运营不参与履约考核（履约画像页无数据）</li>
        <li>转正后解锁产品型号档案与子账号管理</li>
      </ul>
    </section>

    <!-- 表单区 -->
    <section class="card">
      <div class="form-head">
        <h3 class="section-title">
          申请信息
        </h3>
        <el-tag
          v-if="locked"
          type="info"
          effect="plain"
        >
          已提交，关键字段锁定
        </el-tag>
      </div>

      <StepForm
        :steps="steps"
        :model="form"
        :locked="locked"
        :submitting="submitting"
        @submit="onSubmit"
      >
        <template #default="{ stepKey }">
          <!-- 1 主体资质 -->
          <template v-if="stepKey === 'legal'">
            <el-form-item label="厂商名称">
              <el-input
                v-model="form.vendorName"
                :disabled="locked"
                placeholder="与营业执照一致"
              />
            </el-form-item>
            <el-form-item label="主体名称">
              <el-input
                v-model="form.legalEntity"
                :disabled="locked"
                placeholder="请输入主体全称"
              />
            </el-form-item>
            <el-form-item label="营业执照号">
              <el-input
                v-model="form.licenseNo"
                :disabled="locked"
                placeholder="统一社会信用代码"
              />
            </el-form-item>
            <el-form-item label="法人代表">
              <el-input
                v-model="form.legalPerson"
                :disabled="locked"
              />
            </el-form-item>
            <el-form-item label="注册地址">
              <el-input
                v-model="form.registeredAddress"
                :disabled="locked"
              />
            </el-form-item>
          </template>

          <!-- 2 产品能力 -->
          <template v-else-if="stepKey === 'product'">
            <el-form-item label="产品型号">
              <el-select
                v-model="selectedModels"
                :disabled="locked"
                class="full"
                multiple
                placeholder="选择已录入的产品型号"
              >
                <el-option
                  v-for="m in models"
                  :key="m.modelCode"
                  :label="`${m.modelCode} · ${m.name}`"
                  :value="m.modelCode"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="接入协议">
              <el-input
                :model-value="form.productModels[0]?.protocol ?? ''"
                disabled
                placeholder="由型号档案决定"
              />
            </el-form-item>
            <el-form-item label="附件">
              <UploadField
                v-if="!locked"
                v-model="form.attachments"
              />
              <div
                v-else
                class="locked-files"
              >
                <span
                  v-for="a in form.attachments"
                  :key="a.id"
                >{{ a.name }}</span>
              </div>
            </el-form-item>
          </template>

          <!-- 3 售后能力 -->
          <template v-else-if="stepKey === 'service'">
            <el-form-item label="工程师数量">
              <el-input-number
                v-model="form.engineerCount"
                :disabled="locked"
                :min="0"
                :max="500"
              />
              <span class="unit">人</span>
            </el-form-item>
            <el-form-item label="服务半径">
              <el-input
                v-model="form.serviceRadius"
                :disabled="locked"
                placeholder="如：50 公里"
              />
            </el-form-item>
            <el-form-item label="备件仓">
              <el-switch
                v-model="form.hasSpareWarehouse"
                :disabled="locked"
              />
              <span class="unit">是否有独立备件仓</span>
            </el-form-item>
          </template>

          <!-- 4 商务条件 -->
          <template v-else>
            <el-form-item label="SLA 接单">
              <el-input-number
                v-model="form.slaCommitment.acceptHours"
                :disabled="locked"
                :min="0.5"
                :step="0.5"
                :controls="false"
                size="small"
              />
              <span class="unit">小时</span>
            </el-form-item>
            <el-form-item label="SLA 处理">
              <el-input-number
                v-model="form.slaCommitment.handleHours"
                :disabled="locked"
                :min="1"
                :step="1"
                :controls="false"
                size="small"
              />
              <span class="unit">小时</span>
            </el-form-item>
            <el-form-item label="SLA 待验收">
              <el-input-number
                v-model="form.slaCommitment.confirmHours"
                :disabled="locked"
                :min="1"
                :step="1"
                :controls="false"
                size="small"
              />
              <span class="unit">小时</span>
            </el-form-item>
            <el-form-item label="SLA 预览">
              <span class="preview">{{ slaPreview }}</span>
            </el-form-item>
          </template>
        </template>
      </StepForm>
    </section>

    <!-- 流转记录 -->
    <section
      v-if="timeline.length"
      class="card"
    >
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
          <strong>{{ record.action }}</strong>
          <div class="tl-meta">
            {{ record.operator }}<template v-if="record.remark"> · {{ record.remark }}</template>
          </div>
        </el-timeline-item>
      </el-timeline>
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="VendorOnboarding">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import RectifyNotice from './components/RectifyNotice.vue';

import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';
import StepForm from '@/components/form/StepForm.vue';
import TimelineSteps from '@/components/data/TimelineSteps.vue';
import UploadField from '@/components/form/UploadField.vue';

import { ONBOARDING_STEPS } from '@/constants/stateMachine';
import { nodeOf } from '@/constants/stateMachine';
import { formatHours, PRIORITY_LABEL } from '@/constants/sla';
import { formatDateTime } from '@/utils/date';

import { vendorApi } from '@/api/vendor';

import type { OnboardingApplication, ProductModel, SlaCommitment } from '@/types';

/** 4 步定义 */
const steps = [
  { key: 'legal', title: '主体资质', description: '营业执照与法人信息' },
  { key: 'product', title: '产品能力', description: '型号与接入协议' },
  { key: 'service', title: '售后能力', description: '工程师与服务半径' },
  { key: 'business', title: '商务条件', description: 'SLA 时限承诺' },
];

const application = ref<OnboardingApplication | null>(null);
const timeline = ref<import('@/types').TimelineRecord[]>([]);
const models = ref<ProductModel[]>([]);
const selectedModels = ref<string[]>([]);
const submitting = ref(false);
const trialNotice = ref<{ days: number; text: string } | null>(null);

const form = reactive({
  vendorName: '',
  vendorType: 'COOKWARE' as 'COOKWARE' | 'IOT',
  legalEntity: '',
  licenseNo: '',
  legalPerson: '',
  registeredAddress: '',
  productModels: [] as ProductModel[],
  engineerCount: 0,
  serviceRadius: '50 公里',
  hasSpareWarehouse: false,
  slaCommitment: { acceptHours: 1, handleHours: 8, confirmHours: 36 } as SlaCommitment,
  attachments: [] as import('@/types').Attachment[],
});

const onboardingSteps = ONBOARDING_STEPS;

/** 锁定态：已提交或已驳回后字段只读 */
const locked = computed(() => {
  const s = application.value?.status;
  return Boolean(s && s !== 'DRAFT' && s !== 'RECTIFY');
});

/** 状态提示文案 */
const statusHint = computed(() => {
  const s = application.value?.status;
  if (!s) return '';
  const hints: Record<string, string> = {
    DRAFT: '当前为草稿，填写完成后点「提交审核」。提交后关键字段将锁定。',
    PENDING_PRIMARY: '已提交，等待平台初审。初审通过后进入复审阶段。',
    PENDING_SECONDARY: '初审已通过，等待平台复审（技术对接 + 商务确认）。',
    RECTIFY: '平台要求补充材料，请根据下方原因调整后重新提交。',
    REJECTED: '申请已被驳回，可修正后重新发起。',
    TRIAL: '已通过复审，进入试运营期。期满后由平台确认转正。',
    ACTIVE: '已正式入驻，可使用全部厂家能力。',
  };
  return hints[s] ?? '';
});

/** SLA 预览 */
const slaPreview = computed(() => {
  const s = form.slaCommitment;
  return `${PRIORITY_LABEL.NORMAL}：接单 ${formatHours(s.acceptHours)} / 处理 ${formatHours(s.handleHours)} / 待验收 ${formatHours(s.confirmHours)}`;
});

/** 拉申请 */
const load = async (): Promise<void> => {
  const app = await vendorApi.getMyOnboarding();
  application.value = app;
  if (app) {
    Object.assign(form, {
      vendorName: app.vendorName,
      vendorType: app.vendorType,
      legalEntity: app.legalEntity,
      licenseNo: app.licenseNo,
      legalPerson: app.legalPerson,
      registeredAddress: app.registeredAddress,
      productModels: [...app.productModels],
      engineerCount: app.engineerCount,
      serviceRadius: app.serviceRadius,
      hasSpareWarehouse: app.hasSpareWarehouse,
      slaCommitment: { ...app.slaCommitment },
      attachments: [...app.attachments],
    });
    selectedModels.value = app.productModels.map((m) => m.modelCode);
    timeline.value = await vendorApi.getOnboardingTimeline(app.id);
  }
};

/** 保存草稿并提交 */
const onSubmit = async (): Promise<void> => {
  submitting.value = true;
  try {
    // 同步选中的型号
    form.productModels = models.value.filter((m) => selectedModels.value.includes(m.modelCode));
    const saved = await vendorApi.saveOnboardingDraft({ ...form, productModels: form.productModels });
    const submitted = await vendorApi.submitOnboarding(saved.id);
    application.value = submitted;
    timeline.value = await vendorApi.getOnboardingTimeline(submitted.id);
    ElMessage.success('申请已提交，关键字段已锁定，等待平台初审');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交失败');
  } finally {
    submitting.value = false;
  }
};

/** 提交整改材料 */
const onResubmit = async (): Promise<void> => {
  if (!application.value) return;
  submitting.value = true;
  try {
    form.productModels = models.value.filter((m) => selectedModels.value.includes(m.modelCode));
    const updated = await vendorApi.resubmitRectify(application.value.id, { ...form });
    application.value = updated;
    timeline.value = await vendorApi.getOnboardingTimeline(updated.id);
    ElMessage.success('整改材料已提交，等待平台复审');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交失败');
  } finally {
    submitting.value = false;
  }
};

/** 重新发起 */
const onRestart = async (): Promise<void> => {
  if (!application.value) return;
  submitting.value = true;
  try {
    const updated = await vendorApi.restartOnboarding(application.value.id);
    application.value = updated;
    ElMessage.success('已重置为草稿，请修改后重新提交');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  await load();
  models.value = await vendorApi.getOwnedModels();
  trialNotice.value = await vendorApi.getTrialNotice();
  if (!application.value) {
    form.vendorName = '新建入驻申请';
  }
  void nodeOf;
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

.status-card {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__stay {
    color: var(--color-text-secondary);
    font-size: 13px;

    strong {
      color: var(--color-text-title);
      font-size: 15px;
    }
  }

  &__hint {
    padding: 10px 12px;
    margin-top: 12px;
    border-radius: 4px;
    background: var(--color-fill-light);
    color: var(--color-text-body);
    font-size: 13px;
    line-height: 1.7;
  }

  &__reject {
    margin-top: 12px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
  }
}

.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.trial-card {
  &__text {
    color: var(--color-text-body);
    font-size: 13px;
  }

  &__points {
    margin: 10px 0 0;
    padding-left: 20px;

    li {
      color: var(--color-text-secondary);
      font-size: 12px;
      line-height: 1.9;
    }
  }
}

.unit {
  margin-left: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.preview {
  color: var(--color-primary-text);
  font-size: 13px;
}

.full {
  width: 100%;
}

.locked-files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    padding: 3px 8px;
    border-radius: 3px;
    background: var(--color-fill-light);
    color: var(--color-text-body);
    font-size: 12px;
  }
}

.tl-meta {
  margin-top: 2px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>