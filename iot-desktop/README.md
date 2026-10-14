# 后厨管家 · AIoT 双边服务平台（桌面端）

面向厨房设备全生命周期管理的**双边服务平台**原型：平台运营方、厂家、终端客户三端一体，覆盖入驻审核、设备台账与绑定申报、告警响应、工单闭环与履约考核。

> 本工程是**静态演示原型**（内存态 mock 数据，刷新即复位），不是生产系统。
> 目的：让评审方能在浏览器里真实点通四条主链路，并**看见**租户数据隔离是真的在生效。

---

## 快速开始

```bash
cd iot-desktop
npm install          # 首次约 3~8 分钟（npm 缓存命中）
npm run dev          # 开发模式，http://localhost:9900
```

其他命令：

| 命令 | 说明 |
| --- | --- |
| `npm run build` | 类型检查 + 生产构建，产出 `dist/` |
| `npm run preview` | 预览构建产物（hash 路由，双击 `dist/index.html` 亦可） |
| `npm run type-check` | 仅跑 `vue-tsc --noEmit` |
| `npm run verify:mock` | **数据层回归护栏**：97 项断言（隔离 / 状态机 / 故事线 / 确定性） |

---

## 演示账号清单

登录页选账号即自动填表，**密码任意非空**即可（mock 模式）。

### 平台运营（4 个）

| 账号 | 角色 | 登录后落地 | 看什么 |
| --- | --- | --- | --- |
| `plat_admin` | 平台超级管理员 | `/platform/dashboard` | 全局总览；租户管理可冻结/解冻 |
| `plat_reviewer` | 入驻审核员 | `/platform/review/applications` | 入驻审核主入口 |
| `plat_ops` | 运营专员 | `/platform/alarms` | 告警实时流 |
| `plat_data` | 数据专员 | `/platform/vendor-performance` | 履约考核 |

### 厂家端（6 个）

| 账号 | 厂家类型 | 入驻状态 | 登录后落地 | 看什么 |
| --- | --- | --- | --- | --- |
| `vendor_ck_admin` | 厨具 | 正式入驻 | `/vendor/dashboard` | 设备台账 / 工单闭环主入口 |
| `vendor_ck_engineer` | 厨具 | 正式入驻 | `/vendor/work-orders` | 工单处理视角 |
| `vendor_iot_admin` | 物联网 | 正式入驻 | `/vendor/dashboard` | 多了「部件台账」菜单 |
| `vendor_iot_engineer` | 物联网 | 正式入驻 | `/vendor/components` | 部件台账视角 |
| `vendor_trial` | 厨具 | **试运营** | `/vendor/onboarding` | 试运营视角；无履约画像 |
| `vendor_unbound` | 物联网 | **未入驻** | `/vendor/onboarding` | 侧栏只有 2 项；可创建入驻申请 |

### 客户端（3 个）

| 账号 | 角色 | 登录后落地 |
| --- | --- | --- |
| `cust_school_admin` | 福州第一中学食堂 · 管理员 | `/customer/dashboard` |
| `cust_hotel_admin` | 厦门海景国际酒店 · 管理员 | `/customer/dashboard` |
| `cust_group_operator` | 福州金膳团餐 · 操作员 | `/customer/work-orders` |

---

## 四条主链路（点通顺序见 `docs/DEMO.md`）

| # | 链路 | 怎么验证 | 关键看点 |
| --- | --- | --- | --- |
| 1 | **入驻审核线** | `vendor_unbound` 建申请 → `plat_reviewer` 审核 | 7 态时间轴；整改/驳回必填原因 |
| 2 | **绑定申报线** | 厂家申报 → 客户确认 | 服务范围拦截；7 天自动生效倒计时 |
| 3 | **工单闭环线** | 厂家接单 → 进展 → 反馈 → 验收 | SLA 倒计时；备件登记；状态徽标变化 |
| 4 | **数据隔离可见线** | 三端来回切账号 | 顶栏徽标不同；列表条数变窄；越权返回空态 |

---

## 数据隔离是怎么做的（重要）

隔离**不靠页面自觉**，而是由三层管道强制执行：

```
views/*.vue  ──只允许调用──▶  api/*.ts  ──注入──▶  mock/query.ts（scopedQuery）
                                                      │
                                                      ▼
                                              mock/db.ts（唯一持有原始数组）
```

1. `mock/scope.ts` 的 `resolveScope(authStore)` 由登录态算出可见范围（设备 SN 集合 / 客户 ID 集合 / 厂家 ID 集合 / 脱敏字段 / 裁剪字段）
2. `mock/query.ts` 的 `scopedQuery / scopedFind / scopedMutate` 在**数据层**做行级过滤 + 字段裁剪 + 脱敏
3. 页面**物理上拿不到全量数组引用** —— `getDb()` 只被 `mock/query.ts` 与故事线工厂 import

想自己验证？在浏览器里把地址栏改成别的客户的设备 SN，详情页会返回空态 —— 那是 `scopedFind` 的可见性校验在拦你。

数据层的断言在 `src/mock/__verify.ts`，改任何隔离规则后跑一遍 `npm run verify:mock` 就知道有没有破坏。

---

## 目录结构

```
src/
├── api/          4 个入口的取数层（页面唯一入口，注入租户范围）
├── mock/         内存数据库 + 隔离管道 + 确定性工厂 + 预设故事线
├── constants/    状态机 / 状态码映射 / SLA / 菜单 / 字典 / 图表色板（唯一真源）
├── components/   三入口共用组件（布局壳 + 数据展示 + 控件 + 表单 + 反馈）
├── types/        22 个实体接口 + 枚举 + VO（单一真源，禁止反向 import）
├── store/        auth / app / filters（内存态，刷新复位，不做持久化）
├── router/       单 router + 4 个路由模块 + 集中守卫（hash 模式）
├── styles/       设计令牌（浅色主题唯一真源）+ mixin + EP 覆写
└── views/
    ├── common/       入口页 / 登录页 / 演示导览 / 隔离演示 / 403 / 404
    ├── platform/     平台方 17 页
    ├── vendor/       厂家端（第一批已实现 8 页主链路 + 7 页占位）
    └── customer/     客户端（第二批）
```

---

## 设计约定

- **浅色后台主题**：令牌集中在 `src/styles/variables.scss`，页面 SCSS 只允许写布局尺寸，不允许出色值
- **主色 `#41C0FF` 只用于底色/图表**；浅底上的文字型主色一律用 `--color-primary-text: #0B7CAE`（前者白底对比度仅 1.9:1，不达 AA）
- **状态徽标唯一出口**：`StatusBadge` 内部查 `constants/statusMap.ts`，页面禁止传色值
- **按钮组唯一出口**：由 `constants/stateMachine.ts` 的状态机驱动，改一处全局同步
- **不做跨入口联动**（PRD 约定）：厂家接单后客户页面不会自动刷新，mock 为内存态，刷新即复位

---

## 已知限制

- 内存态 mock，**刷新页面回到初始态**（按 PRD P2-04 约定，不做持久化）
- 导出只弹 Toast，不生成真实文件；上传只存文件名与大小
- 大屏不纳入本工程，`/platform/screen` 仅提供外链（`file://` 下可能被浏览器拦截，`.env` 可改绝对路径）
- 客户端 13 页与厂家端 P1 页面属**第二批**，当前为可达的占位实现