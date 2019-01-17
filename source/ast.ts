import { defineFinal } from "./common";
import { escapeEntities, sanitizeHtml } from "./html";

function renderAttributes(attributes: Attribute[]) {
  return attributes.map(x => x.render()).join(" ");
}

function renderNodes(nodes: Html[]) {
  return nodes.map(x => x.render()).join("");
}

export type VoidTag =
  | "area"
  | "base"
  | "br"
  | "command"
  | "embed"
  | "hr"
  | "img"
  | "input"
  | "keygen"
  | "link"
  | "meta"
  | "param"
  | "source"
  | "track"
  | "wbr";

export type Tag =
  | "html"
  | "head"
  | "title"
  | "style"
  | "script"
  | "noscript"
  | "template"
  | "body"
  | "section"
  | "nav"
  | "article"
  | "aside"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "header"
  | "footer"
  | "address"
  | "main"
  | "p"
  | "pre"
  | "blockquote"
  | "ol"
  | "ul"
  | "li"
  | "dl"
  | "dt"
  | "dd"
  | "figure"
  | "figcaption"
  | "div"
  | "a"
  | "em"
  | "strong"
  | "small"
  | "s"
  | "cite"
  | "q"
  | "dfn"
  | "abbr"
  | "data"
  | "time"
  | "code"
  | "var"
  | "samp"
  | "kbd"
  | "sub"
  | "sup"
  | "i"
  | "b"
  | "u"
  | "mark"
  | "ruby"
  | "rt"
  | "rp"
  | "bdi"
  | "bdo"
  | "span"
  | "ins"
  | "del"
  | "iframe"
  | "object"
  | "video"
  | "audio"
  | "canvas"
  | "map"
  | "svg"
  | "math"
  | "table"
  | "caption"
  | "colgroup"
  | "col"
  | "tbody"
  | "thead"
  | "tfoot"
  | "tr"
  | "td"
  | "th"
  | "form"
  | "fieldset"
  | "legend"
  | "label"
  | "button"
  | "select"
  | "datalist"
  | "optgroup"
  | "options"
  | "textarea"
  | "output"
  | "progress"
  | "meter"
  | "details"
  | "summary"
  | "menuitem"
  | "menu";

/// HTML nodes
export abstract class Html {
  abstract render(): string;
}

export class ChildlessNode extends Html {
  readonly tag: VoidTag;
  readonly attributes: Attribute[];

  constructor(tag: string, attributes: Attribute[]) {
    super();
    defineFinal(this, "tag", tag);
    defineFinal(this, "attributes", attributes);
  }

  render() {
    return `<${this.tag} ${renderAttributes(this.attributes)} />`;
  }
}

export class Node extends Html {
  readonly tag: Tag;
  readonly attributes: Attribute[];
  readonly content: Html[];

  constructor(tag: string, attributes: Attribute[], content: Html[]) {
    super();
    defineFinal(this, "tag", tag);
    defineFinal(this, "attributes", attributes);
    defineFinal(this, "content", content);
  }

  render() {
    return `<${this.tag} ${renderAttributes(this.attributes)}>${renderNodes(
      this.content
    )}</${this.tag}>`;
  }
}

export class Text extends Html {
  readonly value: string;

  constructor(value: string) {
    super();
    defineFinal(this, "value", value);
  }

  render(): string {
    return escapeEntities(this.value);
  }
}

export class DynamicHtml extends Html {
  readonly value: () => Html;

  constructor(value: () => Html) {
    super();
    defineFinal(this, "value", value);
  }

  render() {
    const result = this.value.call(null);
    if (!(result instanceof Html)) {
      throw new TypeError(`Expected Html`);
    }

    return result.render();
  }
}

export class SafeHtml extends Html {
  readonly content: string;

  constructor(value: string) {
    super();
    defineFinal(this, "content", value);
  }

  render() {
    return sanitizeHtml(this.content);
  }
}

export class HtmlSplice extends Html {
  readonly values: Html[];

  constructor(values: Html[]) {
    super();
    defineFinal(this, "values", values);
  }

  render() {
    return renderNodes(this.values);
  }
}

/// Attribute nodes
export abstract class Attribute {
  abstract render(): string;
}

// FIXME: check if values are proper classes
export class ClassAttribute extends Attribute {
  readonly values: string[];

  constructor(values: string[]) {
    super();
    defineFinal(this, "values", values);
  }

  render() {
    const classes = this.values.map(x => escapeEntities(x)).join(" ");
    return `class="${classes}"`;
  }
}

export class IdAttribute extends Attribute {
  readonly name: string;

  constructor(name: string) {
    super();
    defineFinal(this, "name", name);
  }

  render() {
    return `id="${escapeEntities(this.name)}"`;
  }
}

export class DynamicAttribute extends Attribute {
  readonly value: () => Attribute;

  constructor(value: () => Attribute) {
    super();
    defineFinal(this, "value", value);
  }

  render() {
    const result = this.value.call(null);
    if (!(result instanceof Attribute)) {
      throw new TypeError(`Expected Attribute`);
    }

    return result.render();
  }
}

export class AttributeSplice extends Attribute {
  readonly values: Attribute[];

  constructor(values: Attribute[]) {
    super();
    defineFinal(this, "values", values);
  }

  render() {
    return renderAttributes(this.values);
  }
}
