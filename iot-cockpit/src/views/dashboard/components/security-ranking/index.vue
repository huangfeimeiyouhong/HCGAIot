<template>
  <PanelCard
    title="安全排名"
  >
    <template #action>
      <LinkTag
        text="安全台账"
        @click="goLedger"
      />
    </template>
    <div class="security-ranking">
      <div class="security-ranking__grades">
        <div
          v-for="item in data.grades"
          :key="item.level"
          class="security-ranking__grade"
        >
          <span
            class="security-ranking__dot"
            :style="{ background: GRADE_COLORS[item.level] }"
          />
          <div class="security-ranking__grade-text">
            <span class="security-ranking__level">{{ item.level }}</span>
            <span class="security-ranking__count font-digital">{{ item.count }}</span>
          </div>
        </div>
      </div>
      <div class="security-ranking__list">
        <div
          v-for="row in data.ranking"
          :key="row.rank"
          class="security-ranking__row"
        >
          <span class="security-ranking__rank font-digital">{{ String(row.rank).padStart(2, '0') }}</span>
          <span class="security-ranking__company">{{ row.company }}</span>
          <div class="security-ranking__bar">
            <div
              class="security-ranking__bar-inner"
              :style="{ width: `${row.score}%` }"
            />
          </div>
          <span class="security-ranking__score font-digital">{{ row.score }}</span>
        </div>
      </div>
    </div>
  </PanelCard>
</template>

<script setup lang="ts" name="SecurityRanking">
import { computed } from 'vue';

import { useRouter } from 'vue-router';

import { getRankingData } from '../../situation-data';
import LinkTag from '../link-tag/index.vue';

import PanelCard from '@/components/panel-card/index.vue';
import { buildLedgerQuery } from '@/utils/ledger';

interface Props {
  /** 省码,不传 = 全国 */
  city?: string;
  /** 网格 orgId */
  gridOrgId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  city: '',
  gridOrgId: '',
});

const GRADE_COLORS: Record<string, string> = {
  优: '#3d8bff', 良: '#ffc53d', 中: '#ff7a00', 差: '#ff4d4f'
};

const data = computed(() => getRankingData({ city: props.city || undefined, gridOrgId: props.gridOrgId || undefined }));

const router = useRouter();

/** 跳转安全台账页(占位;省域/网格视角携带当前上下文,全国视角无参) */
const goLedger = () => {
  router.push({ path: '/ledger/index', query: { type: 'safety', ...buildLedgerQuery(props.city, props.gridOrgId) } });
};
</script>

<style lang="scss" scoped>
.security-ranking {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__grades {
    display: flex;
    gap: 8px;
  }

  &__grade {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;

    &:nth-child(2),
    &:nth-child(3) {
      justify-content: center;
    }

    &:last-child {
      justify-content: flex-end;
    }
  }

  &__grade-text {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__level {
    font-size: 12px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.9);
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  &__count {
    font-size: 30px;
    line-height: 1;
    background:
      linear-gradient(180deg, rgba(88, 131, 255, 0) 40.96%, rgba(88, 131, 255, 0.6) 100%),
      linear-gradient(0deg, #ffffff, #ffffff);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    filter: drop-shadow(0px 6px 2.5px rgba(0, 0, 0, 0.3));
  }

  &__list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    flex: 0 0 auto;
    padding: 0 8px;
    background: linear-gradient(180deg, rgba(9, 148, 238, 0.12) 0%, rgba(15, 245, 255, 0.12) 100%);
    border: 1px solid rgba(15, 245, 255, 0.12);

    & + & {
      margin-top: -1px;
    }
  }

  &__rank {
    width: 22px;
    font-size: 13px;
    color: #ffffff;
  }

  &__company {
    width: 84px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__bar {
    flex: 1;
    height: 12px;
    overflow: hidden;
  }

  &__bar-inner {
    height: 100%;
    background: linear-gradient(90deg, #0e90e5 0%, #3dffdc 100%);
  }

  &__score {
    width: 26px;
    text-align: right;
    font-size: 13px;
    color: #4ae0d4;
  }
}
</style>
