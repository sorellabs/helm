import {
  Tag,
  Attribute,
  Html,
  Node,
  ChildlessNode,
  Text,
  DynamicHtml,
  HtmlSplice,
  SafeHtml,
  ClassAttribute,
  IdAttribute,
  DynamicAttribute,
  AttributeSplice,
  VoidTag
} from "./ast";

const ownKeys = Reflect.ownKeys;

const voidTags: Set<VoidTag> = new Set<VoidTag>([
  "area",
  "base",
  "br",
  "command",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);

export function isChildless(tag: string): tag is VoidTag {
  return voidTags.has(tag.toLowerCase() as any);
}

export function containerNode(
  tag: Tag,
  attributes: Attribute[],
  content: Html[]
) {
  return new Node(tag, attributes, content);
}

export function emptyNode(tag: VoidTag, attributes: Attribute[]) {
  return new ChildlessNode(tag, attributes);
}

export function text(content: string) {
  return new Text(content);
}

export function dynamicHtml(value: () => Html) {
  return new DynamicHtml(value);
}

export function htmlSplice(values: Html[]) {
  return new HtmlSplice(values);
}

export function safeHtml(content: string) {
  return new SafeHtml(content);
}

export function classNames(values: string[]) {
  return new ClassAttribute(values);
}

export function id(name: string) {
  return new IdAttribute(name);
}

export function dynamicAttribute(value: () => Attribute) {
  return new DynamicAttribute(value);
}

export function attributeSplice(values: Attribute[]) {
  return new AttributeSplice(values);
}

const $html = htmlSplice;
const $attr = attributeSplice;

export function node(
  tag: Tag | VoidTag,
  attributes: Attribute[],
  ...children: Html[]
) {
  if (isChildless(tag)) {
    return emptyNode(tag, attributes);
  } else {
    return containerNode(tag, attributes, children);
  }
}

export function attributes(
  record: Partial<{ className: string[]; id: string }>
) {
  return attributeSplice(
    ownKeys(record)
      .map(key => {
        switch (key) {
          case "className":
            return new ClassAttribute(record[key]);
          case "id":
            return new IdAttribute(record[key]);
          default:
            return null;
        }
      })
      .filter(x => x != null)
  );
}
