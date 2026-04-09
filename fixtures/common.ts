import type {
  InaccessibleNotionAPIUser,
  NotionAPIAnnotations,
  NotionAPIBlockBase,
  NotionAPIColor,
} from '#types/index';

export const defaultTime = '2020-01-01T00:00:00Z';
export const defaultInaccessibleUser: InaccessibleNotionAPIUser = {
  object: 'user',
  id: 'uuid',
};

/** default block properties for test fixture creation */
export const defaultBlockProperties: NotionAPIBlockBase = {
  object: 'block',
  id: 'uuid',
  archived: false,
  in_trash: false,
  created_by: defaultInaccessibleUser,
  created_time: defaultTime,
  has_children: false,
  last_edited_by: defaultInaccessibleUser,
  last_edited_time: defaultTime,
  parent: {
    type: 'page_id',
    page_id: 'uuid',
  },
};

/** default color value for test fixtures */
export const defaultColor: NotionAPIColor = 'default';

/** default text annotations for rich text fixtures */
export const defaultRichTextAnnotations: NotionAPIAnnotations = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  color: 'default',
};
