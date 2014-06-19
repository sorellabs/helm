// Copyright (c) 2014 Quildreen Motta <quildreen@gmail.com>
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
 * A compiler for the helm DSL.
 *
 * @module helm/compiler
 */

require('ometajs')
var adt       = require('adt-simple')
var extend    = require('xtend')
var esprima   = require('esprima')
var escodegen = require('escodegen')

// -- Data structures --------------------------------------------------
union Token {
  Tag { value: String },
  Name { value: String },
  Lit { value: * },
  HtmlExpr { value: String },
  Node { tag: Token, attributes: Array, children: Array },
  Text { value: String },
  Attr { name: Token, value: Token },
  DynAttr { value: String },
  Expr { value: String }
} deriving (adt.Base)

var parser = require('./parser')(Token)

// -- Helpers ----------------------------------------------------------
function parseExpr(code) {
  var tokens = esprima.parse(code).body
  if (tokens.length !== 1 || tokens[0].type !== 'ExpressionStatement')
    throw new SyntaxError('Expected a single expression.')
  return tokens[0].expression
}

// -- Code generation --------------------------------------------------
function node(type, body) {
  return extend({ type: type }, body)
}

function lit(value) {
  return node('Literal', { value: value })
}

function call(callee, args) {
  return node('CallExpression', { callee: callee
                                , arguments: args })
}

function expr(body) {
  return node('ExpressionStatement', { expression: body })
}

function block(body) {
  return node('BlockStatement', { body: body })
}

function ret(value) {
  return node('ReturnStatement', { argument: value })
}

function fn(id, params, body, others) {
  return node( 'FunctionExpression'
             , extend( { id: id
                       , params: params
                       , body: block([body])
                       , expression: false
                       , generator: false }
                     , others))
}

function thunk(body) {
  return fn(null, [], ret(body), {})
}

function member(object, property, computed) {
  return node( 'MemberExpression'
             , { object: object
               , property: property
               , computed: !!computed })
}

function id(a) {
  return node('Identifier', { name: a })
}

function method(object, method, args) {
  return call(member(object, method, false), args)
}

function obj(xs) {
  return node( 'ObjectExpression'
             , { properties: xs.map(function(x) {
                                      return { key: x[0]
                                             , value: x[1]
                                             , kind: 'init' } })})
}

function array(xs) {
  return node('ArrayExpression', { elements: xs })
}

function cc {
  Tag(v)        => lit(v),
  Name(v)       => lit(v),
  Lit(v)        => lit(v),
  Expr(v)       => parseExpr(v),
  HtmlExpr(v)   => method(id('$_helm'), id('dynamicHtml'), [thunk(parseExpr(v))]),
  Text(v)       => method(id('$_helm'), id('text'), [lit(v)]),
  Node(t,as,xs) => method( id('$_helm'), id('build')
                         , [cc(t), array(as.map(cc)), array(xs.map(cc))]),
  Attr(n, v)    => method(id('$_helm'), id('makeAttr'), [cc(n), cc(v)]),
  DynAttr(v)    => method(id('$_helm'), id('dynamicAttr'), [thunk(parseExpr(v))])
}



// -- Public API -------------------------------------------------------
exports.compile = compile
function compile(source) {
  var tokens = parser.Parser.matchAll(source, 'helm');
  var ast    = parser.Compiler.match(tokens, 'cc');
  var seq    = method(id('$_helm'), id('htmlSeq'), [array(ast.map(cc))])

  return escodegen.generate(fn(null, [id('$_helm'), id('$scope')]
                               , ret(seq), {}))
}
