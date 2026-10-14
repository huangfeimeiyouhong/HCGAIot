<!-- 页面不存在页（路径不存在落地） -->
<template>
  <div class="error-page">
    <div class="error-page__code">
      404
    </div>
    <h1 class="error-page__title">
      页面不存在
    </h1>
    <p class="error-page__desc">
      没有找到 <code>{{ route.fullPath }}</code> 对应的页面。<br>
      常见原因：演示数据已刷新复位，详情页的单据 id 变了。
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

<script setup lang="ts" name="NotFound">
import { useRoute, useRouter } from 'vue-router';

import { landingOf } from '@/router/guard';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

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