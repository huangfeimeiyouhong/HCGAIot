<!--
  C-09 绑定确认 —— 客户视角（断点二主链路：客户确认/拒绝绑定）
  列表展示待客户确认的责任厂家绑定，含 7 天自动确认倒计时；确认即生效，拒绝须填原因。
-->
<template>
  <PageContainer
    title="绑定确认"
    desc="厂家为您申报了责任绑定关系，请核对设备与厂家信息后确认。7 天内未操作将自动确认生效。"
  >
    <DemoTipBar />

    <el-alert
      class="tip-alert"
      type="info"
      :closable="false"
      show-icon
      title="关于 7 天自动确认"
      description="为保障售后责任清晰，申报后 7 天内若您未操作，系统将自动确认该绑定关系生效。如信息有误，请务必在到期前点击「拒绝绑定」。"
    />

    <!-- 待确认绑定列表 -->
    <section
      v-if="loading"
      class="card"
    >
      <el-skeleton :rows="6" animated />
    </section>

    <section
      v-else-if="list.length"
      class="card"
    >
      <DataTable
        :data="list"
        :columns="columns"
        :loading="false"
        row-key="id"
      />
    </section>

    <section
      v-else
      class="card"
    >
      <EmptyState
        text="暂无待确认的绑定"
        desc="当厂家为您申报责任绑定关系时，会出现在这里等待您确认"
      />
    </section>

    <!-- 确认绑定 -->
    <ConfirmDialog
      v-model="confirmVisible"
      title="确认绑定关系"
      :message="current ? `确认设备「${current.deviceName}」由厂家「${current.vendorName}」承担责任？确认后该绑定关系立即生效。` : ''"
      tone="success"
      @confirm="onConfirm"
    />

    <!-- 拒绝绑定（必填原因） -->
    <ConfirmDialog
      v-model="rejectVisible"
      title="拒绝绑定关系"
      :message="current ? `拒绝后厂家需重新申报。请填写拒绝原因，便于厂家修正信息。` : ''"
      require-reason
      reason-label="拒绝原因"
      reason-placeholder="请填写拒绝原因（必填），如：厂家信息不符 / 设备不属于该厂家"
      tone="danger"
      @confirm="onReject"
    />
  </PageContainer>
</template>

<script setup lang="ts" name="CustomerBindingConfirm">
import { h, onMounted, ref } from 'vue';
import { ElButton, ElMessage } from 'element-plus';

import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue';
import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { BINDING_TYPE_LABEL } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';

import { customerApi } from '@/api/customer';

import type { PendingBindingView, StatusTone } from '@/types';

const list = ref<PendingBindingView[]>([]);
const loading = ref(false);
const confirmVisible = ref(false);
const rejectVisible = ref(false);
const current = ref<PendingBindingView | null>(null);
const submitting = ref(false);

/** 表格列 */
const columns: DataTableColumn[] = [
  { prop: 'deviceName', label: '设备名称', minWidth: 140 },
  { prop: 'deviceSn', label: '设备 SN', width: 150 },
  { prop: 'deviceModel', label: '型号', width: 120 },
  { prop: 'vendorName', label: '申报厂家', width: 140 },
  {
    prop: 'type',
    label: '绑定类型',
    width: 110,
    render: (row) => BINDING_TYPE_LABEL[row.type as string] ?? row.type,
  },
  { prop: 'declaredBy', label: '申报人', width: 110 },
  {
    prop: 'declaredAt',
    label: '申报时间',
    width: 160,
    render: (row) => formatDateTime(row.declaredAt as string),
  },
  {
    prop: 'remainDays',
    label: '自动确认倒计时',
    width: 140,
    align: 'center',
    render: (row) => {
      const days = Number(row.remainDays);
      // ≤2 天进入临期警示（notice 橙），否则保持等待色（waiting 琥珀）
      const tone: StatusTone = days <= 2 ? 'notice' : 'waiting';
      return h(StatusBadge, { status: undefined, label: `剩 ${days} 天`, tone });
    },
  },
  {
    prop: 'actions',
    label: '操作',
    width: 150,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'row-actions' }, [
        h(
          ElButton,
          { link: true, type: 'success', onClick: (e: Event) => { e.stopPropagation(); openConfirm(row as PendingBindingView); } },
          '确认',
        ),
        h(
          ElButton,
          { link: true, type: 'danger', onClick: (e: Event) => { e.stopPropagation(); openReject(row as PendingBindingView); } },
          '拒绝',
        ),
      ]),
  },
];

/** 加载待确认绑定 */
const load = async (): Promise<void> => {
  loading.value = true;
  try {
    list.value = await customerApi.getPendingBindings();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载失败');
  } finally {
    loading.value = false;
  }
};

const openConfirm = (row: PendingBindingView): void => {
  current.value = row;
  confirmVisible.value = true;
};

const openReject = (row: PendingBindingView): void => {
  current.value = row;
  rejectVisible.value = true;
};

/** 确认绑定生效 */
const onConfirm = async (): Promise<void> => {
  if (!current.value) return;
  submitting.value = true;
  try {
    await customerApi.confirmBinding(current.value.id, true);
    ElMessage.success('绑定关系已确认生效');
    confirmVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '确认失败');
  } finally {
    submitting.value = false;
  }
};

/** 拒绝绑定 */
const onReject = async (reason: string): Promise<void> => {
  if (!current.value) return;
  submitting.value = true;
  try {
    await customerApi.confirmBinding(current.value.id, false, reason);
    ElMessage.success('已拒绝该绑定，厂家将重新申报');
    rejectVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '拒绝失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(load);
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.tip-alert {
  margin-bottom: var(--layout-card-gap);
}

.row-actions {
  display: flex;
  gap: 8px;
}
</style>
