macro $helm__load {
  rule { } => {
    typeof module !== 'undefined' && typeof require !== 'undefined'?  require('helm')
    :      /* otherwise */                                            window.Helm
  }
}

macro $helm {
  rule { $body } => {
    (helm__compile $body)($helm__load, {})
  }
}

macro helm__compile {
  case { _ $body } => {
    var context = #{$body}[0].context;
    var source  = #{$body}[0].token.value.raw;

    function _copyContext(tokens, context) {
      tokens.forEach(function(token) {
        token.context = context
        if (token.token.inner)  _copyContext(token.token.inner, context)
      })
    }

    var compile = require('../lib/compiler').compile;
    var result = parser.read(compile(source));
    result.pop(); // EOF
    _copyContext(result, context);
    return result;
  }
}


// -- Helpers ----------------------------------------------------------
macro $toString {
  case { _ $a } => {
    var val = #{$a}[0].token.value;
    var stx = makeValue(val, #{here});
    return withSyntax ($val = [stx]) {
      return #{$val}
    }
  }
}

export $helm
