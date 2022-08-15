export interface ChannelUpdatesResp {
  update_id: number;
  channel_post: {
    message_id: number;
    sender_chat: {
      id: number;
      title: string;
      username: string;
      type: string;
    };
    chat: {
      id: number;
      title: string;
      username: string;
      type: string;
    };
    date: number;
    text: string;
  };
}