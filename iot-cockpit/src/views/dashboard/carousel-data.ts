/**
 * 视频轮播面板素材数据层(mock 版,按视角联动组织架构:全国/省域/网格/单宗地)
 * 「重点项目」tab:视角范围内宗地一项目一帧,实拍图按项目 orgId 哈希稳定配;
 * 「AI事件」tab:视角范围内 mock 工单(event-data.ts)。
 * 接入真实接口时:getCarouselImages 两个分支换成真实请求即可,组件零改动。
 */

import Project1 from './assets/project1.png';
import Project2 from './assets/project2.png';
import Project3 from './assets/project3.png';
import { getMockAiEvents } from './event-data';
import { getCompanyByCityCode } from './grid-data';

import type { AiEventRecord } from './event-data';

import { LEDGER_ORG_LEAVES } from '@/store/org';

/** 轮播素材 tab 标识(重点项目 / AI事件) */
export type CarouselTab = 'project' | 'ai';

/** 素材视角(全国 = 均不传;省 = city;网格 = gridOrgId;单宗地 = parcelOrgId,宗地级最优先) */
export interface CarouselScope {
  city?: string;
  gridOrgId?: string;
  /** 宗地 orgId(单项目视角) */
  parcelOrgId?: string;
}

/** 轮播单帧素材:图片 + 可选角标(左下项目名/右下事件类型) */
export interface CarouselSlideData {
  /** 图片地址 */
  src: string;
  /** 左下角标题(项目名) */
  title?: string;
  /** 右下角标签(事件类型) */
  tag?: string;
  /** 帧对应宗地 orgId(重点项目帧跳视频轮播页单项目模式带参;AI事件帧无) */
  orgId?: string;
  /** 帧组织节点真实 type(随 orgId 透传) */
  orgType?: string;
  /** AI事件原始工单记录(点击帧打开详情弹窗;重点项目帧无) */
  record?: AiEventRecord;
}

/** 重点项目 mock 素材图(按项目 orgId 哈希稳定配,同项目刷新不换图) */
const PROJECT_IMAGES = [Project1, Project2, Project3];

/** 字符串简易哈希(字符码累加):稳定配图种子 */
const hashCodeOf = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash += value.charCodeAt(i);
  return hash;
};

/** 视角范围内宗地叶子(全国 = 全量;省/网格/宗地 = 对应层级) */
function ledgerLeavesOfScope(scope: CarouselScope) {
  if (scope.parcelOrgId) {
    return LEDGER_ORG_LEAVES.value.filter((leaf) => leaf.parcelOrgId === scope.parcelOrgId);
  }
  if (!scope.city && !scope.gridOrgId) return LEDGER_ORG_LEAVES.value;
  return LEDGER_ORG_LEAVES.value.filter((leaf) =>
    scope.gridOrgId ? leaf.gridOrgId === scope.gridOrgId : leaf.companyOrgId === getCompanyByCityCode(scope.city)?.orgId);
}

/** 「重点项目素材」mock:视角范围内宗地一项目一帧(模拟接口异步) */
function fetchProjectImages(scope: CarouselScope): Promise<CarouselSlideData[]> {
  const slides = ledgerLeavesOfScope(scope).map((leaf) => ({
    src: PROJECT_IMAGES[hashCodeOf(leaf.parcelOrgId) % PROJECT_IMAGES.length],
    title: leaf.parcel,
    tag: leaf.grid,
    orgId: leaf.parcelOrgId,
    orgType: leaf.parcelType,
  }));
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(slides), 200);
  });
}

/** 「AI事件素材」mock:视角范围内工单(项目名模糊匹配) */
async function fetchAiEventImages(scope: CarouselScope): Promise<CarouselSlideData[]> {
  const parcels = ledgerLeavesOfScope(scope).map((leaf) => leaf.parcel);
  const records = await getMockAiEvents(parcels.length ? parcels : undefined);
  return records.map((item) => ({
    src: item.troubleImg.split(',')[0] ?? '',
    title: item.orgName,
    tag: item.workOrderTypeName,
    record: item,
  })).filter((slide) => slide.src);
}

/** 按 tab + 视角取轮播素材 */
export function getCarouselImages(
  tab: CarouselTab,
  scope: CarouselScope = {},
): Promise<CarouselSlideData[]> {
  return tab === 'project' ? fetchProjectImages(scope) : fetchAiEventImages(scope);
}

/**
 * 「查看监控」跳视频轮播页路由目标:按面板视角带 orgId
 * (宗地级最优先且透传节点真实 type;网格级次之;省 = 省域公司 orgId;全国不传)
 */
export function buildVideoCarouselRoute(scope: CarouselScope): {
  path: string;
  query: { orgId?: string; type?: string };
} {
  if (scope.parcelOrgId) {
    const parcelType = LEDGER_ORG_LEAVES.value.find(
      (leaf) => leaf.parcelOrgId === scope.parcelOrgId,
    )?.parcelType;
    return {
      path: '/video-carousel/index',
      query: parcelType
        ? { orgId: scope.parcelOrgId, type: parcelType }
        : { orgId: scope.parcelOrgId },
    };
  }
  const orgId = scope.gridOrgId || getCompanyByCityCode(scope.city)?.orgId || '';
  return {
    path: '/video-carousel/index',
    query: orgId ? { orgId } : {},
  };
}
