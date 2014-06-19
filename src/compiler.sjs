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

var adt = require('adt-simple')

// -- Data structures --------------------------------------------------
union Token {
  Tag { value: String },
  Name { value: String },
  Lit { value: * },
  Expr { value: * },
  Node { tag: Token, attributes: Array, children: Array },
  Attr { name: *, value: * },
  DynAttr { name: *, value: * }
} deriving (adt.Base)


// -- Parser -----------------------------------------------------------
ometa Parser {
  ws = space*,
  eof = ~char,

  digits = digit+:as -> Number(as.join('')),
  number = digits:a ('.' digits:b)? -> [#Lit, Number(a + '.' + (b || 0))],

  stringEscape = token('\\"'),
  stringChar   = (stringEscape | (~seq('"') char)):a -> a,
  string       = '"' <stringChar*>:as '"'            -> [#Lit, as],

  lit = string | number,

  tag = <(digit | letter)+>:a -> [#Tag, a.toLowerCase()],

  nameStart = letter | '_',
  nameRest  = digit | letter | '_' | '-' | '.',
  name      = <nameStart nameRest*>:a -> [#Name, a.toLowerCase()],

  text = <(~('<' | '>' | '(' | ')') char)+>:a -> [#Text, a],

  jschar = '(' jsexpr:xs ')' -> ('(' + xs + ')')
         | ~')' char,
  jsexpr = '(' <jschar+>:a ')' -> [#Expr, a],

  expr = '<' ws tag:t (ws attr:as)* ws '/' '>' -> [#VNode, as || [], t]
       | '<' ws tag:t (ws attr:as)* ws '>' expr*:xs ws '<' '/' ws tag:t2 ws '>' ?(t[1] === t2[1]) -> [#Node, t, as || [], xs || []]
       | jsexpr
       | text,

  attr = name:a ws '=' ws jsexpr:b -> [#DynAttr, a, b]
       | name:a ws '=' ws lit:b -> [#Attr, a, b],

  helm = (ws expr*):xs eof -> xs
}

ometa Compiler {
  Tag :a             -> Tag(a),
  Name :a            -> Name(a),
  Expr :a            -> Expr(a),
  Lit :a             -> Lit(a),
  VNode cc:t         -> Node(t, [], []),
  Node cc:t [cc*:xs] -> Node(t, [], xs),
  Attr cc:a cc:b     -> Attr(a, b),
  DynAttr cc:a cc:b  -> DynAttr(a, b)

  cc = [:t apply(t):a] -> a
}

// -- Public API -------------------------------------------------------
function compile(source) {
  
}

