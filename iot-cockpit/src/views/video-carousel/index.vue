<!--
  视频轮播页(mock):「查看监控」/重点项目帧的落地页。
  按 query.orgId 过滤项目(全国 = 全量),每项目一张监控卡(开源 video.js 播放器,
  演示流地址;接入真实监控时换成项目摄像头流,低延时场景可换 WebRTC 开源方案)。
-->
<template>
  <div class="video-page">
    <div class="video-page__grid">
      <div
        v-for="project in projects"
        :key="project.parcelOrgId"
        class="video-card"
      >
        <div class="video-card__player">
          <VideoPlayer
            :src="DEMO_VIDEO"
            :muted="true"
            :loop="true"
            :controls="true"
          />
        </div>
        <div class="video-card__footer">
          <span class="video-card__name">{{ project.parcel }}</span>
          <span class="video-card__tag">{{ project.grid }}</span>
        </div>
      </div>
      <div
        v-if="!projects.length"
        class="video-page__empty"
      >当前范围暂无项目</div>
    </div>
  </div>
</template>

<script setup lang="ts" name="VideoCarouselIndex">
import { computed } from 'vue';

import { useRoute } from 'vue-router';

import VideoPlayer from '@/components/video-player/index.vue';
import { LEDGER_ORG_LEAVES, orgFiltersOf } from '@/store/org';

/** mock 演示视频流(开源测试源;接入时换成真实监控流地址) */
const DEMO_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const route = useRoute();

/** query.orgId → 项目清单(全国 = 全量;公司/网格 = 子树;宗地 = 自身) */
const projects = computed(() => {
  const orgId = String(route.query.orgId || '');
  if (!orgId) return LEDGER_ORG_LEAVES.value;
  const filters = orgFiltersOf(orgId);
  return LEDGER_ORG_LEAVES.value.filter((leaf) =>
    (filters.parcelOrgId && leaf.parcelOrgId === filters.parcelOrgId)
    || (filters.gridOrgId && leaf.gridOrgId === filters.gridOrgId)
    || (filters.companyOrgId && leaf.companyOrgId === filters.companyOrgId));
});
</script>

<style lang="scss" scoped>
.video-page {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    padding: 12px 0;
  }

  &__empty {
    grid-column: 1 / -1;
    padding: 80px 0;
    text-align: center;
    font-size: 14px;
    color: rgba(240, 251, 255, 0.45);
  }
}

.video-card {
  overflow: hidden;
  background: rgba(3, 20, 45, 0.6);
  border: 1px solid rgba(15, 184, 255, 0.35);
  border-radius: 6px;

  &__player {
    aspect-ratio: 16 / 9;
    background: #000;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 12px;
  }

  &__name {
    font-size: 14px;
    color: #f0fbff;
  }

  &__tag {
    font-size: 12px;
    color: rgba(240, 251, 255, 0.55);
  }
}
</style>
