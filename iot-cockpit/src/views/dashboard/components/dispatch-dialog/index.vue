/**
 * 任务调度弹窗(mock):事件摘要 + 调度表单(应急队伍/物资调拨/处置备注)。
 * 真实项目把 confirm 换成调度接口请求即可;payload 传入事件/隐患节点信息做回显。
 */
<template>
  <Dialog
    ref="dialogRef"
    title="应急指挥调度"
    width="720px"
    show-title-icon
  >
    <div class="dispatch">
      <!-- 事件摘要 -->
      <div class="dispatch__summary">
        <div class="dispatch__summary-title">
          {{ eventInfo.title }}
        </div>
        <div class="dispatch__summary-meta">
          {{ eventInfo.meta }}
        </div>
        <span class="dispatch__summary-status">{{ eventInfo.status }}</span>
      </div>

      <!-- 应急队伍 -->
      <div class="dispatch__section">
        <div class="dispatch__section-title">
          调度应急队伍
        </div>
        <div class="dispatch__chips">
          <span
            v-for="team in TEAM_OPTIONS"
            :key="team"
            class="dispatch__chip"
            :class="{ 'dispatch__chip--active': selectedTeams.includes(team) }"
            @click="toggleItem(selectedTeams, team)"
          >{{ team }}</span>
        </div>
      </div>

      <!-- 物资调拨 -->
      <div class="dispatch__section">
        <div class="dispatch__section-title">
          调拨应急物资
        </div>
        <div class="dispatch__chips">
          <span
            v-for="supply in SUPPLY_OPTIONS"
            :key="supply"
            class="dispatch__chip"
            :class="{ 'dispatch__chip--active': selectedSupplies.includes(supply) }"
            @click="toggleItem(selectedSupplies, supply)"
          >{{ supply }}</span>
        </div>
      </div>

      <!-- 处置备注 -->
      <div class="dispatch__section">
        <div class="dispatch__section-title">
          处置要求
        </div>
        <textarea
          v-model="remark"
          class="dispatch__textarea"
          rows="3"
          placeholder="请输入处置要求(选填)"
        />
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="dispatch__btn dispatch__btn--ghost"
        @click="close"
      >取 消</button>
      <button
        type="button"
        class="dispatch__btn dispatch__btn--primary"
        @click="handleConfirm"
      >确认调度</button>
    </template>
  </Dialog>
</template>

<script setup lang="ts" name="DispatchDialog">
import { reactive, ref } from 'vue';

import Dialog from '@/components/dialog/index.vue';

/** 打开弹窗的入参(隐患/事件节点信息,用于摘要回显) */
export interface DispatchPayload {
  id?: string;
  title?: string;
  device?: string;
  location?: string;
  time?: string;
  status?: string;
}

const dialogRef = ref<InstanceType<typeof Dialog>>();

const TEAM_OPTIONS = ['微型消防站一队', '安保巡逻二组', '工程抢修班', '医疗应急点'];
const SUPPLY_OPTIONS = ['灭火器 ×4', '消防水带 ×2', '应急照明 ×6', '急救箱 ×1'];

const eventInfo = reactive({
  title: '未命名事件',
  meta: '',
  status: '待处置',
});

const selectedTeams = ref<string[]>([TEAM_OPTIONS[0]]);
const selectedSupplies = ref<string[]>([]);
const remark = ref('');

const toggleItem = (list: string[], item: string) => {
  const index = list.indexOf(item);
  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.push(item);
  }
};

const open = (payload?: DispatchPayload) => {
  eventInfo.title = payload?.title || '未命名事件';
  eventInfo.meta = [payload?.device, payload?.location, payload?.time].filter(Boolean).join(' | ');
  eventInfo.status = payload?.status || '待处置';
  dialogRef.value?.open();
};

const close = () => {
  dialogRef.value?.close();
};

/** 确认调度(mock):真实项目此处调调度接口,成功后 close + 刷新面板 */
const handleConfirm = () => {
  // eslint-disable-next-line no-console
  console.log('[dispatch] 确认调度', {
    teams: selectedTeams.value,
    supplies: selectedSupplies.value,
    remark: remark.value,
  });
  close();
};

defineExpose({ open, close });
</script>

<style lang="scss" scoped>
.dispatch {
  display: flex;
  flex-direction: column;
  gap: 18px;

  &__summary {
    position: relative;
    padding: 14px 16px;
    background: rgba(15, 184, 255, 0.06);
    border: 1px solid rgba(15, 184, 255, 0.25);
    border-radius: 6px;
  }

  &__summary-title {
    font-size: 15px;
    font-weight: 600;
    color: #f0fbff;
    line-height: 1.4;
  }

  &__summary-meta {
    margin-top: 6px;
    font-size: 12px;
    color: rgba(240, 251, 255, 0.6);
    line-height: 1.4;
  }

  &__summary-status {
    position: absolute;
    top: 14px;
    right: 16px;
    padding: 2px 8px;
    font-size: 12px;
    color: #ff6b5e;
    background: rgba(255, 77, 79, 0.12);
    border: 1px solid rgba(255, 107, 94, 0.55);
    border-radius: 2px;
  }

  &__section-title {
    margin-bottom: 10px;
    font-size: 13px;
    color: rgba(240, 251, 255, 0.85);

    &::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 12px;
      margin-right: 6px;
      vertical-align: -1px;
      background: linear-gradient(180deg, #27edf6 0%, #0994ee 100%);
      border-radius: 1px;
    }
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__chip {
    padding: 6px 14px;
    font-size: 12px;
    color: rgba(240, 251, 255, 0.75);
    background: rgba(15, 184, 255, 0.06);
    border: 1px solid rgba(15, 184, 255, 0.25);
    border-radius: 3px;
    cursor: pointer;
    user-select: none;
    transition: all 0.15s;

    &:hover {
      border-color: rgba(15, 184, 255, 0.6);
    }

    &--active {
      color: #fff;
      background: rgba(15, 184, 255, 0.22);
      border-color: #0fb8ff;
    }
  }

  &__textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    font-size: 13px;
    color: #f0fbff;
    background: rgba(3, 20, 45, 0.6);
    border: 1px solid rgba(15, 184, 255, 0.25);
    border-radius: 4px;
    outline: none;
    resize: none;
    font-family: inherit;

    &::placeholder {
      color: rgba(240, 251, 255, 0.35);
    }

    &:focus {
      border-color: #0fb8ff;
    }
  }

  &__btn {
    min-width: 96px;
    height: 36px;
    padding: 0 20px;
    font-size: 14px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;

    &--ghost {
      color: rgba(240, 251, 255, 0.75);
      background: transparent;
      border: 1px solid rgba(15, 184, 255, 0.35);

      &:hover {
        border-color: #0fb8ff;
        color: #fff;
      }
    }

    &--primary {
      color: #fff;
      background: linear-gradient(90deg, #1261af 0%, #0fb8ff 100%);
      border: none;

      &:hover {
        filter: brightness(1.1);
      }
    }
  }
}
</style>
