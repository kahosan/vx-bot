import fetch from 'node-fetch';
import type { ChannelUpdatesResp } from './index.d';

const TOKEN = 'YOUR_BOT_TOKEN';
const UPDATE_LIMIT = 10; // 限制每次更新获取的消息数量

const url = {
  getUpdates: `https://api.telegram.org/bot${TOKEN}/getUpdates?`,
  editMessageText: `https://api.telegram.org/bot${TOKEN}/editMessageText?`,
};

let lastUpdateId: number; // 最后一条消息的 id，请求时 + 1 表示获取的更新已处理

async function getChannelMessage(offset?: number): Promise<ChannelUpdatesResp[]> {
  const parmas = new URLSearchParams({
    offset: offset?.toString(),
    limit: UPDATE_LIMIT.toString(),
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

/**
 *
 * @param chatId 消息来源的 chat id
 * @param messageId 消息 id
 * @param text 消息内容
 * @param offset 延迟请求
 */

function editChannelMessage(chatId: number, messageId: number, text: string, offset: number) {
  const replaceText = text.replace(/twitter/, 'vxtwitter');
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

setInterval(async () => {
  try {
    const data = await getChannelMessage(lastUpdateId);
    lastUpdateId = data[data.length - 1]?.update_id + 1;

    const filterData = data.filter(
      item =>
        item.channel_post.text.includes('twitter') && !item.channel_post.text.includes('vxtwitter')
    );

    console.log(filterData.length ? `${filterData.length} messages need edit` : 'no messages');

    if (filterData.length) {
      filterData.forEach((item, index) => {
        editChannelMessage(
          item.channel_post.chat.id,
          item.channel_post.message_id,
          item.channel_post.text,
          index
        );
      });
    }
  } catch (e) {
    console.log(e);
  }
}, 1000 * 60); // 每分钟检查一次更新
