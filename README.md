helm
====

[![Build Status](https://secure.travis-ci.org/robotlolita/helm.png?branch=master)](https://travis-ci.org/robotlolita/helm)
[![NPM version](https://badge.fury.io/js/helm.png)](http://badge.fury.io/js/helm)
[![Dependencies Status](https://david-dm.org/robotlolita/helm.png)](https://david-dm.org/robotlolita/helm)
[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges)


A type-safe HTML templating library.


## Example

```js
var _    = require('helm').build
var text = require('helm').text
var attr = require('helm').makeAttr

function link(a){
  return _('a', [attr('class', ['link']), attr('href', a.url)], [text(a.text)])
}

var items = [
  { url: '/example/a', text: 'Something' }
, { url: '/example/b', text: 'More stuff' }
]

var page = _('html', [], [
            , _('head', [], [
               , _('title', [], [text('Helm')])
               , _('meta', [attr('charset', 'utf-8')])])
            , _('body'
               , _('div', [ attr('id', 'content')
                          , attr('class', ['item-list', 'simple-list'])]
                  , items.map(link)))])
```

Or with the Sweet.js macros:

```js
var _    = require('helm').build
var text = require('helm').text
var seq  = require('helm').htmlSeq

function link(a){
  return $helm `<a class=(["link"]) href=(a.url)>(text(a.text))</a>`
}

var items = [
  { url: '/example/a', text: 'Something' }
, { url: '/example/b', text: 'More stuff' }
]

var page = $helm `
  <html>
    <head>
      <title>Helm</title>
      <meta charset="utf-8" />
    </head>
    <body>
      <div id="content" class=(["item-list", "simple-list"])>
        (seq(items.map(link)))
      </div>
    </body>
  </html>
`
```

All resulting in this HTML structure:

```html
<html>
  <head>
    <title>Helm</title>
    <meta charset="utf-8">
  </head>
  <body>
    <div id="content" class="item-list simple-list">
      <a class="link" href="/example/a">Something</a>
      <a class="link" href="/example/b">More stuff</a>
    </div>
  </body>
</html>
```


## Installing

The easiest way is to grab it from NPM. If you're running in a Browser
environment, you can use [Browserify][]

    $ npm install helm


### Using with CommonJS

If you're not using NPM, [Download the latest release][release], and require
the `helm.umd.js` file:

```js
var Helm = require('helm')
```


### Using with AMD

[Download the latest release][release], and require the `helm.umd.js`
file:

```js
require(['helm'], function(Helm) {
  ( ... )
})
```


### Using without modules

[Download the latest release][release], and load the `helm.umd.js`
file. The properties are exposed in the global `Helm` object:

```html
<script src="/path/to/helm.umd.js"></script>
```


### Compiling from source

If you want to compile this library from the source, you'll need [Git][],
[Make][], [Node.js][], and run the following commands:

    $ git clone git://github.com/robotlolita/helm.git
    $ cd helm
    $ npm install
    $ make bundle
    
This will generate the `dist/helm.umd.js` file, which you can load in
any JavaScript environment.

    
## Documentation

You can [read the documentation online][docs] or build it yourself:

    $ git clone git://github.com/robotlolita/helm.git
    $ cd helm
    $ npm install
    $ make documentation

Then open the file `docs/index.html` in your browser.


## Platform support

This library assumes an ES5 environment, but can be easily supported in ES3
platforms by the use of shims. Just include [es5-shim][] :)


## Licence

Copyright (c) 2014 Quildreen Motta.

Released under the [MIT licence](https://github.com/robotlolita/helm/blob/master/LICENCE).

<!-- links -->
[Fantasy Land]: https://github.com/fantasyland/fantasy-land
[Browserify]: http://browserify.org/
[Git]: http://git-scm.com/
[Make]: http://www.gnu.org/software/make/
[Node.js]: http://nodejs.org/
[es5-shim]: https://github.com/kriskowal/es5-shim
[docs]: http://robotlolita.github.io/helm
<!-- [release: https://github.com/robotlolita/helm/releases/download/v$VERSION/helm-$VERSION.tar.gz] -->
[release]: https://github.com/robotlolita/helm/releases/download/v0.0.0/helm-0.0.0.tar.gz
<!-- [/release] -->
