/**
 * AI 事件 mock 数据(轮播/详情弹窗/台账页共用)。
 * 字段口径与真实工单接口对齐,接入真实接口时替换 getMockAiEvents 为请求即可。
 */

/** AI 事件工单记录(模板所需字段子集) */
export interface AiEventRecord {
  id: string;
  /** 点位名 */
  pointName: string;
  /** 宗地/项目名 */
  orgName: string;
  /** 工单大类名 */
  workOrderTypeName: string;
  /** 状态(0待办 1处理中 2已完结) */
  status: string;
  statusName: string;
  /** 整改前图(逗号分隔多张) */
  troubleImg: string;
  /** 整改后图 */
  normalImg?: string;
  /** 摄像头点位 */
  cameraPoint?: string;
  /** 问题创建时间 */
  createTime: string;
  remark?: string;
}

import Event1 from './assets/project1.png';
import Event2 from './assets/project2.png';
import Event3 from './assets/project3.png';

const MOCK_EVENTS: AiEventRecord[] = [
  {
    id: 'EV20260918001',
    pointName: '中关村壹号-东门通道',
    orgName: '中关村壹号',
    workOrderTypeName: '消防通道占用',
    status: '0',
    statusName: '待办',
    troubleImg: Event1,
    cameraPoint: '东门 1 号枪机',
    createTime: '2026-09-18 09:24:11',
    remark: '杂物堆放占用消防通道',
  },
  {
    id: 'EV20260917002',
    pointName: '望京科技园-B2 车库',
    orgName: '望京科技园',
    workOrderTypeName: '烟雾识别',
    status: '1',
    statusName: '处理中',
    troubleImg: Event2,
    normalImg: Event3,
    cameraPoint: 'B2 西区 3 号球机',
    createTime: '2026-09-17 22:10:03',
    remark: '疑似烟雾,已派单现场核查',
  },
  {
    id: 'EV20260916003',
    pointName: '丽泽商务中心-大堂',
    orgName: '丽泽商务中心',
    workOrderTypeName: '人员聚集',
    status: '2',
    statusName: '已完结',
    troubleImg: Event3,
    normalImg: Event1,
    cameraPoint: '大堂 2 号枪机',
    createTime: '2026-09-16 15:42:37',
    remark: '高峰期短时聚集,已疏导',
  },
  {
    id: 'EV20260915004',
    pointName: '裕华产业园-配电房',
    orgName: '裕华产业园',
    workOrderTypeName: '配电箱门未关',
    status: '0',
    statusName: '待办',
    troubleImg: Event2,
    cameraPoint: '配电房 1 号枪机',
    createTime: '2026-09-15 11:05:52',
  },
  {
    id: 'EV20260914005',
    pointName: '燕郊科创园-北门',
    orgName: '燕郊科创园',
    workOrderTypeName: '违停识别',
    status: '1',
    statusName: '处理中',
    troubleImg: Event1,
    cameraPoint: '北门 4 号枪机',
    createTime: '2026-09-14 08:31:20',
    remark: '货车违停卸货区',
  },
];

/**
 * 取 mock AI 事件(模拟接口异步;范围过滤按 orgName 模糊匹配,全国 = 全量)。
 * 接入真实接口时删除本函数,改调 work-order/page。
 */
export function getMockAiEvents(scopeOrgNames?: string[]): Promise<AiEventRecord[]> {
  const list = scopeOrgNames?.length
    ? MOCK_EVENTS.filter((item) => scopeOrgNames.some((name) => item.orgName.includes(name)))
    : MOCK_EVENTS;
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(list), 200);
  });
}
