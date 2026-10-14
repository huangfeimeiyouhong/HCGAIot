<!--
  技术对接信息表单 —— 复审阶段由平台填写
-->
<template>
  <el-form
    :model="form"
    label-width="90px"
    label-position="right"
  >
    <el-form-item label="接入协议">
      <el-select
        v-model="form.protocol"
        placeholder="选择协议"
        class="field"
      >
        <el-option
          v-for="p in protocols"
          :key="p"
          :label="p"
          :value="p"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="字段映射">
      <div class="mapping">
        <div
          v-for="(item, index) in form.fieldMapping"
          :key="index"
          class="mapping__row"
        >
          <el-input
            v-model="item.source"
            size="small"
            placeholder="厂家字段"
          />
          <el-icon class="mapping__arrow"><Right /></el-icon>
          <el-input
            v-model="item.target"
            size="small"
            placeholder="平台字段"
          />
          <el-button
            text
            size="small"
            @click="removeRow(index)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <el-button
          text
          type="primary"
          size="small"
          @click="addRow"
        >
          + 添加映射
        </el-button>
      </div>
    </el-form-item>

    <el-form-item label="备注">
      <el-input
        v-model="form.note"
        type="textarea"
        :rows="2"
        placeholder="联调情况、遗留问题等"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts" name="TechIntegrationForm">
/** 技术对接表单模型 */
export interface TechForm {
  protocol: string;
  fieldMapping: Array<{ source: string; target: string }>;
  note: string;
}

const props = defineProps<{ modelValue: TechForm }>();

const emit = defineEmits<{
  'update:modelValue': [value: TechForm];
}>();

const protocols = ['MQTT/JSON v3.2', 'MQTT/JSON v3.1', 'Modbus-TCP v2.1', 'HTTP/REST v1.0'];

/** 直接改 prop 对象内部字段（表单是纯编辑区，不触发整对象 emit） */
const form = props.modelValue;

const addRow = (): void => {
  form.fieldMapping.push({ source: '', target: '' });
  emit('update:modelValue', form);
};

const removeRow = (index: number): void => {
  form.fieldMapping.splice(index, 1);
  emit('update:modelValue', form);
};
</script>

<style scoped lang="scss">
.field {
  width: 100%;
}

.mapping {
  width: 100%;

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  &__arrow {
    flex-shrink: 0;
    color: var(--color-text-secondary);
  }
}
</style>