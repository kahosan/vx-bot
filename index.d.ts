export interface MessageUpdatesResp {
  ok: boolean,
  result: Array<{
    update_id: number,
    message?: {
      message_id: number,
      from: {
        id: number,
        is_bot: boolean,
        first_name: string,
        username: string,
        language_code: string
      },
      chat: {
        id: number,
        title: string,
        username: string,
        type: string
      },
      date: number,
      text: string
    },
    channel_post?: {
      message_id: number,
      sender_chat: {
        id: number,
        title: string,
        username: string,
        type: string
      },
      chat: {
        id: number,
        title: string,
        username: string,
        type: string
      },
      date: number,
      text: string
    }
  }>
}

export interface PixivDailyRanking {
  contents: Array<{
    title: string,
    date: string,
    tags: Array<string>,
    url: string,
    illust_type: string,
    illust_book_style: string,
    illust_page_count: string,
    user_name: string,
    profile_img: string,
    illust_content_type: {
      sexual: number,
      lo: boolean,
      grotesque: boolean,
      violent: boolean,
      homosexual: boolean,
      drug: boolean,
      thoughts: boolean,
      antisocial: boolean,
      religion: boolean,
      original: boolean,
      furry: boolean,
      bl: boolean,
      yuri: boolean
    },
    illust_series: boolean,
    illust_id: number,
    width: number,
    height: number,
    user_id: number,
    rank: number,
    yes_rank: number,
    rating_count: number,
    view_count: number,
    illust_upload_timestamp: number,
    attr: string
  }>,
  mode: string,
  content: string,
  page: number,
  prev: boolean,
  next: number,
  date: string,
  prev_date: string,
  next_date: boolean,
  rank_total: number
}
