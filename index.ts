import * as dotenv from 'dotenv';
import type { Response } from 'node-fetch';
import fetch from 'node-fetch';
import type { MessageUpdatesResp, PixivDailyRanking } from './index.d';

import { subDays, format, addDays } from 'date-fns';

dotenv.config(); // 从 .env 文件引入 TOKEN
const TOKEN = process.env.TOKEN || 'YOUR_BOT_TOKEN';
const UPDATE_LIMIT = 50; // 限制每次更新获取的消息数量
const REGEX = /https:\/\/twitter\.com\/[a-zA-Z0-9_\-.]+\//; // 匹配 twitter 链接

const PIXIV_PUSH = false;

const url = {
  getUpdates: `https://api.telegram.org/bot${TOKEN}/getUpdates?`,
  editMessageText: `https://api.telegram.org/bot${TOKEN}/editMessageText?`,
  sendMessage: `https://api.telegram.org/bot${TOKEN}/sendMessage?`,
  sendPhoto: `https://api.telegram.org/bot${TOKEN}/sendPhoto?`
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
    setTimeout(() => {
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
setInterval(async () => {
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
        // else
          // 暂时关掉群组回复
          // replyMessage(item.message_id, item.chat_id, item.text);
      });
    }
  } catch (e) {
    console.error(e);
  }
}, 1000 * 10); // 每十秒检查一次更新

if (PIXIV_PUSH) {
  const chatId = process.env.CHAT_ID;
  if (!chatId)
    throw 'CHAT_ID is empty, please set CHAT_ID in .env file';

  const date = new Date();

  // 使用 date-fns 获取前一天的日期
  const prevDate = subDays(date, 1);
  // 获取偏移量
  // const diff = () => addDays(date, 1).setHours(20) - date.getTime();
  const diff = () => date.setHours(20) - date.getTime();

  const getPixivRankData = async () => {
    const officeApi = 'https://pixiv.net/ranking.php?mode=daily&content=illust&format=json';

    const res = await fetch(officeApi);
    let rankData: PixivDailyRanking | undefined;

    try {
      rankData = await res.json() as PixivDailyRanking;
    } catch (e) {
      console.error('get pixiv rank data error');
    }

    if (!rankData || rankData.date !== format(prevDate, 'yyyyMMdd')) {
      console.error(`rank date ${rankData?.date ?? ''} is not ${format(prevDate, 'yyyyMMdd')}`);
      return;
    }

    return rankData.contents;
  };

  const pushRankData = async () => {
    const illusts = await getPixivRankData();

    if (!illusts) {
      // 没有获取到前一天的数据，延迟一小时再次获取
      console.error('get pixiv rank data error, retry after 1 hour');
      setTimeout(pushRankData, 1000 * 60 * 60);
      return;
    }

    // 取前六
    const illustsData = illusts.slice(0, 6);

    // 首先发送日期;
    await fetch(url.sendMessage, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Pixiv 日榜更新\n#PixivDailyRanking'
      })
    });

    const fetchList = illustsData.map(illust => {
      return async () => {
        const { title, tags, illust_id, user_id, user_name } = illust;

        const pcRes = await fetch('https://api.pixiv.cat/v1/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: `p=${illust_id}`
        });

        const pcData = await pcRes.json() as any;

        const originalUrl = pcData.original_url_proxy;
        const artworks = `https://www.pixiv.net/artworks/${illust_id}`;
        const users = `https://www.pixiv.net/users/${user_id}`;

        const res = await fetch(url.sendPhoto, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: originalUrl,
            caption: `[${title}](${artworks}) | [${user_name}](${users})\n${tags.map(tag => `#${tag}`).join(' ')}`,
            parse_mode: 'Markdown'
          })
        });

        if (!res.ok) {
          console.error(`push pixiv rank data error, ${res.status} ${res.statusText}`);
          console.error(originalUrl);
          return;
        }

        console.info(`${title} push success | id ${illust_id}`);
      };
    });

    for (const pushFn of fetchList) {
      // eslint-disable-next-line no-await-in-loop -- 等待上一次请求完成
      await pushFn();
    }

    console.info(`push pixiv rank data success ${date.toLocaleString()}`);

    setTimeout(pushRankData, diff());
  };

  setTimeout(pushRankData, diff());
}
