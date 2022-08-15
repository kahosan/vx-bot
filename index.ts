import fetch from 'node-fetch';
import type { ChannelUpdatesResp } from './index.d';

const TOKEN = 'YOUR_BOT_TOKEN';
const MAXLIMIT = 2; // 限制每秒请求次数
const updateLimit = 10;

const url = {
  getUpdates: `https://api.telegram.org/bot${TOKEN}/getUpdates?`,
  editMessageText: `https://api.telegram.org/bot${TOKEN}/editMessageText?`,
};

let lastUpdateId: number; // 最后一条消息的 id，请求时 + 1 表示获取的更新已处理

async function getChannelMessage(offset?: number): Promise<ChannelUpdatesResp[]> {
  const parmas = new URLSearchParams({
    offset: offset?.toString(),
    limit: updateLimit.toString(),
    allowed_updates: "['channel_post']", // 限定只接收 channel_post 更新
  });

  const res = await fetch(url.getUpdates + parmas, {
    method: 'GET',
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const data: any = await res.json();

  return data.result;
}

async function editChannelMessage(chatId: number, messageId: number, text: string) {
  const replaceText = text.replace(/twitter/, 'vxtwitter');
  const params = new URLSearchParams({
    chat_id: chatId.toString(),
    message_id: messageId.toString(),
    text: replaceText,
  });

  const res = fetch(url.editMessageText + params);

  return { res, messageId };
}

const requestList: Promise<{ res: Promise<Response>; messageId: number }>[] = [];

setInterval(async () => {
  try {
    const data = await getChannelMessage(lastUpdateId);
    lastUpdateId = data[data.length - 1]?.update_id + 1;

    const filterData = data.filter(
      item =>
        item.channel_post.text.includes('twitter') && !item.channel_post.text.includes('vxtwitter')
    );

    console.log(filterData.length ? `${filterData.length} messages need edit` : 'no messages');

    if (filterData.length > 0) {
      filterData.forEach(async item => {
        requestList.push(
          editChannelMessage(
            item.channel_post.chat.id,
            item.channel_post.message_id,
            item.channel_post.text
          )
        );
      });
    }
  } catch (e) {
    console.log(e);
  }

  if (requestList.length) {
    for (let i = 0; i < MAXLIMIT; i++) {
      requestList?.shift().then(async ({ res, messageId }) => {
        try {
          const data = await res;
          if (!data.ok) {
            throw new Error(`${data.status} ${data.statusText}`);
          }
        } catch (e) {
          console.log(e);
        }

        console.log(`message ${messageId} edit success`);
      });
    }
  }
}, 10000);
