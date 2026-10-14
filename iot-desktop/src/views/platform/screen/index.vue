<!--
  P-17 总览大屏外链说明页
  ⚠️ 大屏不纳入本工程，只提供外链 + 说明（PRD 0.3 明确）
-->
<template>
  <PageContainer
    title="平台运营监控大屏"
    desc="大屏为独立交付物，本工程仅提供外链入口"
  >
    <section class="card screen-card">
      <div class="screen-card__icon">
        <el-icon><Monitor /></el-icon>
      </div>

      <h3 class="screen-card__title">
        后厨管家 · AIoT 平台运营监控大屏
      </h3>

      <p class="screen-card__desc">
        大屏是独立于本平台的展示型交付物（位于 <code>iot-cockpit</code> 工程），
        以<b>平台方（运营/管理侧）视角</b>呈现：平台整体运行状态、核心业务数据、
        工单资源调度、异常告警与关键绩效指标，弱化单一租户/终端细节，
        面向展厅与运营值班场景，强调「一屏总览」。
        本平台是后台管理端，强调表单录入、审核流转与多租户隔离，两者定位不同，因此不合并。
      </p>

      <div class="screen-card__url">
        <span class="screen-card__url-label">大屏地址：</span>
        <code>{{ cockpitUrl }}</code>
      </div>

      <div class="screen-card__actions">
        <el-button
          type="primary"
          @click="open"
        >
          在新标签页打开大屏
        </el-button>
        <el-button @click="copy">复制地址</el-button>
      </div>

      <el-alert
        class="screen-card__tip"
        type="warning"
        :closable="false"
        title="若点击无反应"
      >
        <p>
          浏览器可能拦截了 <code>file://</code> 协议下的新窗口。处理方式：
        </p>
        <ul class="tips">
          <li>允许本页弹窗后重试；</li>
          <li>手动复制地址到新标签页打开；</li>
          <li>在 <code>.env</code> 里把 <code>VITE_COCKPIT_URL</code> 改成绝对路径（<code>.env.example</code> 有示例）。</li>
        </ul>
      </el-alert>
    </section>

    <section class="card">
      <h3 class="section-title">
        两者的能力边界
      </h3>
      <el-table
        :data="compareRows"
        border
      >
        <el-table-column
          prop="dim"
          label="维度"
          width="140"
        />
        <el-table-column
          prop="screen"
          label="平台运营大屏（iot-cockpit）"
          min-width="280"
        />
        <el-table-column
          prop="platform"
          label="本平台（iot-desktop）"
          min-width="280"
        />
      </el-table>
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformScreen">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';

import PageContainer from '@/components/layout/PageContainer.vue';

const cockpitUrl = import.meta.env.VITE_COCKPIT_URL || '';

const compareRows = [
  { dim: '定位', screen: '展示型：平台运营总览、值班监控', platform: '管理型：后台录入、审核、流转' },
  { dim: '视角', screen: '平台方（运营/管理侧）：全局运行状态、核心业务、资源调度、告警、KPI', platform: '按角色隔离的业务操作视角' },
  { dim: '租户隔离', screen: '不做隔离（平台方全局聚合）', platform: '三层管道强制隔离，越权返回空态' },
  { dim: '数据来源', screen: 'iot-cockpit 自有 mock', platform: 'mock/db.ts 内存库（刷新复位）' },
  { dim: '路由模式', screen: 'history 模式 + 整屏缩放壳', platform: 'hash 模式 + 页面级滚动' },
  { dim: '适用场景', screen: '展厅大屏、值班室', platform: '办公电脑后台操作' },
];

/** 绝对地址（file:// 下相对路径需要基于当前站点解析） */
const absoluteUrl = computed(() => {
  if (!cockpitUrl) return '';
  try {
    return new URL(cockpitUrl, window.location.href).href;
  } catch {
    return cockpitUrl;
  }
});

const open = (): void => {
  if (!cockpitUrl) {
    ElMessage.warning('未配置 VITE_COCKPIT_URL，请在 .env 中补充大屏地址');
    return;
  }
  const win = window.open(absoluteUrl.value, '_blank');
  if (!win) {
    ElMessage.warning('浏览器拦截了新窗口，请允许弹窗后重试，或手动复制地址打开');
  }
};

const copy = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(absoluteUrl.value);
    ElMessage.success('地址已复制到剪贴板');
  } catch {
    ElMessage.warning(`复制失败，请手动复制：${absoluteUrl.value}`);
  }
};
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.screen-card {
  text-align: center;
  padding: 40px 24px;

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    border-radius: 14px;
    background: var(--color-primary-bg);
    color: var(--color-primary-text);
    font-size: 32px;
  }

  &__title {
    color: var(--color-text-title);
    font-size: 20px;
    font-weight: 600;
  }

  &__desc {
    max-width: 720px;
    margin: 12px auto 0;
    color: var(--color-text-body);
    font-size: 14px;
    line-height: 1.9;
    text-align: left;

    code {
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--color-fill-light);
      color: var(--color-primary-text);
      font-size: 12px;
    }
  }

  &__url {
    margin-top: 16px;
    font-size: 13px;

    code {
      padding: 2px 6px;
      border-radius: 3px;
      background: var(--color-fill-light);
      color: var(--color-text-body);
      word-break: break-all;
    }
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
  }

  &__tip {
    margin-top: 24px;
    text-align: left;

    code {
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.05);
      font-size: 12px;
    }
  }
}

.tips {
  margin: 6px 0 0;
  padding-left: 20px;

  li {
    line-height: 1.8;
  }
}

.section-title {
  margin-bottom: 14px;
  color: var(--color-text-title);
  font-size: 15px;
  font-weight: 600;
}
</style>