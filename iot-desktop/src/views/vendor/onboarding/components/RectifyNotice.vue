<!--
  整改提示卡 —— V-02 的 RECTIFY 分支
-->
<template>
  <div class="rectify-notice">
    <div class="rectify-notice__head">
      <el-icon class="rectify-notice__icon"><WarningFilled /></el-icon>
      <strong>平台要求补充材料</strong>
    </div>
    <p class="rectify-notice__reason">
      {{ reason }}
    </p>
    <p class="rectify-notice__tip">
      请根据上述原因调整申请信息后，点击下方「提交整改材料」重新提交；提交后状态回到「待复审」等待平台复审。
    </p>
  </div>
</template>

<script setup lang="ts" name="RectifyNotice">
interface Props {
  reason: string;
}

defineProps<Props>();
</script>

<style scoped lang="scss">
.rectify-notice {
  padding: 12px 14px;
  margin-top: 12px;
  border-radius: 4px;
  background: var(--badge-waiting-bg);

  &__head {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--badge-waiting-text);
    font-size: 13px;
  }

  &__icon {
    font-size: 15px;
  }

  &__reason {
    margin-top: 8px;
    color: var(--color-text-title);
    font-size: 13px;
    line-height: 1.7;
  }

  &__tip {
    margin-top: 6px;
    color: var(--color-text-body);
    font-size: 12px;
    line-height: 1.7;
  }
}
</style>