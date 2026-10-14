<!--
  服务范围校验展示 —— 2 类校验的即时反馈
-->
<template>
  <div class="scope-check">
    <div
      class="scope-check__item"
      :class="hasCustomer ? (inScope ? 'is-pass' : 'is-fail') : ''"
    >
      <el-icon>
        <SuccessFilled v-if="hasCustomer && inScope" />
        <CircleCloseFilled v-else-if="hasCustomer" />
        <InfoFilled v-else />
      </el-icon>
      <span v-if="!hasCustomer">请选择客户以进行服务范围校验</span>
      <span v-else-if="inScope">客户在本厂家服务范围内，可申报</span>
      <span v-else>客户不在本厂家服务范围内，申报将被阻断</span>
    </div>

    <div
      v-if="hasActiveSameType"
      class="scope-check__item is-fail"
    >
      <el-icon><CircleCloseFilled /></el-icon>
      <span>{{ conflictInfo }}</span>
    </div>

    <div
      v-else-if="hasCustomer"
      class="scope-check__item is-pass"
    >
      <el-icon><SuccessFilled /></el-icon>
      <span>该设备当前无生效的同类型绑定</span>
    </div>
  </div>
</template>

<script setup lang="ts" name="ServiceScopeCheck">
import { computed } from 'vue';

interface Props {
  inScope: boolean;
  hasActiveSameType: boolean;
  conflictInfo: string;
  /** 是否已选客户 */
  hasCustomer?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasCustomer: true,
});

const hasCustomer = computed(() => props.hasCustomer);
</script>

<style scoped lang="scss">
.scope-check {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 4px;
  background: var(--color-fill-light);

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    color: var(--color-text-secondary);
    font-size: 12px;
    line-height: 1.7;

    &.is-pass {
      color: var(--color-success);
    }

    &.is-fail {
      color: var(--color-danger);
    }
  }
}
</style>