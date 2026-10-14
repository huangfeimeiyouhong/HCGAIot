<!--
  数据隔离演示 —— 三角色可见范围对照表
  ⚠️ 数字由 mock/fixtures.ts 按当前 scope 规则实时算出，不是硬编码，改规则自动跟随
-->
<template>
  <div class="iso-page">
    <div class="iso-page__inner">
      <header class="iso-page__header">
        <h1 class="iso-page__title">
          数据隔离演示 · 三角色可见范围对照
        </h1>
        <p class="iso-page__subtitle">
          隔离由 <code>api → resolveScope(authStore) → scopedQuery</code> 三层管道强制执行，
          页面物理上拿不到全量数组引用。下面的条数是按当前规则实时算出的，改规则这里会自动跟着变。
        </p>
        <div class="iso-page__actions">
          <el-button @click="router.push('/demo/guide')">← 返回演示导览</el-button>
          <el-button
            text
            type="primary"
            @click="router.push('/')"
          >
            返回入口选择
          </el-button>
        </div>
      </header>

      <section class="card iso-table-card">
        <h2 class="iso-section-title">
          可见条数对照
        </h2>
        <el-table
          :data="rows"
          class="iso-table"
          border
        >
          <el-table-column
            prop="roleLabel"
            label="角色"
            width="140"
          />
          <el-table-column
            prop="account"
            label="演示账号"
            width="200"
          />
          <el-table-column label="顶栏数据范围徽标" min-width="200">
            <template #default="{ row }">
              <span
                class="iso-badge"
                :class="`iso-badge--${row.tone}`"
              >{{ row.badge }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="devices"
            label="可见设备"
            width="100"
            align="right"
          />
          <el-table-column
            prop="orders"
            label="可见工单"
            width="100"
            align="right"
          />
          <el-table-column
            prop="customers"
            label="可见客户"
            width="100"
            align="right"
          />
          <el-table-column
            prop="notes"
            label="字段处理"
            min-width="260"
          />
        </el-table>
      </section>

      <section class="card iso-rule-card">
        <h2 class="iso-section-title">
          隔离规则（mock/scope.ts 唯一实现点）
        </h2>
        <el-table
          :data="ruleRows"
          class="iso-table"
          border
        >
          <el-table-column
            prop="dim"
            label="维度"
            width="120"
          />
          <el-table-column
            prop="rule"
            label="规则"
            min-width="420"
          />
        </el-table>
      </section>

      <section class="card iso-probe-card">
        <h2 class="iso-section-title">
          越权防护实测
        </h2>
        <p class="iso-probe-desc">
          以客户账号 <code>cust_school_admin</code>（租户 {{ probeTenant }}）为例，
          它的可见设备集合里不包含 <code>{{ probeSn ?? '—' }}</code>。
          把这个 SN 填到设备详情地址栏访问，会被 <code>scopedFind</code> 的可见性校验拦下并返回空态。
        </p>
        <div class="iso-probe-actions">
          <el-button
            type="primary"
            plain
            :disabled="!probeSn"
            @click="tryProbe"
          >
            尝试越权访问 {{ probeSn }}
          </el-button>
          <el-button @click="router.push('/demo/guide')">回去看四条主链路</el-button>
        </div>
        <el-alert
          v-if="probeResult"
          class="iso-probe-result"
          :type="probeResult.type"
          :title="probeResult.title"
          :description="probeResult.desc"
          show-icon
          :closable="false"
        />
      </section>

      <section class="card iso-note-card">
        <h2 class="iso-section-title">
          为什么无权限按钮是「隐藏」而不是「置灰」
        </h2>
        <p class="iso-note">
          按 PRD 3.5 与 B3 约定 9：没有权限的操作按钮直接隐藏。
          置灰会让人误以为「点了就能用」，隐藏则明确表达「这个角色没有这个能力」。
          例如平台方工单管理页只有「标记争议」「导出」，没有「接单」——
          因为平台不代替厂家执行动作（PRD Q6）。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts" name="DemoIsolation">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { getIsolationMatrix, getIsolationProbeSn, ISOLATION_PROBE_TENANT } from '@/api/isolation';

const router = useRouter();

/** 探针租户 */
const probeTenant = ISOLATION_PROBE_TENANT;

/** 越权探测 SN（经 api 层取数） */
const probeSn = getIsolationProbeSn(probeTenant);

/** 探针结果 */
const probeResult = ref<{ type: 'success' | 'warning'; title: string; desc: string }>();

/** 对照表数据（来自 api 层，实时计算） */
const rows = computed(() => getIsolationMatrix());

/** 规则说明 */
const ruleRows = [
  { dim: '平台方', rule: 'visibleDeviceSns / visibleCustomerIds / visibleVendorIds 均为 null（不限）；maskFields = [contractNo, settlementAccount]' },
  { dim: '厂家', rule: 'visibleDeviceSns = {sn | ∃ACTIVE绑定.vendorId=本厂} ∪ {sn | 设备归属本厂}；visibleCustomerIds = {绑定到的客户}；visibleVendorIds = {本厂}' },
  { dim: '客户', rule: 'visibleDeviceSns = {sn | ∃绑定: customerId=本租户 ∧ type=OWNERSHIP ∧ status=ACTIVE}；stripFields = [firmwareVersion, cost, components.*]' },
  { dim: '行级过滤', rule: 'mock/query.ts 的 applyScopeFilter 是唯一的行过滤点：设备维度看 sn/deviceSn，客户维度看 customerId/ownerCustomerId/tenantId，厂家维度看 vendorIds/vendorId' },
  { dim: '越权防护', rule: 'scopedFind / scopedMutate 先做可见性校验再返回或修改，不可见一律返回 null / 抛错，杜绝「改 URL 看别人数据」' },
];

/** 尝试越权访问 */
const tryProbe = async (): Promise<void> => {
  if (!probeSn) return;
  // 跳到客户设备详情路由，带越权 SN；详情页 api 会抛「不在您的资产范围内」
  await router.push(`/customer/devices/${probeSn}`);
  probeResult.value = {
    type: 'warning',
    title: '已跳转到越权地址',
    desc: '若当前是客户账号，设备详情会显示空态或报错提示 —— 这正是 scopedFind 的可见性校验在起作用。若当前未登录，守卫会先把你送去登录页。',
  };
};
</script>

<style scoped lang="scss">
.iso-page {
  min-height: 100vh;
  padding: 40px 24px;
  background: var(--color-bg-page);

  &__inner {
    max-width: 1200px;
    margin: 0 auto;
  }

  &__header {
    margin-bottom: 24px;
  }

  &__title {
    color: var(--color-text-title);
    font-size: 26px;
    font-weight: 600;
  }

  &__subtitle {
    margin-top: 10px;
    color: var(--color-text-secondary);
    font-size: 14px;
    line-height: 1.7;

    code {
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--color-fill-light);
      color: var(--color-primary-text);
      font-size: 12px;
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }
}

.card {
  margin-bottom: 20px;
}

.iso-section-title {
  margin-bottom: 14px;
  color: var(--color-text-title);
  font-size: 16px;
  font-weight: 600;
}

.iso-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;

  &--warning {
    background: var(--badge-waiting-bg);
    color: var(--badge-waiting-text);
  }

  &--processing {
    background: var(--badge-processing-bg);
    color: var(--badge-processing-text);
  }

  &--info {
    background: var(--badge-info-bg);
    color: var(--badge-info-text);
  }
}

.iso-probe-desc,
.iso-note {
  color: var(--color-text-body);
  font-size: 13px;
  line-height: 1.8;

  code {
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--color-fill-light);
    color: var(--color-primary-text);
    font-size: 12px;
  }
}

.iso-probe-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.iso-probe-result {
  margin-top: 14px;
}
</style>