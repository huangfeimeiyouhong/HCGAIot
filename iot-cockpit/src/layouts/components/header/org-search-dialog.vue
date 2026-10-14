<template>
  <Dialog
    ref="dialogRef"
    title="组织与项目搜索"
    width="600px"
    show-title-icon
  >
    <div
      ref="rootRef"
      class="org-search"
    >
      <!-- 组织筛选：省域公司 / 网格 两级联动 -->
      <div class="org-search__label">
        组织筛选
      </div>
      <div
        class="org-search__select"
        :class="{ 'org-search__select--open': orgPanelVisible }"
        @click="toggleOrgPanel"
      >
        <span
          class="org-search__select-text"
          :class="{ 'org-search__select-text--placeholder': !selectedCompany }"
        >{{ orgDisplayText }}</span>
        <!-- 清空组织选择（阻止冒泡，不触发下拉展开/收起） -->
        <span
          v-if="selectedCompany"
          class="org-search__clear"
          @click.stop="handleClearOrg"
        >
          <img
            :src="ClearIcon"
            alt="清空"
          >
        </span>
        <img
          class="org-search__select-arrow"
          :class="{ 'org-search__select-arrow--up': orgPanelVisible }"
          :src="ArrowIcon"
          alt=""
        >
      </div>

      <!-- 公司 / 网格 下拉面板（展开时占据文档流，弹窗随之增高） -->
      <div
        v-if="orgPanelVisible"
        class="org-search__org-panel"
      >
        <div class="org-search__org-col org-search__org-col--company">
          <div
            v-for="company in companyList"
            :key="company.cityCode"
            class="org-search__org-item"
            :class="{ 'org-search__org-item--active': selectedCompany?.cityCode === company.cityCode }"
            @click="handleSelectCompany(company)"
          >
            <span class="org-search__org-item-text">{{ company.name }}</span>
            <img
              v-if="selectedCompany?.cityCode === company.cityCode"
              class="org-search__check"
              :src="CheckIcon"
              alt=""
            >
          </div>
        </div>
        <div class="org-search__org-divider" />
        <div class="org-search__org-col org-search__org-col--grid">
          <div
            v-for="grid in currentGridList"
            :key="grid.orgId"
            class="org-search__org-item"
            :class="{ 'org-search__org-item--active': selectedGrid?.orgId === grid.orgId }"
            @click="handleSelectGrid(grid)"
          >
            <span class="org-search__org-item-text">{{ grid.name }}</span>
            <img
              v-if="selectedGrid?.orgId === grid.orgId"
              class="org-search__check"
              :src="CheckIcon"
              alt=""
            >
          </div>
          <div
            v-if="!currentGridList.length"
            class="org-search__org-empty"
          >
            {{ selectedCompany ? '该公司暂无网格数据' : '请先选择省域公司' }}
          </div>
        </div>
      </div>

      <!-- 项目搜索（关键字过滤 + 下拉直选，范围随组织筛选联动：全国 → 公司 → 网格） -->
      <div class="org-search__label org-search__label--project">
        项目搜索
      </div>
      <div class="org-search__input-box">
        <img
          class="org-search__input-icon"
          :src="SearchIcon"
          alt=""
        >
        <input
          v-model="keyword"
          class="org-search__input"
          type="text"
          placeholder="输入或选择项目名称"
          @focus="handleInputFocus"
        >
        <!-- 清空输入的关键字与已选项目 -->
        <span
          v-if="keyword"
          class="org-search__clear"
          @click="handleClearKeyword"
        >
          <img
            :src="ClearIcon"
            alt="清空"
          >
        </span>
        <!-- 下拉箭头：展开/收起候选列表 -->
        <img
          class="org-search__input-arrow"
          :class="{ 'org-search__input-arrow--up': projectPanelVisible }"
          :src="ArrowIcon"
          alt=""
          @click="toggleProjectPanel"
        >
      </div>

      <!-- 默认提示（组织面板与候选列表均未展开时） -->
      <div
        v-if="!keyword && !orgPanelVisible && !projectPanelVisible"
        class="org-search__hint"
      >
        不选组织时将搜索全国项目，选定公司和网格后搜索对应范围
      </div>
      <!-- 候选列表：已选中项目回填后收起,重新编辑关键字或点箭头时恢复 -->
      <template v-else-if="projectPanelVisible && !selectedProject">
        <div
          v-if="keyword.trim()"
          class="org-search__hint org-search__hint--count"
        >
          <span class="org-search__count-num">{{ candidateProjects.length }}</span> 条匹配项目
        </div>
        <div
          v-else
          class="org-search__hint org-search__hint--count"
        >
          共 <span class="org-search__count-num">{{ candidateProjects.length }}</span> 个项目
        </div>
        <div class="org-search__result-panel">
          <div
            v-for="project in candidateProjects"
            :key="`${project.cityCode}:${project.id}`"
            class="org-search__result-item"
            :class="{ 'org-search__result-item--active': selectedProject && isSameProject(selectedProject, project) }"
            @click="handleSelectProject(project)"
          >
            <span class="org-search__result-bullet" />
            <span class="org-search__result-text">
              <span
                v-for="(seg, i) in splitNameSegments(project.name)"
                :key="i"
                :class="{ 'org-search__result-hit': seg.isHit }"
              >{{ seg.text }}</span>
            </span>
            <img
              v-if="selectedProject && isSameProject(selectedProject, project)"
              class="org-search__check"
              :src="CheckIcon"
              alt=""
            >
          </div>
          <div
            v-if="!candidateProjects.length"
            class="org-search__org-empty"
          >
            {{ keyword.trim() ? '暂无匹配项目' : '当前范围暂无项目' }}
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <button
        type="button"
        class="org-search__btn org-search__btn--reset"
        @click="handleReset"
      >
        重置
      </button>
      <button
        type="button"
        class="org-search__btn org-search__btn--search"
        @click="handleSearch"
      >
        搜索
      </button>
    </template>
  </Dialog>
</template>

<script setup lang="ts" name="OrgSearchDialog">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useRoute, useRouter } from 'vue-router';

import ArrowIcon from '@/assets/images/components/org-search/ic-arrow.svg';
import CheckIcon from '@/assets/images/components/org-search/ic-check.svg';
import ClearIcon from '@/assets/images/components/org-search/ic-clear.svg';
import SearchIcon from '@/assets/images/components/org-search/ic-search.svg';
import Dialog from '@/components/dialog/index.vue';
import { childNodesOf, orgTree } from '@/store/org';
import { getProvinceCompanies } from '@/views/dashboard/grid-data';
import { projectData } from '@/views/dashboard/project-data';

interface Grid {
  /** 网格 orgId(与路由 query grid 一致) */
  orgId: string;
  name: string;
}

interface Company {
  name: string;
  orgId: string;
  /** 省码(前 2 位;路由 /dashboard/:city 参数值) */
  cityCode: string;
  grids: Grid[];
}

interface Project {
  /** 宗地 orgId(= /project/:cityId/:projectId),跨省撞号须配 cityCode 判同 */
  id: string;
  name: string;
  cityCode: string;
  gridOrgId: string;
}

// 公司/网格与实时组织架构同源;省码由节点 adCode 派生,无 adCode 的公司(未配置网格)不可导航不入列
const companyList = computed<Company[]>(() => {
  const cityCodeByOrgId = new Map(getProvinceCompanies().map((c) => [c.orgId, c.cityCode]));
  return orgTree.value
    .map((company) => ({
      name: company.name,
      orgId: company.orgId,
      cityCode: cityCodeByOrgId.get(company.orgId) ?? '',
      grids: childNodesOf(company, '4').map((grid) => ({ orgId: grid.orgId, name: grid.name })),
    }))
    .filter((company) => company.cityCode);
});

// 项目列表与 L3 宗地数据同源(projectData 实时派生)
const projectList = computed<Project[]>(() =>
  Object.entries(projectData.value).flatMap(([cityCode, list]) =>
    list.map((p) => ({
      id: p.id,
      name: p.name,
      cityCode,
      gridOrgId: p.gridOrgId,
    }))
  )
);

// ==================== 状态 ====================
const dialogRef = ref<InstanceType<typeof Dialog>>();
const rootRef = ref<HTMLDivElement>();

const orgPanelVisible = ref(false);
const projectPanelVisible = ref(false);
const selectedCompany = ref<Company>();
const selectedGrid = ref<Grid>();
const selectedProject = ref<Project>();
const keyword = ref('');

const orgDisplayText = computed(() => {
  if (!selectedCompany.value) return '请选择省域公司 / 网格';
  return `${selectedCompany.value.name} / ${selectedGrid.value?.name ?? '请选择网格'}`;
});

const currentGridList = computed<Grid[]>(() => selectedCompany.value?.grids ?? []);

// 候选项目:范围随组织筛选联动——未选组织=全国、仅公司=该公司、公司+网格=该网格;
// 有关键字再按名称过滤(空关键字=当前范围全量,供下拉直接选择)
const candidateProjects = computed<Project[]>(() => {
  const kw = keyword.value.trim();
  const company = selectedCompany.value;
  const grid = selectedGrid.value;
  return projectList.value.filter((p) => {
    if (company && p.cityCode !== company.cityCode) return false;
    if (grid && p.gridOrgId !== grid.orgId) return false;
    if (kw && !p.name.includes(kw)) return false;
    return true;
  });
});

// ==================== 交互 ====================
const toggleOrgPanel = () => {
  projectPanelVisible.value = false;
  orgPanelVisible.value = !orgPanelVisible.value;
};

// 聚焦输入框:展开候选列表(已回填选中态除外,避免重复展示),组织面板互斥收起
const handleInputFocus = () => {
  orgPanelVisible.value = false;
  if (!selectedProject.value) projectPanelVisible.value = true;
};

// 下拉箭头:展开候选列表(回填态先清空,重新全量选择),再点收起
const toggleProjectPanel = () => {
  orgPanelVisible.value = false;
  if (!projectPanelVisible.value && selectedProject.value) {
    selectedProject.value = undefined;
    keyword.value = '';
  }
  projectPanelVisible.value = !projectPanelVisible.value;
};

const handleSelectCompany = (company: Company) => {
  if (selectedCompany.value?.cityCode === company.cityCode) return;
  selectedCompany.value = company;
  selectedGrid.value = undefined;
  // 换公司后原项目不再属于当前范围,选中态与回填关键字一并重置
  selectedProject.value = undefined;
  keyword.value = '';
  // 无网格公司两级联动无下一步(网格列恒空),收起组织面板直接展开项目候选;
  // 有网格公司保持先选网格、选完网格再收面板的原节奏
  if (!company.grids.length) {
    orgPanelVisible.value = false;
    projectPanelVisible.value = true;
  }
};

const handleSelectGrid = (grid: Grid) => {
  // 换网格后原项目不再属于当前范围,选中态与回填关键字一并重置;重选同一网格保留
  if (selectedGrid.value?.orgId !== grid.orgId) {
    selectedProject.value = undefined;
    keyword.value = '';
  }
  selectedGrid.value = grid;
  orgPanelVisible.value = false;
};

// 项目 id 省内唯一,跨省会撞号,选中态按 cityCode + id 复合判定
const isSameProject = (a: Project, b: Project) => a.cityCode === b.cityCode && a.id === b.id;

/** 项目名按关键字拆段(命中段高亮用):仅拆第一处命中,无关键字/未命中返回整段 */
const splitNameSegments = (name: string): { text: string; isHit: boolean }[] => {
  const kw = keyword.value.trim();
  const idx = kw ? name.indexOf(kw) : -1;
  if (idx < 0) return [{ text: name, isHit: false }];
  return [
    { text: name.slice(0, idx), isHit: false },
    { text: kw, isHit: true },
    { text: name.slice(idx + kw.length), isHit: false },
  ].filter((seg) => seg.text);
};

const handleSelectProject = (project: Project) => {
  const current = selectedProject.value;
  if (current && isSameProject(current, project)) {
    // 再点同一条取消选中,关键字保留便于继续编辑
    selectedProject.value = undefined;
    return;
  }
  selectedProject.value = project;
  // 选中即把项目名填入搜索框并收起候选列表
  keyword.value = project.name;
  projectPanelVisible.value = false;
};

// 手动编辑关键字后,输入内容不再对应所选项目,选中态失效清空并回到过滤列表
// (选中填入项目名不误伤:值与项目名相等)
watch(keyword, (kw) => {
  if (!selectedProject.value) return;
  if (kw === selectedProject.value.name) return;
  selectedProject.value = undefined;
  projectPanelVisible.value = true;
});

const handleReset = () => {
  selectedCompany.value = undefined;
  selectedGrid.value = undefined;
  selectedProject.value = undefined;
  keyword.value = '';
  orgPanelVisible.value = false;
  projectPanelVisible.value = false;
};

// 清空组织选择（公司 + 网格，项目选中态与回填关键字随之作废）
const handleClearOrg = () => {
  selectedCompany.value = undefined;
  selectedGrid.value = undefined;
  selectedProject.value = undefined;
  keyword.value = '';
};

// 清空项目搜索（关键字 + 已选项目）,恢复全量候选下拉
const handleClearKeyword = () => {
  keyword.value = '';
  selectedProject.value = undefined;
  projectPanelVisible.value = true;
};

const emit = defineEmits(['search']);

const route = useRoute();
const router = useRouter();

/** 当前视角(与大盘各页一致,query 驱动,缺省安全) */
const view = computed(() => (route.query.view === 'emergency' ? 'emergency' : 'security'));

// 搜索下钻优先级:选中项目(落到所属网格视角) > 公司+网格 > 公司;模板无独立项目页,项目下钻到其网格视角
const handleSearch = () => {
  const payload = {
    company: selectedCompany.value,
    grid: selectedGrid.value,
    project: selectedProject.value,
    keyword: keyword.value.trim(),
  };
  emit('search', payload);
  dialogRef.value?.close();

  if (payload.project) {
    router.push({
      path: `/dashboard-grid/${payload.project.cityCode}`,
      query: { grid: payload.project.gridOrgId, view: view.value },
    });
  } else if (payload.company && payload.grid) {
    router.push({
      path: `/dashboard-grid/${payload.company.cityCode}`,
      query: { grid: payload.grid.orgId, view: view.value },
    });
  } else if (payload.company) {
    router.push({ path: `/dashboard-grid/${payload.company.cityCode}`, query: { view: view.value } });
  } else if (route.params.city) {
    // 什么都没选:非首页(省/网格视角)回全国首页;首页仅关弹窗不跳转
    router.push({ path: '/dashboard', query: { view: view.value } });
  }
};

/** 打开弹窗按路由同步选中态(全国无选中/L2 预选公司/L3 预选公司+网格),并清空项目搜索瞬时状态 */
const syncSelectionFromRoute = () => {
  const cityCode = route.params.city as string;
  const company = companyList.value.find((c) => c.cityCode === cityCode);
  selectedCompany.value = company;
  const gridOrgId = (route.query.grid as string) || '';
  selectedGrid.value = company?.grids.find((g) => g.orgId === gridOrgId);
  selectedProject.value = undefined;
  keyword.value = '';
  orgPanelVisible.value = false;
  projectPanelVisible.value = false;
};

// 弹窗内点到输入区/候选列表之外时收起候选面板
const handleDocMousedown = (e: MouseEvent) => {
  if (rootRef.value?.contains(e.target as Node)) return;
  projectPanelVisible.value = false;
};

onMounted(() => document.addEventListener('mousedown', handleDocMousedown));
onBeforeUnmount(() => document.removeEventListener('mousedown', handleDocMousedown));

const open = () => {
  syncSelectionFromRoute();
  dialogRef.value?.open();
};

defineExpose({ open });
</script>

<style lang="scss" scoped>
.org-search {

  &__label {
    font-size: 14px;
    line-height: 20px;
    color: #78d1f0;

    &--project {
      margin-top: 16px;
    }
  }

  // 组织筛选选择框（设计稿 544×56）
  &__select {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 56px;
    margin-top: 14px;
    padding: 0 20px 0 18px;
    cursor: pointer;
    background: rgba(5, 31, 64, 0.96);
    border: 1px solid rgba(20, 140, 209, 0.8);
    border-radius: 4px;

    &--open {
      border: 2px solid #4fdbff;
      border-radius: 3px;
    }
  }

  // 框内右侧清空按钮（组织选择 / 项目关键字共用）
  &__clear {
    display: flex;
    align-items: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-left: 12px;
    cursor: pointer;
    transition: filter 0.2s ease;

    img {
      width: 100%;
      height: 100%;
      display: block;
    }

    &:hover {
      filter: brightness(1.4);
    }
  }

  &__select-text {
    flex: 1;
    min-width: 0;
    font-size: 16px;
    line-height: 1;
    color: #f0fbff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &--placeholder {
      color: #739eb8;
    }
  }

  &__select-arrow {
    width: 14px;
    height: 8px;
    flex-shrink: 0;
    margin-left: 12px;
    transform: rotate(180deg);

    &--up {
      transform: rotate(0deg);
    }
  }

  // 公司/网格下拉面板（设计稿 544×220）
  &__org-panel {
    box-sizing: border-box;
    display: flex;
    width: 100%;
    height: 220px;
    margin-top: 8px;
    overflow: hidden;
    background: rgba(3, 26, 54, 0.9);
    border: 1px solid rgba(42, 186, 239, 0.82);
    border-radius: 4px;
  }

  &__org-col {
    height: 100%;
    overflow-y: auto;

    &--company {
      width: 270px;
      flex-shrink: 0;
    }

    &--grid {
      flex: 1;
      min-width: 0;
    }

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(42, 186, 239, 0.4);
      border-radius: 2px;
    }
  }

  &__org-divider {
    width: 1px;
    flex-shrink: 0;
    background: rgba(27, 99, 132, 0.72);
  }

  // 行高 42px
  &__org-item {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 42px;
    padding: 0 16px 0 18px;
    cursor: pointer;

    &:hover {
      background: rgba(7, 91, 130, 0.4);
    }

    &--active,
    &--active:hover {
      background: rgba(7, 91, 130, 0.72);
    }
  }

  &__org-item-text {
    font-size: 16px;
    line-height: 1;
    color: #b7e8f8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    .org-search__org-item--active & {
      color: #e5f7ff;
    }
  }

  &__org-empty {
    padding: 18px;
    font-size: 14px;
    color: #739eb8;
  }

  // 项目搜索输入框（设计稿 544×56）
  &__input-box {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    height: 56px;
    margin-top: 14px;
    padding: 0 20px 0 18px;
    background: rgba(5, 31, 64, 0.96);
    border: 1px solid rgba(20, 140, 209, 0.8);
    border-radius: 4px;

    &:focus-within {
      border-color: #4fdbff;
    }
  }

  &__input-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  &__input {
    flex: 1;
    min-width: 0;
    margin-left: 16px;
    padding: 0;
    font-size: 16px;
    line-height: 1;
    color: #f0fbff;
    background: transparent;
    border: none;
    outline: none;

    &::placeholder {
      color: #739eb8;
    }
  }

  // 候选下拉箭头(尺寸/翻转与组织筛选框箭头一致)
  &__input-arrow {
    width: 14px;
    height: 8px;
    flex-shrink: 0;
    margin-left: 12px;
    cursor: pointer;
    transform: rotate(180deg);

    &--up {
      transform: rotate(0deg);
    }
  }

  &__hint {
    margin-top: 16px;
    font-size: 13px;
    line-height: 18px;
    color: #5e9db8;

    &--count {
      font-size: 14px;
      color: #63d9f7;
    }
  }

  &__count-num {
    color: #55e8ff;
  }

  // 搜索结果面板（设计稿 544×232，4 行 × 58px）
  &__result-panel {
    box-sizing: border-box;
    width: 100%;
    max-height: 232px;
    margin-top: 10px;
    overflow-y: auto;
    background: rgba(3, 26, 54, 0.92);
    border: 1px solid rgba(29, 135, 180, 0.72);
    border-radius: 4px;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(42, 186, 239, 0.4);
      border-radius: 2px;
    }
  }

  &__result-item {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    height: 58px;
    padding: 0 16px;
    cursor: pointer;

    &:hover {
      background: rgba(7, 91, 130, 0.4);
    }

    &--active,
    &--active:hover {
      background: rgba(7, 91, 130, 0.76);
    }
  }

  &__result-bullet {
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    margin-right: 12px;
    background: #23c7ee;
    border-radius: 50%;

    .org-search__result-item--active & {
      background: #8bf2ff;
    }
  }

  &__result-text {
    flex: 1;
    min-width: 0;
    font-size: 16px;
    line-height: 1;
    color: #bdeaf7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    .org-search__result-item--active & {
      color: #e5f7ff;
    }
  }

  // 项目名中与关键字匹配的文字高亮(选中行同样保持蓝色)
  &__result-hit {
    color: #63d9f7;
  }

  &__check {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-left: 12px;
  }

  // 底部按钮（设计稿 112×50）
  &__btn {
    box-sizing: border-box;
    width: 112px;
    height: 50px;
    padding: 0;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    border-radius: 4px;

    &--reset {
      color: #addef0;
      background: rgba(6, 41, 77, 0.9);
      border: 1px solid rgba(26, 140, 199, 0.86);
    }

    &--search {
      color: #f0fbff;
      background: #078cb9;
      border: 1px solid rgba(102, 235, 255, 0.86);
      box-shadow: 0 0 10px rgba(5, 178, 255, 0.28);
    }
  }
}
</style>
