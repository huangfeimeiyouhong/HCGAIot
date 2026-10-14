<template>
  <PanelCard
    title="应急管理"
  >
    <template #action>
      <LinkTag
        text="应急台账"
        @click="goLedger"
      />
    </template>
    <div class="security-emergency-manage">
      <SubTitle title="应急统计" />
      <Pie3dPanel
        class="security-emergency-manage__panel"
        :data="data.pie"
      >
        <template #label>
          <div class="security-emergency-manage__panel-label">
            应急事件数量
          </div>
        </template>
        <template #center>
          <div class="security-emergency-manage__center-value">
            {{ data.pieTotal }}
          </div>
        </template>
        <template #default="{ items, activeIndex, setActive }">
          <ul class="security-emergency-manage__stats">
            <li
              v-for="(item, index) in items"
              :key="item.name"
              class="security-emergency-manage__stats-row"
              :class="{ 'is-active': activeIndex === index }"
              @mouseenter="setActive(index)"
              @mouseleave="setActive(null)"
            >
              <div class="security-emergency-manage__cell">
                <div class="security-emergency-manage__cell-label">
                  <span
                    class="security-emergency-manage__cell-color"
                    :style="{
                      backgroundColor: item.color,
                      boxShadow: `2.55px 2.55px 5.1px 0px ${item.color}80`,
                    }"
                  />
                  {{ item.name }}
                </div>
                <div class="security-emergency-manage__cell-value font-digital">
                  {{ item.value }}<span class="security-emergency-manage__cell-unit">个</span>
                </div>
              </div>
              <div class="security-emergency-manage__cell">
                <div class="security-emergency-manage__cell-label">
                  已闭环
                </div>
                <div class="security-emergency-manage__cell-value font-digital">
                  {{ rowMap[item.name].closed }}<span class="security-emergency-manage__cell-unit">个</span>
                </div>
              </div>
              <div class="security-emergency-manage__cell">
                <div class="security-emergency-manage__cell-label">
                  未响应
                </div>
                <div class="security-emergency-manage__cell-value font-digital">
                  {{ rowMap[item.name].unresponsive }}<span class="security-emergency-manage__cell-unit">个</span>
                </div>
              </div>
            </li>
          </ul>
        </template>
      </Pie3dPanel>
    </div>
  </PanelCard>
</template>

<script setup lang="ts" name="SecurityEmergencyManage">
import { computed } from 'vue';

import { useRouter } from 'vue-router';

import { getEmergencyManageData } from '../../situation-data';
import LinkTag from '../link-tag/index.vue';

import PanelCard from '@/components/panel-card/index.vue';
import Pie3dPanel from '@/components/pie-3d-panel/index.vue';
import SubTitle from '@/components/sub-title/index.vue';
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

const data = computed(() => getEmergencyManageData({ city: props.city || undefined, gridOrgId: props.gridOrgId || undefined }));

/** 按类别名索引已闭环/未响应(与饼图扇区一一对应) */
const rowMap = computed(() => Object.fromEntries(data.value.rows.map((row) => [row.name, row])));

const router = useRouter();

/** 跳转应急台账页(占位;省域/网格视角携带当前上下文,全国视角无参) */
const goLedger = () => {
  router.push({ path: '/ledger/index', query: { type: 'emergency', ...buildLedgerQuery(props.city, props.gridOrgId) } });
};
</script>

<style lang="scss" scoped>
.security-emergency-manage {
  height: 100%;
  display: flex;
  flex-direction: column;

  &__panel {
    flex: 1;
    min-height: 0;
    gap: 28px;
  }

  &__panel-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.3;
  }

  &__center-value {
    font-size: 20px;
    font-weight: 600;
    font-family: 'DIN', sans-serif;
    color: #fff;
    line-height: 1.2;
  }

  &__stats {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__stats-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    align-items: center;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &.is-active {
      background-color: rgb(255 255 255 / 8%);
    }
  }

  &__cell-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
  }

  &__cell-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  &__cell-value {
    margin-top: 8px;
    font-size: 20px;
    font-weight: 600;
    line-height: 1;
    color: #fff;
  }

  &__cell-unit {
    margin-left: 1px;
    font-size: 12px;
    font-weight: 400;
    color: #F0F9FF;
  }
}
</style>
