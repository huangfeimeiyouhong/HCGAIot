<!--
  登录页 —— 深色地图背景 + ?role= + 演示账号切换器 + 账号密码表单
-->
<template>
  <div class="login-page">
    <div class="login-page__bg">
      <BaseChart
        v-if="mapReady"
        :option="mapOption"
        height="100%"
      />
    </div>
    <div class="login-page__mask" />

    <div class="login-card">
      <div class="login-card__brand">
        <img
          class="login-card__logo"
          src="@/assets/images/logo.svg"
          alt="后厨管家"
        >
        <h1 class="login-card__title">
          后厨管家 · AIoT 双边服务平台
        </h1>
        <p class="login-card__subtitle">
          {{ roleLabel }}入口
        </p>
      </div>

      <el-tabs
        v-model="activeRole"
        class="login-card__tabs"
        stretch
      >
        <el-tab-pane
          v-for="r in roleTabs"
          :key="r.value"
          :label="r.label"
          :name="r.value"
        />
      </el-tabs>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        @submit.prevent
      >
        <el-form-item prop="account">
          <el-select
            v-model="form.account"
            class="login-card__control"
            placeholder="选择演示账号"
            filterable
          >
            <el-option
              v-for="acc in accounts"
              :key="acc.account"
              :label="acc.displayName"
              :value="acc.account"
            >
              <div class="demo-option">
                <span class="demo-option__name">{{ acc.displayName }}</span>
                <span class="demo-option__account">{{ acc.account }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            class="login-card__control"
            type="password"
            placeholder="密码（演示环境任意非空即可）"
            show-password
            @keyup.enter="onSubmit"
          >
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-button
          class="login-card__submit"
          type="primary"
          size="large"
          :loading="loading"
          @click="onSubmit"
        >
          登录
        </el-button>
      </el-form>

      <p class="login-card__tip">
        演示账号一键切换：选中即填入，密码任意非空。共 {{ accounts.length }} 个{{ roleLabel }}账号。
      </p>

      <el-button
        class="login-card__back"
        text
        @click="backToEntry"
      >
        ← 返回入口选择
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts" name="Login">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import type { ECOption } from '@/hooks/use-echarts';

import BaseChart from '@/components/data/BaseChart.vue';

import { CHART_DARK_MAP } from '@/constants/chart';

import { authApi } from '@/api/auth';
import { landingOf } from '@/router/guard';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import { useFilterStore } from '@/store/filters';

import type { DemoAccountPublic } from '@/api/auth';
import type { Role } from '@/types';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const appStore = useAppStore();
const filterStore = useFilterStore();

const formRef = ref<FormInstance>();
const loading = ref(false);
const mapReady = ref(false);

/** 入口 Tab */
const roleTabs: Array<{ label: string; value: Role }> = [
  { label: '平台方', value: 'PLATFORM' },
  { label: '厂家端', value: 'VENDOR' },
  { label: '客户端', value: 'CUSTOMER' },
];

/** 当前入口（URL ?role= 优先，可点 Tab 切换） */
const activeRole = ref<Role>('PLATFORM');

const form = reactive({ account: '', password: 'demo123' });

const rules: FormRules = {
  account: [{ required: true, message: '请选择演示账号', trigger: 'change' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

/** 当前入口的演示账号 */
const accounts = computed<DemoAccountPublic[]>(() =>
  DEMO_CACHE.value.filter((a) => a.role === activeRole.value),
);

/** 入口中文名 */
const roleLabel = computed(() => {
  const map: Record<Role, string> = { PLATFORM: '平台运营', VENDOR: '厂家', CUSTOMER: '客户' };
  return map[activeRole.value];
});

/** 演示账号缓存（切 Tab 不重复请求；必须是 ref，否则 computed 不会重算） */
const DEMO_CACHE = ref<DemoAccountPublic[]>([]);

/** 地图 option */
const mapOption = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  geo: {
    map: 'china',
    roam: false,
    zoom: 1.1,
    center: [105, 36],
    itemStyle: { areaColor: CHART_DARK_MAP.backgroundColor, borderColor: CHART_DARK_MAP.borderColor, borderWidth: 1 },
    emphasis: { disabled: true },
    label: { show: false },
  },
  series: [],
}) as ECOption);

/** 拉演示账号 */
const loadAccounts = async (): Promise<void> => {
  DEMO_CACHE.value = await authApi.getDemoAccounts();
  syncAccount();
};

/** 按当前入口同步选中账号（首个） */
const syncAccount = (): void => {
  if (form.account && DEMO_CACHE.value.some((a) => a.role === activeRole.value && a.account === form.account)) return;
  const first = DEMO_CACHE.value.find((a) => a.role === activeRole.value);
  form.account = first?.account ?? '';
};

/** 切换入口 Tab：重置账号选择 */
watch(activeRole, () => {
  form.account = '';
  syncAccount();
});

/** 登录 */
const onSubmit = async (): Promise<void> => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  loading.value = true;
  try {
    const result = await authStore.login({
      account: form.account,
      password: form.password,
      role: activeRole.value,
    });
    // 切换入口时清掉上一入口的缓存，避免筛选条件串味
    appStore.clearKeepAlive();
    filterStore.clearAll();
    // 登录后落地页：厂家未入驻落到入驻申请页
    const landing = landingOf(result.user.role, result.user.onboardingStatus);
    const redirect = route.query.redirect as string | undefined;
    await router.push(redirect || landing);
    ElMessage.success(`欢迎回来，${result.user.displayName}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败，请重试');
  } finally {
    loading.value = false;
  }
};

/** 返回入口选择 */
const backToEntry = (): void => {
  void router.push('/');
};

onMounted(async () => {
  // URL ?role= 决定初始 Tab（入口卡片跳转时携带）
  const role = (route.query.role as string | undefined)?.toUpperCase() as Role | undefined;
  if (role && roleTabs.some((t) => t.value === role)) activeRole.value = role;

  await loadAccounts();

  try {
    const [{ registerMap }, geo] = await Promise.all([
      import('echarts/core'),
      import('@/assets/map/china.json'),
    ]);
    registerMap('china', geo.default as never);
    mapReady.value = true;
  } catch (error) {
    console.warn('[login] 地图背景加载失败，降级为纯深色背景：', error);
  }
});
</script>

<style scoped lang="scss">
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
  background: var(--color-bg-dark);
  color: var(--color-dark-text);

  &__bg {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 45%, var(--color-bg-dark-2) 0%, var(--color-bg-dark) 70%);
  }

  &__mask {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(6, 18, 48, 0.3) 0%, rgba(6, 18, 48, 0.8) 100%);
    pointer-events: none;
  }
}

.login-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
  padding: 32px 32px 24px;
  border: 1px solid var(--color-dark-line);
  border-radius: 12px;
  background: rgba(9, 30, 62, 0.86);
  backdrop-filter: blur(8px);

  &__brand {
    text-align: center;
    margin-bottom: 20px;
  }

  &__logo {
    width: 44px;
    height: 44px;
    margin-bottom: 12px;
  }

  &__title {
    color: var(--color-dark-strong);
    font-size: 19px;
    font-weight: 600;
  }

  &__subtitle {
    margin-top: 6px;
    color: var(--color-primary);
    font-size: 13px;
  }

  &__tabs {
    margin-bottom: 8px;

    :deep(.el-tabs__item) {
      color: var(--color-dark-dim);

      &.is-active {
        color: var(--color-primary);
      }
    }

    :deep(.el-tabs__nav-wrap::after) {
      background-color: var(--color-dark-line);
    }
  }

  &__control {
    width: 100%;
  }

  &__submit {
    width: 100%;
    margin-top: 4px;
  }

  &__tip {
    margin-top: 14px;
    color: var(--color-dark-dim);
    font-size: 12px;
    line-height: 1.6;
  }

  &__back {
    width: 100%;
    margin-top: 6px;
    color: var(--color-dark-dim);
  }
}

.demo-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  &__name {
    color: var(--color-text-title);
  }

  &__account {
    color: var(--color-text-secondary);
    font-size: 12px;
  }
}
</style>

<style lang="scss">
// 深色底上的 EP 表单控件覆写（登录页专用，不污染浅色页面）
.login-page {
  .el-input__wrapper,
  .el-select__wrapper {
    background: rgba(6, 18, 48, 0.6);
    box-shadow: 0 0 0 1px var(--color-dark-line) inset;
  }

  .el-input__inner {
    color: var(--color-dark-strong);
  }

  .el-input__prefix {
    color: var(--color-dark-dim);
  }

  .el-form-item__error {
    color: var(--color-dark-danger);
  }
}
</style>