export enum EmojiBoardTab {
  Emoji = 'Emoji',
  Gif = 'Gif',
  Sticker = 'Sticker',
}

export enum EmojiType {
  Emoji = 'emoji',
  CustomEmoji = 'customEmoji',
  Sticker = 'sticker',
}

export type EmojiItemInfo = {
  type: EmojiType;
  data: string;
  shortcode: string;
  label: string;
};
