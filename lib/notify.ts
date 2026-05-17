/**
 * 企微应用消息推送
 * TODO: 企微接口文档确认后，在此实现 token 获取与消息发送
 * 当前：打印到控制台，用于验证定时任务逻辑
 */
export async function sendWeComMessage(content: string): Promise<void> {
  const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  console.log(`[企微通知] ${timestamp}`)
  console.log(`  内容：${content}`)

  // 企微接口接入后替换为实际实现：
  // const token = await getAccessToken()
  // await fetch('https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=' + token, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     touser: process.env.WECOM_TO_USER,
  //     msgtype: 'text',
  //     agentid: process.env.WECOM_AGENT_ID,
  //     text: { content },
  //   }),
  // })
}
