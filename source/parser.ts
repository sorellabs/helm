import * as Path from "path";
import * as FS from "fs";
import * as Ohm from "ohm-js";
import { Html, Attribute, HtmlSplice, ChildlessNode, Node, Text } from "./ast";
import { isChildless, node, attributes } from "./builder";
const { CstToAst } = require("./ohm-to-ast");

const grammarSource = FS.readFileSync(
  Path.join(__dirname, "html-grammar.ohm"),
  "utf8"
);
const grammar = Ohm.grammar(grammarSource);

function parseToAst(source: string) {
  const match = grammar.match(source);
  if (match.failed()) {
    throw new SyntaxError(match.message);
  } else {
    return match;
  }
}

function translate(
  cst: Ohm.MatchResult,
  insertions: (Html | Attribute)[]
): HtmlSplice {
  return CstToAst(
    cst,
    new class CstToAstVisitor {
      Fragment(nodes: Html[]) {
        return new HtmlSplice(nodes);
      }

      Node_container(
        this: any,
        _1: any,
        tag: string,
        attributes: Attribute[],
        _2: any,
        children: Html[],
        _3: any,
        endTag: string | null,
        _4: any
      ) {
        if (tag !== endTag) {
          const pos = this.source.position.endPosition;
          throw new SyntaxError(
            `Unmatched tag ${tag} at ${pos.line}, ${pos.column}.\n\n${
              this.source.sourceSlice
            }`
          );
        }

        if (isChildless(tag)) {
          if (children.length === 0) {
            return new ChildlessNode(tag as any, attributes);
          } else {
            throw new SyntaxError(
              `The element ${tag} does not accept any content.`
            );
          }
        } else {
          return new Node(tag as any, attributes, children);
        }
      }

      Node_void(_1: any, tag: string, attributes: Attribute[], _2: any) {
        return node(tag as any, attributes);
      }

      Text(content: string) {
        return new Text(content);
      }

      JsExpr(point: number) {
        if (point < 0 || point >= insertions.length) {
          throw new RangeError(
            `Insertion out of range ${point} out of ${
              insertions.length
            } (this is an internal error)`
          );
        }

        return insertions[point];
      }

      // FIXME: include a primitive for this
      Attribute_js(attr: string, _1: any, expr: Attribute) {
        return attributes({ [attr]: expr });
      }

      Attribute_literal(attr: string, _1: any, value: string) {
        return attributes({ [attr]: value });
      }

      insertion_point(_1: any, digits: string[], _2: any) {
        return Number(digits.join(""));
      }

      Literal(value: string) {
        return JSON.parse(value);
      }
    }()
  );
}
