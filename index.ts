import * as dotenv from 'dotenv';
import fetch, { type Response } from 'node-fetch';
import type { MessageUpdatesResp } from './index.d';

dotenv.config(); // 从 .env 文件引入 TOKEN
const TOKEN = process.env.TOKEN || 'YOUR_BOT_TOKEN';
const UPDATE_LIMIT = 50; // 限制每次更新获取的消息数量
const REGEX = /https:\/\/twitter\.com\/[a-zA-Z0-9_\-.]+\//; // 匹配 twitter 链接

const url = {
  getUpdates: `https://api.telegram.org/bot${TOKEN}/getUpdates?`,
  editMessageText: `https://api.telegram.org/bot${TOKEN}/editMessageText?`,
  sendMessage: `https://api.telegram.org/bot${TOKEN}/sendMessage?`
};

const queue: {
  reqFn: () => Promise<Response>,
  callback: (res: Response) => void
}[] = [];
let flag = true;
function requestQueue(url: string, params: URLSearchParams, callback: (res: Response) => void) {
  queue.push({ reqFn: () => fetch(url + params), callback });

  if (queue.length !== 0 && flag) {
    flag = false;
    handleQueue();
  }
}

function handleQueue() {
  const task = queue.shift();

  if (task) {
    const _ = setTimeout(() => {
      task
        .reqFn()
        .then((res) => { task.callback(res); })
        .finally(() => {
          handleQueue();
          flag = true;
        });
    }, 1000);
  }
}

function replaceMessage(text: string): string {
  return text.replace(/twitter/, 'vxtwitter').split('?')[0];
}

async function getMessage(offset?: number): Promise<MessageUpdatesResp> {
  const parmas = new URLSearchParams({
    offset: offset?.toString() ?? '',
    limit: UPDATE_LIMIT.toString(),
    allowed_updates: '["channel_post","message"]' // 限定只接收 message 和 channel_post 更新
  });

  const res = await fetch(url.getUpdates + parmas, {
    method: 'GET'
  });

  if (!res.ok)
    throw new Error(`${res.status} ${res.statusText}`);

  return (res.json()) as Promise<any>;
}

/**
 *
 * @param messageId 消息 id
 * @param chatId 消息来源的 chat id
 * @param text 消息内容
 */

function editChannelMessage(messageId: number, chatId: number, text: string) {
  const replaceText = replaceMessage(text);
  const params = new URLSearchParams({
    chat_id: chatId.toString(),
    message_id: messageId.toString(),
    text: replaceText
  });

  const callback = (res: Response) => {
    if (!res.ok)
      throw new Error(`${res.status} ${res.statusText}`);

    console.info(`message ${messageId} edit success`);
  };

  try {
    requestQueue(url.editMessageText, params, callback);
  } catch (e) {
    console.error(e);
  }
}

function replyMessage(originalMessageId: number, chatId: number, text: string) {
  const replaceText = replaceMessage(text);
  const params = new URLSearchParams({
    chat_id: chatId.toString(),
    reply_to_message_id: originalMessageId.toString(),
    text: replaceText
  });

  const callback = (res: Response) => {
    if (!res.ok)
      throw new Error(`${res.status} ${res.statusText}`);

    console.info(`reply message to ${originalMessageId}`);
  };

  try {
    requestQueue(url.sendMessage, params, callback);
  } catch (e) {
    console.error(e);
  }
}

let lastUpdateId: number | undefined; // 最后一条消息的 id，请求时 + 1 表示获取的更新已处理
const _ = setInterval(async () => {
  try {
    const data = (await getMessage(lastUpdateId)).result;
    const updateId = data.at(-1)?.update_id;
    lastUpdateId = updateId ? updateId + 1 : undefined;

    const filterData: {
      type: 'message' | 'channel_post',
      message_id: number | undefined,
      chat_id: number | undefined,
      text: string | undefined
    }[] = data
      .filter(({ message, channel_post }) => REGEX.test(message?.text ?? '') || REGEX.test(channel_post?.text ?? ''))
      .map(({ message, channel_post }) => {
        return {
          type: message ? 'message' : 'channel_post',
          message_id: message?.message_id ?? channel_post?.message_id,
          chat_id: message?.chat.id ?? channel_post?.chat.id,
          text: message?.text ?? channel_post?.text
        };
      });

    const messageNumber = filterData.length;
    console.info(messageNumber ? `${messageNumber} messages need edit` : 'no messages need edit');

    if (messageNumber) {
      filterData.forEach((item) => {
        if (!item.chat_id || !item.message_id || !item.text) {
          console.error('message data error');
          return;
        }

        if (item.type === 'channel_post')
          editChannelMessage(item.message_id, item.chat_id, item.text);
        else
          replyMessage(item.message_id, item.chat_id, item.text);
      });
    }
  } catch (e) {
    console.error(e);
  }
}, 1000 * 10); // 每十秒检查一次更新
