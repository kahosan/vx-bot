export type MessageUpdatesResp = {
  ok: boolean
  result: Array<{
    update_id: number
    message?: {
      message_id: number
      from: {
        id: number
        is_bot: boolean
        first_name: string
        username: string
        language_code: string
      }
      chat: {
        id: number
        title: string
        username: string
        type: string
      }
      date: number
      text: string
    }
    channel_post?: {
      message_id: number
      sender_chat: {
        id: number
        title: string
        username: string
        type: string
      }
      chat: {
        id: number
        title: string
        username: string
        type: string
      }
      date: number
      text: string
    }
  }>
}
