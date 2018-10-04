## File name
File names must be all lowercase and may includedashes (-), but no additional punctuation (kebab-case). Filenames’ extension must be .js.

### Example:
* app-helpers.js

## License/Copyright information
Every file should start with copyright insformation

## Indentation
Each time a new block or block-like construct is opened, the indent increases by two spaces. When the block ends, the indent returns to the previous indent level. The indent level applies to both code and comments throughout the block.

## Braces
Braces are required for all control structures (i.e. `if`, `else`, `for`, `do`, `while`, as well as any others), even if the body contains only a single statement.

## Function expressions
When declaring an anonymous function in the list of arguments for a function call, the body of the function is indented two spaces more than the preceding indentation depth.

### Example:
```
some.reallyLongFunctionCall(arg1, arg2, arg3)
    .thatsWrapped()
    .then((result) => {
      // Indent the function body +2 relative to the indentation depth
      // of the '.then()' call.
      if (result) {
        result.use()
      }
    })
```

## Switch statements
As with any other block, the contents of a switch block are indented +2.

### Example:
```
switch (animal) {
  case Animal.BANDERSNATCH:
    handleBandersnatch();
    break;

  case Animal.JABBERWOCK:
    handleJabberwock();
    break;

  default:
    throw new Error('Unknown animal');
}
```

## Semicolons are not required

## Vertical whitespace
A single blank line appears:

* Between consecutive methods in a class or object literal
  * Exception: A blank line between two consecutive properties definitions in an object literal (with no other code between them) is optional. Such blank lines are used as needed to create logical groupings of fields.
* Within method bodies, sparingly to create logical groupings of statements. Blank lines at the start or end of a function body are not allowed.
* Optionally before the first or after the last method in a class or object literal (neither encouraged nor discouraged).

## Horizontal whitespace
Use of horizontal whitespace depends on location, and falls into three broad categories: leading (at the start of a line), trailing (at the end of a line), and internal. Leading whitespace (i.e., indentation) is addressed elsewhere. Trailing whitespace is forbidden.

Beyond where required by the language or other style rules, and apart from literals, comments, and JSDoc, a single internal ASCII space also appears in the following places only.

* Separating any reserved word (such as if, for, or catch) from an open parenthesis (() that follows it on that line.
* Separating any reserved word (such as else or catch) from a closing curly brace (}) that precedes it on that line.
* Before any open curly brace ({), with two exceptions:
  * Before an object literal that is the first argument of a function or the first element in an array literal (e.g. foo({a: [{c: d}]})).
  * In a template expansion, as it is forbidden by the language (e.g. abc${1 + 2}def).
* On both sides of any binary or ternary operator.
* After a comma (,) or semicolon (;). Note that spaces are never allowed before these characters.
* After the colon (:) in an object literal.
* On both sides of the double slash (//) that begins an end-of-line comment. Here, multiple spaces are allowed, but not required.
* After an open-JSDoc comment character and on both sides of close characters (e.g. for short-form type declarations or casts: this.foo = /** @type {number} */ (bar); or function(/** string */ foo) {).

## Function arguments
Prefer to put all function arguments on the same line as the function name. If doing so would exceed the 80-column limit, the arguments must be line-wrapped in a readable way. To save space, you may wrap as close to 80 as possible, or put each argument on its own line to enhance readability. Indentation should be four spaces. Aligning to the parenthesis is allowed, but discouraged. Below are the most common patterns for argument wrapping:
```
// Arguments start on a new line, indented four spaces. Preferred when the
// arguments don't fit on the same line with the function name (or the keyword
// "function") but fit entirely on the second line. Works with very long
// function names, survives renaming without reindenting, low on space.
doSomething(
    descriptiveArgumentOne, descriptiveArgumentTwo, descriptiveArgumentThree) {
  // …
}

// If the argument list is longer, wrap at 80. Uses less vertical space,
// but violates the rectangle rule and is thus not recommended.
doSomething(veryDescriptiveArgumentNumberOne, veryDescriptiveArgumentTwo,
    tableModelEventHandlerProxy, artichokeDescriptorAdapterIterator) {
  // …
}

// Four-space, one argument per line.  Works with long function names,
// survives renaming, and emphasizes each argument.
doSomething(
    veryDescriptiveArgumentNumberOne,
    veryDescriptiveArgumentTwo,
    tableModelEventHandlerProxy,
    artichokeDescriptorAdapterIterator) {
  // …
}
```

## Use `const` and `let`
Declare all local variables with either const or let. Use const by default, unless a variable needs to be reassigned. The var keyword must not be used.

## Use trailing commas:
Include a trailing comma whenever there is a line break between the final element and the closing bracket.

### Example:
```
const values = [
  'first value',
  'second value',
]
```

## Arrow functions
Arrow functions provide a concise syntax and fix a number of difficulties with `this`. Prefer arrow functions over the `function` keyword, particularly for nested functions.

## Use single quotes in string literals

## For loops
With ES6, the language now has three different kinds of `for` loops. All may be used, though `for-of` loops should be preferred when possible.

`for-in` loops may only be used on objects, and should not be used to iterate over an array. `Object.prototype.hasOwnProperty` should be used in `for-in` loops to exclude unwanted prototype properties. Prefer `for-of` and `Object.keys` over `for-in` when possible.

## Naming
* Variables, function and parameter names must be camelCase
* Classes and Enums must be PascalCase
* Constant literals must be SNAKE_CASE (all caps)
