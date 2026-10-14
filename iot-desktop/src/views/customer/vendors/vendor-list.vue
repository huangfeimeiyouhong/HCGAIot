<!--
  C-10 厂家服务评价 —— 客户视角
  展示本租户可见责任厂家的履约评分，并支持对其工单提交服务评价。
-->
<template>
  <PageContainer
    title="厂家服务评价"
    desc="查看为您服务的责任厂家履约表现，可对已完成工单提交评价。"
  >
    <DemoTipBar />

    <section class="card">
      <DataTable
        :data="list"
        :columns="columns"
        :loading="loading"
        row-key="vendorId"
      />
      <EmptyState
        v-if="!loading && !list.length"
        text="暂无关联厂家"
        desc="待责任绑定确认生效后，为您服务的厂家会出现在此处"
      />
    </section>

    <!-- 评价弹窗 -->
    <el-dialog
      v-model="rateVisible"
      title="厂家服务评价"
      width="480"
      align-center
      append-to-body
    >
      <template v-if="current">
        <p class="rate-target">
          评价对象：<strong>{{ current.vendorName }}</strong>
        </p>
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
              placeholder="请对该厂家的维修服务进行评价"
            />
          </el-form-item>
        </el-form>
      </template>
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
</template>

<script setup lang="ts" name="CustomerVendorList">
import { h, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';

import { formatDateTime } from '@/utils/date';

import { customerApi } from '@/api/customer';

import type { VendorScoreView } from '@/types';

const list = ref<VendorScoreView[]>([]);
const loading = ref(false);
const rateVisible = ref(false);
const submitting = ref(false);
const current = ref<VendorScoreView | null>(null);
const rateForm = reactive<{ score: number; comment: string }>({ score: 5, comment: '' });

/** 表格列 */
const columns: DataTableColumn[] = [
  { prop: 'vendorName', label: '厂家名称', minWidth: 160 },
  {
    prop: 'avgResponse',
    label: '平均响应(h)',
    width: 120,
    align: 'right',
    type: 'number',
    render: (row) => (row.avgResponse ? `${row.avgResponse}h` : '—'),
  },
  {
    prop: 'onTimeRate',
    label: '准时率',
    width: 100,
    align: 'right',
    render: (row) => (row.onTimeRate ? `${Math.round(row.onTimeRate * 100)}%` : '—'),
  },
  {
    prop: 'myOrderCount',
    label: '我的工单数',
    width: 110,
    align: 'right',
    type: 'number',
  },
  {
    prop: 'myRating',
    label: '我的评分',
    width: 120,
    render: (row) => (row.myRating ? `${row.myRating} 分` : '未评价'),
  },
  {
    prop: 'actions',
    label: '操作',
    width: 100,
    fixed: 'right',
    render: (row) =>
      h(
        'el-button',
        { link: true, type: 'primary', onClick: (e: Event) => { e.stopPropagation(); openRate(row as VendorScoreView); } },
        '评价',
      ),
  },
];

/** 加载厂家评分 */
const load = async (): Promise<void> => {
  loading.value = true;
  try {
    list.value = await customerApi.getVendorScores();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载失败');
  } finally {
    loading.value = false;
  }
};

/** 打开评价弹窗 */
const openRate = (row: VendorScoreView): void => {
  current.value = row;
  rateForm.score = 5;
  rateForm.comment = '';
  rateVisible.value = true;
};

/** 提交评价 */
const onRate = async (): Promise<void> => {
  if (!current.value) return;
  if (!rateForm.comment.trim()) {
    ElMessage.warning('请填写评价内容');
    return;
  }
  submitting.value = true;
  try {
    await customerApi.submitVendorReview(current.value.vendorId, { score: rateForm.score, comment: rateForm.comment });
    ElMessage.success('评价已提交');
    rateVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '评价失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(load);

void formatDateTime;
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.rate-target {
  margin: 0 0 16px;
  color: var(--color-text-body);
  font-size: 14px;
}
</style>
