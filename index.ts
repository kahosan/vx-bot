import fetch from 'node-fetch';
import type { MessageUpdatesResp } from './index.d';

const TOKEN = 'YOUR_BOT_TOKEN';
const UPDATE_LIMIT = 50; // 限制每次更新获取的消息数量
const REGEX = /((?<=\/)twitter)/; // 匹配 twitter 链接

const url = {
  getUpdates: `https://api.telegram.org/bot${TOKEN}/getUpdates?`,
  editMessageText: `https://api.telegram.org/bot${TOKEN}/editMessageText?`,
  sendMessage: `https://api.telegram.org/bot${TOKEN}/sendMessage?`,
};

function replaceMessage(text: string) {
  return text.replace(/twitter/, 'vxtwitter');
}

async function getChannelMessage(offset?: number): Promise<MessageUpdatesResp> {
  const parmas = new URLSearchParams({
    offset: offset?.toString(),
    limit: UPDATE_LIMIT.toString(),
    allowed_updates: `["channel_post","message"]`, // 限定只接收 message 和 channel_post 更新
  });

  const res = await fetch(url.getUpdates + parmas, {
    method: 'GET',
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const data: any = await res.json();

  return data;
}

/**
 *
 * @param messageId 消息 id
 * @param chatId 消息来源的 chat id
 * @param text 消息内容
 * @param offset 延迟请求
 */

function editChannelMessage(messageId: number, chatId: number, text: string, offset: number) {
  const replaceText = replaceMessage(text);
  const params = new URLSearchParams({
    chat_id: chatId.toString(),
    message_id: messageId.toString(),
    text: replaceText,
  });

  setTimeout(async () => {
    try {
      const res = await fetch(url.editMessageText + params);
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
    } catch (e) {
      console.log(e);
    }

    console.log(`message ${messageId} edit success`);
  }, 1000 * offset);
}

// 再多些请求就把请求逻辑单独抽出来
function replyMessage(originalMessageId: number, chatId: number, text: string, offset: number) {
  const replaceText = replaceMessage(text);
  const params = new URLSearchParams({
    chat_id: chatId.toString(),
    reply_to_message_id: originalMessageId.toString(),
    text: replaceText,
  });

  setTimeout(async () => {
    try {
      const res = await fetch(url.sendMessage + params);
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
    } catch (e) {
      console.log(e);
    }

    console.log(`reply message to ${originalMessageId}`);
  }, 1000 * offset);
}

let lastUpdateId: number; // 最后一条消息的 id，请求时 + 1 表示获取的更新已处理
setInterval(async () => {
  try {
    const data = (await getChannelMessage(lastUpdateId)).result;
    lastUpdateId = data[data.length - 1]?.update_id + 1;

    const filterData: {
      type: 'message' | 'channel_post';
      message_id: number;
      chat_id: number;
      text: string;
    }[] = data
      .filter(({ message, channel_post }) => REGEX.test(message?.text) || REGEX.test(channel_post?.text))
      .map(({ message, channel_post }) => {
        return {
          type: message ? 'message' : 'channel_post',
          message_id: message?.message_id ?? channel_post?.message_id,
          chat_id: message?.chat.id ?? channel_post?.chat.id,
          text: message?.text ?? channel_post?.text,
        };
      });

    const messageNumber = filterData.length;
    console.log(messageNumber ? `${messageNumber} messages need edit` : 'no messages need edit');

    if (messageNumber) {
      filterData.forEach((item, index) => {
        if (item.type === 'channel_post') {
          editChannelMessage(item.message_id, item.chat_id, item.text, index);
        } else {
          replyMessage(item.message_id, item.chat_id, item.text, index);
        }
      });
    }
  } catch (e) {
    console.log(e);
  }
}, 1000 * 30); // 每半分钟检查一次更新
