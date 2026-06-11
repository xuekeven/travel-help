# 12306 买票助手 · Chrome Extension

## 安装方式（开发者模式，无需上架）

1. 打开 Chrome，地址栏输入 `chrome://extensions/`
2. 右上角开启 **「开发者模式」**
3. 点击 **「加载已解压的扩展程序」**
4. 选择本项目的 `extension/` 目录
5. 插件加载成功，工具栏出现图标

## 首次配置

1. 点击工具栏图标，直接在弹出的面板中填写配置；也可以右键图标 → 「选项」
2. 填写 **服务器地址**（**HTTPS**，与 Mixed Content 策略兼容；路径需包含助手前缀）：
   - 示例：`https://homeserver.tailed5977.ts.net/12306`（**无**末尾 `/`）
   - 若仅内网 HTTP + 反代映射到本机，且扩展仍走 background `fetch`，也可用 `http://<Tailscale IP>:3005/12306`（与 `next.config` 的 `basePath` 一致）
3. 打开 **「启用」** 开关；未启用时，进入 12306 相关页面不会渲染状态条，也不会拦截接口或同步数据
4. 填写 **同步 Token**：与服务器 `.env` 中 `EXTENSION_SYNC_TOKEN` 一致
5. 点击 **「保存设置」**
6. 点击 **「测试连接」** 确认服务器可访问

## 使用方式

1. 登录 12306（<https://kyfw.12306.cn>）
2. 进入「候补订单」页面，或进入「火车票订单」里的「未出行订单」页面
3. 页面加载完成后插件自动拦截接口响应并同步
4. 打开 Chrome DevTools Console，看到 `[12306助手] ✅ 已同步 N 条候补订单` 或 `[12306助手] ✅ 已同步 N 条出行订单` 表示成功
5. 刷新助手页面即可看到最新候补订单或出行订单数据

## 候补订单接口字段说明（已通过实际抓包验证 ✅）

- **接口**：`POST /otn/afterNateOrder/queryUnHonourHOrder`
- **页面**：`https://kyfw.12306.cn/otn/view/lineUp_order.html`
- **数据路径**：`response.data.list[]`

每条候补订单（`list` 中的一项）包含 `needs[]` 数组，表示用户设置的多个候补方案（可同时候补多个车次或目的地）。

| 助手字段 | 12306 实际字段 | 说明 |
|---|---|---|
| `orderNo` | `raw.reserve_no` | 订单号（`sequence_no` 为空） |
| `status` | `raw.status_name` | "待兑现"、"已兑现" 等 |
| `price` | `raw.prepay_amount` | 预付金额（最高档票价） |
| `ticketCount` | `raw.passengers.length` | 乘客数量 |
| `departureDate` | `needs[0].train_date` | "YYYY-MM-DD" |
| `fromStation` | `needs[0].from_station_name` | 始发站 |
| `toStation` | `needs[].to_station_name` | 终到站（多目的地用 "/" 连接） |
| `trainNumbers` | `needs[].board_train_code` | 所有候补车次（去重聚合） |
| `seatType` | `needs[0].seat_name` | "二等座" 等中文名 |
| `departureTime` | `needs[0].start_time` | "HH:mm" |
| `arrivalTime` | `needs[0].arrive_time` | "HH:mm" |

## 未出行订单接口说明

- **接口**：`POST /otn/queryOrder/queryMyOrder`
- **页面**：`https://kyfw.12306.cn/otn/view/train_order.html` 的「未出行订单」页签
- **数据路径**：`response.data.OrderDTODataList[]`

插件会先过滤 `OrderDTODataList`：状态为「已退票」「已改签」「已出站」的订单不视为有效未出行订单，不推送给本地服务；其余有效订单由服务端解析并按“订单”存储。同步策略是全量替换：当前接口返回空数组或过滤后无有效订单时，也会同步空数据并清空本地出行订单表。

运行记录会输出过滤统计，例如：

```text
[12306助手] 检测到 5 条出行订单，其中 2 条已退票订单，1 条已改签订单，2 条有效订单，准备同步...
[12306助手] 已同步 2 条出行订单到 https://homeserver.tailed5977.ts.net/12306
```

注意：`POST /otn/queryOrder/queryMyOrderNoComplete` 是「未完成订单」接口，不是「未出行订单」，插件会明确忽略该接口。
