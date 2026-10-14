<!--
  演示导览 —— 四条主链路一键跳转
-->
<template>
  <div class="demo-guide">
    <div class="demo-guide__inner">
      <header class="demo-guide__header">
        <h1 class="demo-guide__title">
          演示导览 · 四条主链路
        </h1>
        <p class="demo-guide__subtitle">
          按下面四条链路依次点击，可完整走通「入驻审核 / 绑定申报 / 工单闭环 / 数据隔离可见」。
          所有状态变更仅在当前页面内存生效，刷新即复位（符合 PRD P2-04）。
        </p>
        <el-button
          class="demo-guide__back"
          text
          @click="back"
        >
          ← 返回入口选择
        </el-button>
      </header>

      <section class="flow-list">
        <article
          v-for="flow in flows"
          :key="flow.no"
          class="flow-card"
        >
          <div class="flow-card__head">
            <span class="flow-card__no">{{ flow.no }}</span>
            <div class="flow-card__titles">
              <h2 class="flow-card__title">
                {{ flow.title }}
              </h2>
              <p class="flow-card__goal">
                {{ flow.goal }}
              </p>
            </div>
          </div>

          <ol class="flow-card__steps">
            <li
              v-for="(step, i) in flow.steps"
              :key="i"
              class="flow-card__step"
            >
              <span class="flow-card__step-no">{{ i + 1 }}</span>
              <div>
                <p class="flow-card__step-role">
                  {{ step.role }}
                </p>
                <p class="flow-card__step-action">
                  {{ step.action }}
                </p>
                <p class="flow-card__step-look">
                  看：{{ step.look }}
                </p>
              </div>
            </li>
          </ol>

          <div class="flow-card__accounts">
            <span class="flow-card__accounts-label">涉及账号：</span>
            <el-tag
              v-for="acc in flow.accounts"
              :key="acc"
              size="small"
              effect="plain"
            >
              {{ acc }}
            </el-tag>
          </div>

          <div class="flow-card__actions">
            <el-button
              size="small"
              @click="go(flow.entries[0]!)"
            >
              从入口开始：{{ flow.entries[0] }}
            </el-button>
            <el-button
              size="small"
              text
              type="primary"
              @click="go(flow.entries[1] ?? flow.entries[0]!)"
            >
              直接进：{{ flow.entries[1] ?? flow.entries[0] }}
            </el-button>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts" name="DemoGuide">
import { useRouter } from 'vue-router';

const router = useRouter();

/** 单步说明 */
interface FlowStep {
  role: string;
  action: string;
  look: string;
}

/** 链路定义 */
interface Flow {
  no: string;
  title: string;
  goal: string;
  steps: FlowStep[];
  accounts: string[];
  entries: string[];
}

const flows: Flow[] = [
  {
    no: '1',
    title: '入驻审核线：厂家入驻 → 平台审核',
    goal: '走通入驻申请 7 态中的初审 / 复审 / 驳回 / 整改分支',
    accounts: ['plat_admin / plat_reviewer', 'vendor_unbound（未入驻）'],
    entries: ['/vendor/onboarding', '/platform/review/applications'],
    steps: [
      { role: '厂家', action: '用 vendor_unbound 登录，落在「入驻申请」页，点「创建入驻申请」', look: '侧栏只有 2 项（工作台 + 入驻申请）' },
      { role: '厂家', action: '走完 4 步表单（主体资质 → 产品能力 → 售后能力 → 商务条件），点提交', look: '徽标变「待初审」，表单关键字段变灰锁定' },
      { role: '平台', action: 'plat_reviewer 登录 → 入驻审核 → 打开 ONB-2026-0001 → 点「通过初审」', look: '徽标变「待复审」，时间轴 +1' },
      { role: '平台', action: '同页点「标记整改」，不填原因点确定', look: '确定按钮 disabled，无法提交' },
      { role: '分支', action: 'ONB-2026-0003 可演示「整改分支」，ONB-2026-0005 演示「驳回分支」，ONB-2026-0007 演示「试运营 → 转正」', look: '7 态徽标各有一种色调' },
    ],
  },
  {
    no: '2',
    title: '绑定申报线：厂家申报 → 客户确认 → 生效',
    goal: '走通设备产权绑定的申报、客户确认与 7 天自动生效倒计时',
    accounts: ['vendor_ck_admin', 'cust_school_admin'],
    entries: ['/vendor/devices', '/customer/bindings'],
    steps: [
      { role: '厂家', action: '厨具厂家登录 → 设备清单，搜 CK-XA-2026-0001（故事线：无生效绑定）', look: '质保期至由型号策略自动算出且置灰' },
      { role: '厂家', action: '点「申报绑定」，选一个「不在服务范围内」的客户', look: '被阻断并提示「不在本厂家服务范围内」' },
      { role: '厂家', action: '改选服务范围内客户 → 提交', look: '状态变「待客户确认」，带 7 天倒计时' },
      { role: '客户', action: '福州一中食堂登录 → 绑定确认页', look: '待确认卡片显示「还剩 N 天」倒计时' },
      { role: '客户', action: '点「确认绑定」；另一条点「拒绝」不填原因', look: '确认后变「生效中」；拒绝按钮 disabled' },
    ],
  },
  {
    no: '3',
    title: '工单闭环线：告警 → 报修 → 接单 → 处理 → 验收 → 关闭',
    goal: '走通工单 5 态与备件记录、SLA 计时、验收驳回',
    accounts: ['vendor_ck_admin', 'cust_school_admin', 'plat_admin'],
    entries: ['/vendor/work-orders', '/vendor/work-orders/WO-2026-0031'],
    steps: [
      { role: '厂家', action: '厨具厂家登录 → 工单处理 → 打开 WO-2026-0031（告警转单、紧急）', look: 'SLA 倒计时显示「还剩 X 小时 Y 分」' },
      { role: '厂家', action: '点「接单」，不填接单说明点确定', look: '校验不通过，状态不变' },
      { role: '厂家', action: '填接单说明 + 预计到场时间 → 确认', look: '状态「处理中」，按钮组变 [更新进展][反馈结果]' },
      { role: '厂家', action: '点「更新进展」3 次', look: '进展列表 3 条记录，时间轴同步增长' },
      { role: '厂家', action: '点「反馈处理结果」：不填处理过程说明无法提交；填了 + 登记 1 条备件', look: '状态「待验收」，备件记录落库' },
      { role: '平台', action: 'plat_admin 登录 → 工单管理', look: '**只有「标记争议」「导出」两个按钮，无「接单」**（PRD Q6）' },
      { role: '客户', action: '客户账号 → 工单详情点「验收通过」；或「验收驳回」不填原因', look: '驳回后状态回「处理中」且驳回次数 +1' },
      { role: '归档', action: 'WO-2026-0009 已完成且距今 > 7 天', look: '可演示「归档关闭 → 已关闭」灰底只读' },
    ],
  },
  {
    no: '4',
    title: '数据隔离可见线：三端范围对照',
    goal: '让租户隔离可被「看见」——顶栏徽标 + 列表条数 + 越权拦截',
    accounts: ['plat_admin', 'vendor_ck_admin', 'cust_school_admin'],
    entries: ['/demo/isolation', '/platform/devices'],
    steps: [
      { role: '平台', action: 'plat_admin 登录，任意页面看顶栏', look: '徽标「全局（财务字段脱敏）」；租户详情合同号显示 ***' },
      { role: '厂家', action: '换 vendor_ck_admin 登录 → 设备清单', look: '徽标「本厂家全部设备」；表格条数 86 → 明显变少，且无其他厂家 SN' },
      { role: '客户', action: '换 cust_school_admin 登录 → 我的设备', look: '徽标「本租户全部数据」；无固件版本列、无成本列、无部件列' },
      { role: '越权', action: '把地址栏改成别的客户的设备 SN', look: '返回空态 / 404，scopedFind 已先校验可见性' },
    ],
  },
];

/** 跳转 */
const go = (path: string): void => {
  void router.push(path);
};

/** 返回入口 */
const back = (): void => {
  void router.push('/');
};
</script>

<style scoped lang="scss">
.demo-guide {
  min-height: 100vh;
  padding: 40px 24px;
  background: var(--color-bg-page);

  &__inner {
    max-width: 1100px;
    margin: 0 auto;
  }

  &__header {
    margin-bottom: 28px;
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
  }

  &__back {
    margin-top: 10px;
    padding: 0;
  }
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.flow-card {
  padding: 24px;
  background: var(--color-bg-container);
  border-radius: var(--layout-card-radius);
  box-shadow: var(--layout-card-shadow);

  &__head {
    display: flex;
    gap: 14px;
    margin-bottom: 18px;
  }

  &__no {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--color-primary-bg);
    color: var(--color-primary-text);
    font-size: 16px;
    font-weight: 600;
  }

  &__title {
    color: var(--color-text-title);
    font-size: 17px;
    font-weight: 600;
  }

  &__goal {
    margin-top: 4px;
    color: var(--color-text-secondary);
    font-size: 13px;
  }

  &__steps {
    margin: 0 0 16px;
    padding-left: 0;
    list-style: none;
  }

  &__step {
    display: flex;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px dashed var(--color-border-light);

    &:last-child {
      border-bottom: none;
    }
  }

  &__step-no {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-top: 2px;
    border-radius: 50%;
    background: var(--color-fill-light);
    color: var(--color-text-secondary);
    font-size: 11px;
  }

  &__step-role {
    color: var(--color-primary-text);
    font-size: 12px;
    font-weight: 600;
  }

  &__step-action {
    margin-top: 2px;
    color: var(--color-text-body);
    font-size: 13px;
    line-height: 1.6;
  }

  &__step-look {
    margin-top: 2px;
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  &__accounts {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }

  &__accounts-label {
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }
}
</style>