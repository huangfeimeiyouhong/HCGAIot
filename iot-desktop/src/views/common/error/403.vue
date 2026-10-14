<!-- 无访问权限页（角色不匹配落地） -->
<template>
  <div class="error-page">
    <div class="error-page__code">
      403
    </div>
    <h1 class="error-page__title">
      无访问权限
    </h1>
    <p class="error-page__desc">
      当前账号的角色是 <strong>{{ roleLabel }}</strong>，
      没有访问该页面的权限。<br>
      如需查看其他端的数据，请退出后从入口页重新选择。
    </p>
    <p
      v-if="from"
      class="error-page__from"
    >
      被拦截的地址：<code>{{ from }}</code>
    </p>
    <div class="error-page__actions">
      <el-button
        type="primary"
        @click="goHome"
      >
        返回我的工作台
      </el-button>
      <el-button @click="goEntry">
        返回入口选择
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts" name="Forbidden">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { landingOf } from '@/router/guard';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const from = computed(() => (route.query.from as string | undefined) ?? '');

const roleLabel = computed(() => {
  const map = { PLATFORM: '平台运营', VENDOR: '厂家端', CUSTOMER: '客户端' };
  return auth.role ? map[auth.role] : '未登录';
});

const goHome = (): void => {
  void router.push(landingOf(auth.role, auth.onboardingStatus));
};

const goEntry = (): void => {
  void router.push('/');
};
</script>

<style scoped lang="scss">
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  text-align: center;

  &__code {
    color: var(--color-primary-bg);
    font-size: 96px;
    font-weight: 700;
    line-height: 1;
  }

  &__title {
    margin-top: 16px;
    color: var(--color-text-title);
    font-size: 24px;
    font-weight: 600;
  }

  &__desc {
    margin-top: 12px;
    color: var(--color-text-secondary);
    font-size: 14px;
    line-height: 1.8;
  }

  &__from {
    margin-top: 10px;
    color: var(--color-text-secondary);
    font-size: 12px;

    code {
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--color-fill-light);
    }
  }

  &__actions {
    display: flex;
    gap: 10px;
    margin-top: 28px;
  }
}
</style>