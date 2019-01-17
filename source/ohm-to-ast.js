const Ohm = require("ohm-js");
const OhmToAST = require("./ohm-to-ast-helper").helper;

/**
 * Retrieves the last element of the array. Or null if the index
 * isn't within the array's bounds.
 *
 * @template T
 * @param {Array<T>} array
 * @returns {null | T}
 */
function last(array) {
  return array.length === 0 ? null : array[array.length - 1];
}

/**
 * An entry in the source cache, which allows computing the line/column
 * offsets in the source code without repeating the work all the time.
 */
class CacheEntry {
  constructor(source) {
    /**
     * The source code that this entry represents.
     * @type string
     */
    this.source = source;

    /**
     * A list of pre-computed line offsets.
     * @type Array<number>
     */
    this.lines = [];

    /**
     * A set of line offsets we've already found.
     * @type Set<number>
     */
    this.lineSet = new Set();
  }

  /**
   * Computes the line/column offsets for a given indexPoint.
   *
   * This is `O(nm)` in the worst case and `O(m)` in the best case,
   * with `n` being the number of characters in the source code we need to scan,
   * and `m` being the number of lines in the pre-computed line offsets.
   *
   * Line and column offsets are 0-based.
   *
   * @param {number} indexPoint
   * @returns {{ line: number, column: number }}
   */
  computePosition(indexPoint) {
    this._buildIndexes(indexPoint);
    let count = 0;
    let lastLine = 0;
    for (const line of this.lines) {
      if (line <= indexPoint) {
        lastLine = line + 1;
        count += 1;
      } else {
        break;
      }
    }

    return {
      line: count,
      column: Math.max(0, indexPoint - lastLine)
    };
  }

  /**
   * Builds the pre-computed array of line offsets up to `indexPoint`.
   *
   * @private
   * @param {number} indexPoint
   */
  _buildIndexes(indexPoint) {
    const source = this.source;
    const isNewline = c => c === "\n" || c === "\r";

    const startIndex = (last(this.lines) || -1) + 1;
    for (let index = startIndex; index <= indexPoint; ++index) {
      const c = source.charAt(index);
      if (isNewline(c)) {
        // We also need to handle Windows' newlines.
        if (c === "\r" && source.charAt(index + 1) === "\n") {
          index += 1;
        }
        if (!this.lineSet.has(index)) {
          this.lines.push(index);
          this.lineSet.add(index);
        }
      }
    }
  }
}

/**
 * A source cache allows a mapping from multiple sources to
 * cache entries of source positions.
 */
class SourceCache {
  constructor() {
    /**
     * The caches we have available, with the source code as key.
     *
     * @type Map<string, CacheEntry>
     */
    this.cache = new Map();
  }

  /**
   * Computes the start and end line/column offsets from a start/end
   * index offset pair, for the given source code.
   *
   * @param {string} source
   * @param {{ start: number, end: number }} offset
   * @returns {{ start: LineOffset, end: LineOffset }}
   */
  computePosition(source, offset) {
    let cache = this.cache.get(source);
    if (cache == null) {
      cache = new CacheEntry(source);
      this.cache.set(source, cache);
    }

    return {
      start: cache.computePosition(offset.start),
      end: cache.computePosition(offset.end)
    };
  }
}

/**
 * A global cache of source positions.
 */
const globalCache = new SourceCache();

/**
 * A structure that holds the position of a CST node in the source code,
 * and allows lazily computing the line/column offsets.
 */
class Position {
  constructor(data, { filename = null }) {
    /**
     * The original source where this CST node was found.
     * @type string
     */
    this.sourceString = data.sourceString;

    /**
     * The initial character offset of this node.
     * @type number
     */
    this.startIndex = data.startIdx;

    /**
     * The final character offset of this node.
     * @type number
     */
    this.endIndex = data.endIdx;

    /**
     * The starting line/column offset of this node (if computed).
     * @type LineOffset | null
     */
    this.startPosition = null;

    /**
     * The final line/column offset of this node (if computed).
     * @type LineOffset | null
     */
    this.endPosition = null;

    /**
     * The filename from which this source was parsed.
     * @type string | null
     */
    this.filename = filename;
  }

  /**
   * Returns the absolute character offsets for this node.
   * @returns {{ start: number, end: number }}
   */
  offset() {
    return {
      start: this.startIndex,
      end: this.endIndex
    };
  }

  /**
   * Returns the line/column offsets for this node, computing it if
   * that hasn't been done yet.
   *
   * @returns {{ start: LineOffset, end: LineOffset }}
   */
  position() {
    if (this.startPosition == null || this.endPosition == null) {
      const { start, end } = globalCache.computePosition(
        this.sourceString,
        this.offset()
      );
      this.startPosition = start;
      this.endPosition = end;
    }

    return {
      start: this.startPosition,
      end: this.endPosition
    };
  }

  /**
   * Returns the source slice for this node.
   *
   * @returns {string}
   */
  get sourceSlice() {
    return this.sourceString.slice(this.startIndex, this.endIndex);
  }
}

/**
 * Constructs an Ohm parser from the given Ohm grammar source.
 *
 * @param {string} code
 * @returns {(source: string, rule: string | undefined) => AST}
 */
function makeParser(code) {
  const grammar = Ohm.grammar(code);

  const parse = (source, rule, { filename }) => {
    const match = grammar.match(source, rule);
    if (match.failed()) {
      throw new SyntaxError(match.message);
    }

    return match;
  };

  return parse;
}

function CstToAst(match, bindings) {
  const visitor = Reflect.ownKeys(bindings)
    .map(x => {
      const args = Array.from(
        { length: bindings[x].length },
        (_, i) => `$${i}`
      );
      const fn = new Function(
        "fn",
        `return function (${args.join(", ")}) { return fn(this, ${args.join(
          ", "
        )}) }`
      )((ctx, ...args) => {
        const meta = {
          children: args.map(x => new Position(x.source, { filename: "" })),
          source: new Position(ctx.source, { filename: "" })
        };
        return bindings[x].call(
          meta,
          ...args.map(x => x.toAST(ctx.args.mapping))
        );
      });
      return {
        [x]: fn
      };
    })
    .reduce((a, b) => Object.assign(a, b), {});

  return OhmToAST(match, visitor);
}

module.exports = {
  makeParser,
  CstToAst
};
