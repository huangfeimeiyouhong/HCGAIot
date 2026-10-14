<!--
  AI 事件详情弹窗(mock 版,壳复用共享 Dialog):
  左侧事件证据大图(顶栏点位名 + 整改前/整改后切换);右侧信息面板(点位名 + 状态标签 + 基本信息 + 查看视频)。
  「查看视频」用模板内置 video-player(开源 video.js)在左侧区切换播放,不依赖任何私有播放器 SDK。
-->
<template>
  <Dialog
    ref="dialogRef"
    title="AI事件详情"
    width="1280px"
  >
    <div
      v-if="record"
      class="detail-body"
    >
      <!-- 左:事件证据(图片 ↔ 视频切换) -->
      <div class="detail-evidence">
        <VideoPlayer
          v-if="showVideo"
          class="detail-evidence__img"
          :src="videoSrc"
          :autoplay="true"
          :muted="true"
          :loop="true"
        />
        <template v-else>
          <img
            v-if="currentImg"
            class="detail-evidence__img"
            :src="currentImg"
            alt=""
          >
          <div
            v-else
            class="detail-evidence__placeholder"
          >
            <NoImagePlaceholder
              :width="240"
              :height="150"
            />
          </div>
        </template>
        <div class="detail-evidence__bar">
          <span class="detail-evidence__name">{{ record.pointName || '—' }}</span>
          <div class="detail-evidence__tabs">
            <button
              v-for="tab in evidenceTabs"
              :key="tab.key"
              type="button"
              class="detail-evidence__tab"
              :class="{ 'detail-evidence__tab--active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 右:信息面板 -->
      <div class="detail-info">
        <div class="detail-info__title">
          {{ record.pointName || '—' }}
        </div>
        <span
          class="detail-info__status"
          :style="statusStyle"
        >{{ record.statusName || '—' }}</span>
        <div class="detail-info__divider" />
        <div class="detail-info__section">
          <span class="detail-info__section-bar" />
          <span class="detail-info__section-title">基本信息</span>
        </div>
        <div class="detail-info__divider" />
        <div class="detail-info__rows">
          <div
            v-for="row in infoRows"
            :key="row.label"
            class="detail-info__row"
          >
            <span class="detail-info__label">{{ row.label }}</span>
            <span class="detail-info__value">{{ row.value }}</span>
          </div>
        </div>
        <button
          type="button"
          class="detail-info__video-btn"
          @click="showVideo = !showVideo"
        >
          {{ showVideo ? '查看图片' : '查看视频' }}
        </button>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts" name="EventDetailDialog">
import { computed, ref } from 'vue';

import type { AiEventRecord } from '../../event-data';

import Dialog from '@/components/dialog/index.vue';
import NoImagePlaceholder from '@/components/no-image-placeholder/index.vue';
import VideoPlayer from '@/components/video-player/index.vue';

/** 状态标签配色(待办/处理中/已完结) */
const STATUS_TAG_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  0: { color: '#ff6b5e', bg: 'rgba(255, 77, 79, 0.12)', border: 'rgba(255, 107, 94, 0.55)' },
  1: { color: '#ffd66b', bg: 'rgba(255, 214, 107, 0.12)', border: 'rgba(255, 214, 107, 0.55)' },
  2: { color: '#3de08b', bg: 'rgba(61, 224, 139, 0.12)', border: 'rgba(61, 224, 139, 0.55)' },
};

/** mock 演示视频流(开源测试源;接入时换成事件真实监控流地址) */
const DEMO_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const dialogRef = ref<InstanceType<typeof Dialog>>();

const record = ref<AiEventRecord | null>(null);
const showVideo = ref(false);
const videoSrc = ref(DEMO_VIDEO);

// 整改前/整改后切换(默认整改前)
type EvidenceTabKey = 'before' | 'after';
const evidenceTabs: { key: EvidenceTabKey; label: string }[] = [
  { key: 'before', label: '整改前' },
  { key: 'after', label: '整改后' },
];
const activeTab = ref<EvidenceTabKey>('before');

// 事件证据取对应图集首张(逗号分隔多张;无图留空底板)
const firstImgOf = (urls: string | null | undefined) => urls?.split(',')[0]?.trim() || '';
const currentImg = computed(() => {
  if (!record.value) return '';
  return activeTab.value === 'before'
    ? firstImgOf(record.value.troubleImg)
    : firstImgOf(record.value.normalImg);
});

const statusStyle = computed(() => {
  const tag = STATUS_TAG_COLOR[String(record.value?.status ?? '')] ?? STATUS_TAG_COLOR['0'];
  return {
    color: tag.color,
    background: tag.bg,
    border: `1px solid ${tag.border}`,
  };
});

const textOrDash = (value?: string) => (value && value.trim() ? value : '—');

const infoRows = computed(() => {
  const item = record.value;
  return [
    { label: '宗地名称', value: textOrDash(item?.orgName) },
    { label: '摄像头点位', value: textOrDash(item?.cameraPoint) },
    { label: '工单类型', value: textOrDash(item?.workOrderTypeName) },
    { label: '问题创建时间', value: textOrDash(item?.createTime) },
    { label: '备注', value: textOrDash(item?.remark) },
  ];
});

const open = (next: AiEventRecord) => {
  record.value = next;
  activeTab.value = 'before';
  showVideo.value = false;
  dialogRef.value?.open();
};

const close = () => {
  dialogRef.value?.close();
};

defineExpose({ open, close });
</script>

<style lang="scss" scoped>
.detail-body {
  display: flex;
  gap: 20px;
  height: 600px;
}

.detail-evidence {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__img {
    flex: 1;
    min-height: 0;
    width: 100%;
    object-fit: cover;
    border-radius: 6px;
    background: rgba(3, 20, 45, 0.6);
  }

  &__placeholder {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(3, 20, 45, 0.6);
    border-radius: 6px;
  }

  &__bar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__name {
    font-size: 14px;
    color: #f0fbff;
  }

  &__tabs {
    display: flex;
    gap: 8px;
  }

  &__tab {
    padding: 5px 14px;
    font-size: 12px;
    color: rgba(240, 251, 255, 0.65);
    background: rgba(15, 184, 255, 0.06);
    border: 1px solid rgba(15, 184, 255, 0.25);
    border-radius: 3px;
    cursor: pointer;

    &--active {
      color: #fff;
      background: rgba(15, 184, 255, 0.22);
      border-color: #0fb8ff;
    }
  }
}

.detail-info {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: #f0fbff;
    line-height: 1.4;
  }

  &__status {
    display: inline-block;
    width: fit-content;
    margin-top: 10px;
    padding: 3px 10px;
    font-size: 12px;
    border-radius: 2px;
  }

  &__divider {
    height: 1px;
    margin: 14px 0;
    background: rgba(15, 184, 255, 0.15);
  }

  &__section {
    display: flex;
    align-items: center;
    gap: 8px;

    &-bar {
      width: 3px;
      height: 14px;
      background: linear-gradient(180deg, #27edf6 0%, #0994ee 100%);
      border-radius: 1px;
    }

    &-title {
      font-size: 14px;
      font-weight: 600;
      color: #f0fbff;
    }
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__row {
    display: flex;
    gap: 12px;
    font-size: 13px;
    line-height: 1.5;
  }

  &__label {
    flex-shrink: 0;
    width: 84px;
    color: rgba(240, 251, 255, 0.55);
  }

  &__value {
    flex: 1;
    min-width: 0;
    color: #f0fbff;
    word-break: break-all;
  }

  &__video-btn {
    margin-top: auto;
    height: 38px;
    font-size: 14px;
    color: #fff;
    background: linear-gradient(90deg, #1261af 0%, #0fb8ff 100%);
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      filter: brightness(1.1);
    }
  }
}
</style>
