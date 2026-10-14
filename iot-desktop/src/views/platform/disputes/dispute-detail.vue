<!--
  P-11b 仲裁详情 —— 举证区 + SLA 判定 + 判定表单
-->
<template>
  <PageContainer
    v-if="dispute"
    :title="`仲裁详情 · ${dispute.id}`"
    :desc="dispute.type"
  >
    <template #extra>
      <StatusBadge
        v-if="dispute.verdict"
        :status="dispute.verdict"
      />
      <el-tag
        v-else
        type="warning"
        effect="plain"
      >待判定</el-tag>
      <el-button @click="router.back()">返回列表</el-button>
    </template>

    <DemoTipBar />

    <section class="card">
      <h3 class="section-title">
        争议概要
      </h3>
      <DescList
        :items="summaryItems"
        :columns="2"
      />
    </section>

    <section class="card">
      <h3 class="section-title">
        双方举证
      </h3>
      <el-table
        :data="dispute.evidence"
        border
      >
        <el-table-column
          prop="side"
          label="举证方"
          width="120"
        >
          <template #default="{ row }">
            {{ sideLabel(row.side) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="fileName"
          label="文件"
          min-width="240"
        >
          <template #default="{ row }">
            <span
              class="file-link"
              @click="onPreview(row.fileName)"
            >{{ row.fileName }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="time"
          label="提交时间"
          width="170"
        >
          <template #default="{ row }">
            {{ formatDateTime(row.time) }}
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="card">
      <h3 class="section-title">
        SLA 计时判定
      </h3>
      <p class="sla-text">
        {{ dispute.slaJudgement }}
      </p>
    </section>

    <section
      v-if="order"
      class="card"
    >
      <h3 class="section-title">
        关联工单摘要
      </h3>
      <DescList
        :items="orderItems"
        :columns="2"
      />
    </section>

    <section class="card">
      <h3 class="section-title">
        仲裁判定
      </h3>
      <el-form
        :model="form"
        label-width="90px"
      >
        <el-form-item label="判定结果">
          <el-radio-group v-model="form.verdict">
            <el-radio label="VENDOR_BREACH">厂家违约</el-radio>
            <el-radio label="CUSTOMER_CAUSE">客户原因</el-radio>
            <el-radio label="NEGOTIATED">协商解决</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="判定说明">
          <el-input
            v-model="form.note"
            type="textarea"
            :rows="3"
            placeholder="请填写判定依据"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="submitting"
            @click="onSubmit"
          >
            提交判定
          </el-button>
        </el-form-item>
      </el-form>
    </section>
  </PageContainer>

  <PageContainer v-else>
    <el-skeleton :rows="8" animated />
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformDisputeDetail">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DescList from '@/components/data/DescList.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { labelOf } from '@/constants/statusMap';
import { PROBLEM_TYPE_LABEL } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';

import { platformApi } from '@/api';

import type { Dispute, DisputeVerdict, WorkOrder } from '@/types';

const route = useRoute();
const router = useRouter();

const dispute = ref<Dispute | null>(null);
const order = ref<WorkOrder | null>(null);
const submitting = ref(false);

const form = reactive<{ verdict: DisputeVerdict | undefined; note: string }>({
  verdict: undefined,
  note: '',
});

const summaryItems = computed(() => {
  const d = dispute.value;
  if (!d) return [];
  return [
    { label: '争议编号', value: d.id },
    { label: '关联工单', value: d.orderCode },
    { label: '争议类型', value: d.type },
    { label: '发起方', value: d.raisedBy === 'CUSTOMER' ? '客户' : '厂家' },
    { label: '发起时间', value: formatDateTime(d.createdAt) },
    { label: '仲裁专员', value: d.operator ?? '未指派' },
    ...(d.verdict ? [{ label: '判定结果', value: labelOf(d.verdict) }] : []),
    ...(d.verdictTime ? [{ label: '判定时间', value: formatDateTime(d.verdictTime) }] : []),
    ...(d.verdictNote ? [{ label: '判定说明', value: d.verdictNote, span: 2 }] : []),
  ];
});

const orderItems = computed(() => {
  const o = order.value;
  if (!o) return [];
  return [
    { label: '工单编号', value: o.code },
    { label: '设备 SN', value: o.deviceSn },
    { label: '问题类型', value: PROBLEM_TYPE_LABEL[o.problemType] ?? o.problemType },
    { label: '优先级', value: labelOf(o.priority) },
    { label: '当前状态', value: labelOf(o.status) },
    { label: '验收驳回次数', value: `${o.rejectCount} 次` },
  ];
});

const sideLabel = (side: string): string =>
  side === 'CUSTOMER' ? '客户' : side === 'VENDOR' ? '厂家' : '平台';

const onPreview = (fileName: string): void => {
  ElMessage.info(`演示环境不提供真实文件预览：${fileName}`);
};

const onSubmit = async (): Promise<void> => {
  if (!dispute.value || !form.verdict) {
    ElMessage.warning('请选择判定结果');
    return;
  }
  submitting.value = true;
  try {
    const updated = await platformApi.judgeDispute(dispute.value.id, {
      verdict: form.verdict,
      note: form.note,
    });
    dispute.value = updated;
    ElMessage.success('判定已提交');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  const id = route.params.id as string;
  try {
    const res = await platformApi.getDisputeDetail(id);
    dispute.value = res.dispute;
    order.value = res.order;
    form.verdict = res.dispute.verdict;
    form.note = res.dispute.verdictNote ?? '';
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载争议失败');
    void router.replace('/platform/disputes');
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

.file-link {
  color: var(--color-primary-text);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.sla-text {
  padding: 12px 14px;
  border-radius: 4px;
  background: var(--color-fill-light);
  color: var(--color-text-body);
  font-size: 13px;
  line-height: 1.8;
}
</style>