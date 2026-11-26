import assert from "node:assert/strict";
import test from "node:test";
import "../../src/stringpp/index.js";
import { charAdd } from "../../min/runtime/string/charAdd.js";
import { compareIt } from "../../min/runtime/string/compareIt.js";
import { indexOfAll } from "../../min/runtime/string/indexOfAll.js";
import { indexOfOccurIn } from "../../min/runtime/string/indexOfOccurIn.js";
import { sanitizeHtml } from "../../min/runtime/string/sanitizeHtml.js";
import { sanitizeRegex } from "../../min/runtime/string/sanitizeRegex.js";
import { snakeToTitleCase } from "../../min/runtime/string/snakeToTitleCase.js";
import { titleToSnakeCase } from "../../min/runtime/string/titleToSnakeCase.js";
import { trimIt } from "../../min/runtime/string/trimIt.js";

function agree(expected, actual, dispatched) {
   assert.deepEqual(actual, expected);
   assert.deepEqual(dispatched, expected);
}

test("escape, trim, search, and recase the old string fixtures", () => {
   agree("Hello \\[world\\] \\- how's this\\?", "Hello [world] - how's this?".sanitizeRegex(), sanitizeRegex("Hello [world] - how's this?"));
   agree("&#x3C;div class=&#x22;&#x22; style=&#x22;&#x22;&#x3E;&#x3C;/div&#x3E;", '<div class="" style=""></div>'.sanitizeHtml(), sanitizeHtml('<div class="" style=""></div>'));
   agree("b", "a".charAdd(1), charAdd("a", 1));
   agree("asdf", "----asdf--".trimIt("-"), trimIt("----asdf--", "-"));
   agree(5, "abaaca".indexOfOccurIn("a", 4), indexOfOccurIn("abaaca", "a", 4));
   agree([1, 4], "abaaba".indexOfAll("b"), indexOfAll("abaaba", "b"));
   agree("Hello World", "hello_world".snakeToTitleCase(), snakeToTitleCase("hello_world"));
   agree(" Good-Bye World ", "_good-bye_world_".snakeToTitleCase(), snakeToTitleCase("_good-bye_world_"));
   agree("ABC Incorporated", "a_b_c_incorporated".snakeToTitleCase(), snakeToTitleCase("a_b_c_incorporated"));
   agree("emcypte_prp", "Emcypte P.R.P.".titleToSnakeCase(), titleToSnakeCase("Emcypte P.R.P."));
   agree("marth_vg_sun", "Marth VG Sun".titleToSnakeCase(), titleToSnakeCase("Marth VG Sun"));
});

test("compareIt keeps the documented flags and ignores an unknown flag character", () => {
   const cases = [
      ["asdf", "asde", undefined, 1],
      ["asde", "asdf", undefined, -1],
      ["asdf", "asdfa", undefined, -1],
      ["asdfa", "asdf", undefined, 1],
      ["asdf", "asdfa", "l", 1],
      ["asdfa", "asdf", "l", -1],
      ["asdf", "ASDF", "i", 0],
      ["asdf", "ASDF", undefined, 1],
      ["a", "<", undefined, -1],
      ["a", "<", "m", 1],
      ["a", "<", "o", 1],
      ["a", "<", "f", -1],
      ["a", "0", undefined, -1],
      ["a", "0", "d", 1],
      ["a", "0", "o", 1],
      ["a", "0", "m", 1],
      ["aa", "a0", "f", -1],
   ];
   for (const [left, right, flags, expected] of cases) {
      assert.equal(left.compareIt(right, flags), expected);
      assert.equal(compareIt(left, right, flags), expected);
   }
   assert.equal("asdf".compareIt("ASDF", "iq"), 0);
   assert.equal(compareIt("asdf", "ASDF", "iq"), 0);
   assert.equal("asdf".compareIt("asde", "z"), 1);
   assert.equal(Number.isNaN(compareIt("asdf", "asde", "z")), false);
});

test("trimIt removes a repeated multi-character needle", () => {
   agree("XX", "ababXXab".trimIt("ab"), trimIt("ababXXab", "ab"));
});

test("indexOfAll and trimIt treat a regex needle as literal text", () => {
   agree([0], ".*+?".indexOfAll(".*+?"), indexOfAll(".*+?", ".*+?"));
   agree("keep", ".*+?keep.*+?".trimIt(".*+?"), trimIt(".*+?keep.*+?", ".*+?"));
});
