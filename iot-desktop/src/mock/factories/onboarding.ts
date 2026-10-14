/**
 * M-03 入驻申请（9 条，7 状态全覆盖）+ M-04 时间轴
 */
import { addDays } from '@/utils/date';

import type { Random } from '../types';
import type { OnboardingApplication, OnboardingStatus, ProductModel, TimelineRecord } from '@/types';

/** 申请定义：[vendorName, vendorType, tenantId|null, status] */
const APP_DEFS: Array<[string, OnboardingApplication['vendorType'], string | null, OnboardingStatus]> = [
  ['福州华厨设备制造有限公司', 'COOKWARE', 'TEN-0001', 'ACTIVE'],
  ['厦门智联感知科技有限公司', 'IOT', 'TEN-0002', 'ACTIVE'],
  ['泉州闽南灶具股份有限公司', 'COOKWARE', 'TEN-0003', 'TRIAL'],
  ['泉州蓝芯物联网科技有限公司', 'IOT', 'TEN-0004', 'DRAFT'],
  ['漳州海晟厨具有限公司', 'COOKWARE', null, 'REJECTED'],
  ['莆田汇智物联科技有限公司', 'IOT', null, 'RECTIFY'],
  ['龙岩新味餐饮设备有限公司', 'COOKWARE', null, 'REJECTED'],
  ['三明智控厨房设备有限公司', 'IOT', null, 'PENDING_SECONDARY'],
  ['宁德蓝海商用厨具有限公司', 'COOKWARE', null, 'ACTIVE'],
];

/** 复审技术对接字段映射模板 */
const FIELD_MAPPING = [
  { source: 'deviceSn', target: 'device.sn' },
  { source: 'temperature', target: 'metric.temperature' },
  { source: 'online', target: 'metric.online' },
];

/**
 * 生成入驻申请
 * @param r 随机工具
 * @param models 该厂家的产品型号（快照）
 * @returns 9 条申请
 */
export function genOnboardingApplications(
  r: Random,
  modelsByVendor: Record<string, ProductModel[]>,
): OnboardingApplication[] {
  return APP_DEFS.map(([vendorName, vendorType, tenantId, status], index) => {
    const submitTime = addDays(new Date().toISOString(), -(120 - index * 12));
    const models = modelsByVendor[tenantId ?? ''] ?? Object.values(modelsByVendor)[0] ?? [];
    const slaBase = vendorType === 'IOT' ? { acceptHours: 2, handleHours: 12, confirmHours: 48 } : { acceptHours: 1, handleHours: 8, confirmHours: 36 };

    return {
      id: `ONB-2026-${r.pad(index + 1, 4)}`,
      vendorName,
      vendorType,
      tenantId,
      status,
      submitTime: status === 'DRAFT' ? undefined : submitTime,
      stayDays: status === 'TRIAL' ? 23 : status === 'ACTIVE' ? 320 : r.int(0, 40),
      reviewer: ['林岚', '陈昊', '苏晴'][index % 3],
      legalEntity: vendorName,
      licenseNo: `913501${r.pad(r.int(10, 99), 2)}MA${r.pad(r.int(1000, 9999), 4)}XXX`,
      legalPerson: `${r.pick(['王', '李', '张', '陈', '林', '黄'])}${r.pick(['建国', '志强', '晓明', '文华', '海峰'])}`,
      registeredAddress: `福建省${r.pick(['福州市', '厦门市', '泉州市', '莆田市'])}${r.pick(['鼓楼区', '思明区', '鲤城区', '城厢区'])}${r.pick(['工业路', '湖滨南路', '刺桐路', '文献东路'])}${r.int(1, 200)}号`,
      productModels: models.slice(0, 4),
      engineerCount: r.int(3, 30),
      serviceRadius: `${r.pick(['30', '50', '80', '120', '200'])} 公里`,
      hasSpareWarehouse: r.bool(0.6),
      slaCommitment: slaBase,
      techIntegration:
        status === 'PENDING_SECONDARY' || status === 'TRIAL' || status === 'ACTIVE'
          ? { protocol: vendorType === 'IOT' ? 'MQTT/JSON v3.2' : 'Modbus-TCP v2.1', fieldMapping: FIELD_MAPPING, note: '联调已完成，字段映射无冲突' }
          : undefined,
      attachments: [
        { id: `AT-${r.pad(index * 3 + 1, 4)}`, name: '营业执照.pdf', category: 'LICENSE', size: r.int(200, 900) * 1024 },
        { id: `AT-${r.pad(index * 3 + 2, 4)}`, name: '产品手册.pdf', category: 'PRODUCT', size: r.int(500, 4000) * 1024 },
        { id: `AT-${r.pad(index * 3 + 3, 4)}`, name: '售后网点清单.xlsx', category: 'MATERIAL', size: r.int(50, 300) * 1024 },
      ],
      rejectReason: status === 'REJECTED' ? '技术对接能力不足，无 MQTT/Modbus 协议对接经验' : undefined,
      rectifyReason: status === 'RECTIFY' ? '售后工程师数量不足 10 人，请补充人员证明材料' : undefined,
      createdAt: addDays(submitTime, -2),
    } satisfies OnboardingApplication;
  });
}

/**
 * 生成入驻时间轴（每申请 3~6 条）
 * @param r 随机工具
 * @param applications 申请列表
 * @returns 时间轴数组
 */
export function genOnboardingTimelines(
  r: Random,
  applications: OnboardingApplication[],
): TimelineRecord[] {
  const records: TimelineRecord[] = [];
  let seq = 0;

  const push = (
    bizId: string,
    action: string,
    operator: string,
    operatorRole: TimelineRecord['operatorRole'],
    time: string,
    remark: string,
    fromStatus?: string,
    toStatus?: string,
  ): void => {
    seq += 1;
    records.push({
      id: `TL-${r.pad(seq, 5)}`,
      bizId,
      action,
      operator,
      operatorRole,
      time,
      remark,
      fromStatus,
      toStatus,
    });
  };

  applications.forEach((app) => {
    const base = app.submitTime ?? app.createdAt;
    push(app.id, '创建申请', `${app.vendorName}运营`, 'VENDOR_ADMIN', app.createdAt, '厂家填写入驻申请草稿', 'DRAFT', 'DRAFT');

    if (app.status === 'DRAFT') return;

    push(app.id, '提交审核', `${app.vendorName}运营`, 'VENDOR_ADMIN', base, '提交入驻申请，关键字段锁定', 'DRAFT', 'PENDING_PRIMARY');

    if (app.status === 'PENDING_PRIMARY') return;

    push(app.id, '通过初审', app.reviewer ?? '平台审核员', 'REVIEWER', addDays(base, 2), '主体资质与产品能力审核通过，进入技术对接与商务确认', 'PENDING_PRIMARY', 'PENDING_SECONDARY');

    if (app.status === 'PENDING_SECONDARY') return;

    if (app.status === 'RECTIFY') {
      push(app.id, '标记整改', app.reviewer ?? '平台审核员', 'REVIEWER', addDays(base, 4), app.rectifyReason ?? '资料需补充', 'PENDING_SECONDARY', 'RECTIFY');
      return;
    }

    if (app.status === 'REJECTED') {
      push(app.id, '驳回申请', app.reviewer ?? '平台审核员', 'REVIEWER', addDays(base, 5), app.rejectReason ?? '能力不满足准入要求', 'PENDING_SECONDARY', 'REJECTED');
      return;
    }

    push(app.id, '通过复审', app.reviewer ?? '平台审核员', 'REVIEWER', addDays(base, 6), '进入试运营期（60 天）', 'PENDING_SECONDARY', 'TRIAL');
    if (app.status !== 'TRIAL') return;

    push(app.id, '确认转正', '平台超级管理员', 'PLATFORM_ADMIN', addDays(base, 68), '试运营考核达标，确认转为正式入驻', 'TRIAL', 'ACTIVE');
  });

  return records;
}