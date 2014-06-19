// Copyright (c) 2014 Quildreen Motta
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation files
// (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge,
// publish, distribute, sublicense, and/or sell copies of the Software,
// and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/**
 * A type-safe HTML templating library.
 *
 * @module helm
 */

// -- Dependencies -----------------------------------------------------
var adt      = require('adt-simple');
var unary    = require('core.arity').unary;
var entities = require('ent');
var kindOf   = Function.call.bind({}.toString);
var URI      = require('net.uri').URI
var curry    = require('core.lambda').curry


// -- Constants --------------------------------------------------------
var DISABLED_NAMES = 'class contenteditable dir hidden id tabindex href'.split(' ')

var VOID_ELEMENTS = ["area", "base", "br", "command", "embed", "hr", "img"
                    ,"input", "keygen", "link", "meta", "param", "source"
                    ,"track", "wbr"];

var ELEMENTS = ["html", "head", "title", "style", "script", "noscript"
               ,"template", "body", "section", "nav", "article", "aside"
               ,"h1", "h2", "h3", "h4", "h5", "h6", "header", "footer"
               ,"address", "main", "p", "pre", "blockquote", "ol", "ul", "li"
               ,"dl", "dt", "dd", "figure", "figcaption", "div", "a", "em"
               ,"strong", "small", "s", "cite", "q", "dfn", "abbr", "data"
               ,"time", "code", "var", "samp", "kbd", "sub", "sup", "i", "b"
               ,"u", "mark", "ruby", "rt", "rp", "bdi", "bdo", "span", "ins"
               ,"del", "iframe", "object", "video", "audio", "canvas", "map"
               ,"svg", "math", "table", "caption", "colgroup", "col", "tbody"
               ,"thead", "tfoot", "tr", "td", "th", "form", "fieldset", "legend"
               ,"label", "button", "select", "datalist", "optgroup", "options"
               ,"textarea", "output", "progress", "meter", "details", "summary"
               ,"menuitem", "menu"];

// -- Helpers ----------------------------------------------------------
function pairs(o) {
  return Object.keys(o).map(λ(k) -> [k, o[k]])
}

function isVoid(tag) {
  return VOID_ELEMENTS.indexOf(tag.toLowerCase()) !== -1
}

// -- Type checkers ----------------------------------------------------
function isDisabled(a) {
  return DISABLED_NAMES.indexOf(a) !== -1
}

function isTagName(a) {
  a = a.toLowerCase();
  if (!/^[\d\w]+$/.test(a))  throw new TypeError('Expected valid tag, got: ' + a);
  return a
}

function isName(a) {
  a = a.toLowerCase();
  if (!/^[\w_][\w\d_\-\.]*$/.test(a))  throw new TypeError('Expected Name, got: ' + a);
  if (/on.+/.test(a) || isDisabled(a)) throw new TypeError('Invalid Name: ' + a);
  return a
}

function isId(a) {
  if (/\s/.test(a))  throw new TypeError('Expected ID');
  return a
}

function isAttributeArray(xs) {
  xs.forEach(function(x) {
    if (!(x instanceof Attribute))  throw new TypeError('Expected Attribute')
  });
  return xs
}

function isClassArray(xs) {
  xs.forEach(function(x) {
    if (kindOf(x) !== '[object String]') throw new TypeError('Expected String')
  });
  return xs
}

function isHtmlArray(xs) {
  xs.forEach(function(x) {
    if (!(x instanceof Html))  throw new TypeError('Expected Html')
  });
  return xs
}
function asSafeUrl(a) {
  var u = URI.fromString(a);
  if ((u.protocol || '').toLowerCase() === 'javascript:')
    throw new TypeError('javascript: protocols are not allowed.');
  return u
}


// -- Data structures --------------------------------------------------
union Html {
  ChildlessNode { tag: isTagName, attributes: Attribute },
  Node { tag: isTagName, attributes: Attribute, content: Html },
  Text { value: String },
  DynamicHtml { value: Function },
  HtmlSeq { values: isHtmlArray }
} deriving (adt.Base, adt.Cata)

union Attribute {
  Class { values: isClassArray },
  ContentEditable { value: ContentEditableValues },
  Dir { value: DirValues },
  Hidden { value: Boolean },
  Id { value: isId },
  TabIndex { value: Number },
  Href { value: asSafeUrl },
  Style { value: Object },
  Attr { name: isName, value: String },
  DynamicAttr { value: Function },
  AttrSeq { values: isAttributeArray }
} deriving (adt.Base, adt.Cata)

union ContentEditableValues {
  True, False, Inherit
} deriving (adt.Base, adt.Cata)

union DirValues {
  LTR, RTL, Auto
} deriving (adt.Base, adt.Cata)


// -- Rendering elements -----------------------------------------------
ChildlessNode::render = function() {
  return "<" + this.tag + " " + this.attributes.render() + ">"
}

Node::render = function() {
  return "<" + this.tag + " " + this.attributes.render() + ">"
       + this.content.render()
       + "</" + this.tag + ">"
}

Text::render = function(){
  return entities.encode(this.value)
}

DynamicHtml::render = function() {
  var result = this.value.call(null);
  if (!(result instanceof Html))  throw new TypeError('Expected Html');
  return result.render()
}

HtmlSeq::render = function() {
  return this.values.map(λ[#.render()]).join('')
}


// -- Rendering attributes ---------------------------------------------
Class::render = function() {
  return 'class="' + this.values.map(unary(entities.encode)).join(' ') + '"'
}

ContentEditable::render = function() {
  return 'contenteditable="' + this.value.render() + '"'
}

Dir::render = function() {
  return 'dir="' + this.value.render() + '"'
}

Hidden::render = function() {
  return this.value?      'hidden="hidden"'
  :      /* otherwise */  ''
}

Id::render = function() {
  return 'id="' + this.value + '"'
}

TabIndex::render = function() {
  return 'tabindex="' + Math.floor(this.value) + '"'
}

Href::render = function() {
  return 'href="' + this.value.toString() + '"'
}

Style::render = function() {
  return 'style="' + entities.encode(pairs(this.value)
                                       .map(λ(x) -> x[0] + ':' + x[1])
                                       .join('; ')) 
       + '"'
}

Attr::render = function() {
  return this.name + '="' + entities.encode(this.value) + '"'
}

DynamicAttr::render = function() {
  var result = this.value.call();
  if (!(result instanceof Attribute))  throw new TypeError('Expected Attribute')
  return result.render()
}

AttrSeq::render = function() {
  return this.values.map(λ[#.render()]).join(' ')
}

ContentEditableValues::render = function() { return match this {
  True    => "true",
  False   => "false",
  Inherit => "inherit"
}}

DirValues::render = function() { return match this {
  LTR  => "ltr",
  RTL  => "rtl",
  Auto => "auto"
}}


// -- Public interface -------------------------------------------------

// Utility functions for Html
var node        = exports.node        = curry(3, Html.Node);
var emptyNode   = exports.emptyNode   = curry(2, Html.ChildlessNode);
var text        = exports.text        = Text;
var dynamicHtml = exports.dynamicHtml = DynamicHtml;
var htmlSeq     = exports.htmlSeq     = HtmlSeq;

// Utility functions for attributes
var className       = exports.className       = Class;
var contentEditable = exports.contentEditable = ContentEditable;
var dir             = exports.dir             = Dir;
var hidden          = exports.hidden          = Hidden;
var id              = exports.id              = Id;
var tabIndex        = exports.tabIndex        = TabIndex;
var href            = exports.href            = Href;
var style           = exports.style           = Style;
var attr            = exports.attr            = curry(2, Attr);
var dynamicAttr     = exports.dynamicAttr     = DynamicAttr;
var attrSeq         = exports.attrSeq         = AttrSeq;

// Enums
exports.ContentEditableValues = ContentEditableValues;
exports.DirValues             = DirValues;

var elements = exports.elements = {}

// Common elements
VOID_ELEMENTS.forEach(λ(x) -> exports.elements[x] = emptyNode(x));
ELEMENTS.forEach(λ(x) -> exports.elements[x] = node(x));


// -- Simpler builder --------------------------------------------------
exports.build = build
function build(tag, attributes, children) {
  attributes = buildAttributes(attributes || {})
  children   = HtmlSeq(children || [])
  tag        = tag.toLowerCase()

  return isVoid(tag)?      ChildlessNode(tag, attributes)
  :      /* otherwise */   Node(tag, attributes, children)
}

exports.buildAttributes
function buildAttributes(attrs) {
  return AttrSeq(pairs(attrs).map(function(pair) {
    var key   = pair[0].toLowerCase()
    var value = pair[1]

    if (value instanceof Attribute)  return value

    switch(key) {
      case 'class':           return Class(value)
      case 'contenteditable': return ContentEditable(value)
      case 'dir':             return Dir(value)
      case 'hidden':          return Hidden(value)
      case 'id':              return Id(value)
      case 'tabindex':        return TabIndex(value)
      case 'href':            return Href(value)
      case 'style':           return Style(value)
      default:                return Attr(key, value)
    }
  }))
}
