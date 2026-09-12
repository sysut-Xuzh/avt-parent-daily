// 阿里云短信发送封装
// 环境变量：ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET
//          ALIYUN_SMS_SIGN_NAME（签名）/ ALIYUN_SMS_TEMPLATE_CODE（模板CODE）
// 说明：SDK 为 CommonJS 无类型，用 require 动态引入 + 类型忽略

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Dysmsapi = require("@alicloud/dysmsapi20170525");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OpenApi = require("@alicloud/openapi-client");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { RuntimeOptions } = require("@alicloud/tea-util");

const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID || "";
const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET || "";
const signName = process.env.ALIYUN_SMS_SIGN_NAME || "";
const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || "";

// 懒加载客户端（避免无配置时报错）
function getClient(): any {
  const config = new OpenApi.Config({
    accessKeyId,
    accessKeySecret,
    endpoint: "dysmsapi.aliyuncs.com",
  });
  return new Dysmsapi.Client(config);
}

/**
 * 发送短信验证码
 * @param phone 手机号（11位，不含+86）
 * @param code 6位验证码
 */
export async function sendSmsCode(
  phone: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  if (!accessKeyId || !accessKeySecret) {
    return { success: false, message: "缺少阿里云 AccessKey 配置" };
  }
  if (!signName || !templateCode) {
    return { success: false, message: "缺少短信签名或模板配置" };
  }

  try {
    const client = getClient();
    const request = new Dysmsapi.SendSmsRequest({
      phoneNumbers: phone,
      signName,
      templateCode,
      templateParam: JSON.stringify({ code }),
    });

    const response = await client.sendSmsWithOptions(
      request,
      new RuntimeOptions({})
    );

    if (response?.body?.code === "OK") {
      return { success: true, message: "发送成功" };
    }
    return {
      success: false,
      message: `发送失败: ${response?.body?.code || "?"} - ${response?.body?.message || "?"}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `异常: ${msg}` };
  }
}
