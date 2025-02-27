import '../../src/stringpp/index.js';

console.log([
   "Testing sanitizeRegex 'Hello [world] - how's this?' => " +
      'Hello [world] - how\'s this?'.sanitizeRegex() + 
      " [Expected: 'Hello \\[world\\] \\- how\'s this\\?']",
   "Testing sanitizeHtml '<div class=\"\" style=\"\"></div>' => " +
      '<div class=\"\" style=\"\"></div>'.sanitizeHtml(),
   "Testing charAdd(1) 'a' => " + 'a'.charAdd(1) + " [Expected: b]",
   "Testing trimIt('-') '----asdf--' => " + '----asdf--'.trimIt('-') + " [Expected: asdf]",
   "Testing indexOfOccurIn('a', 4) 'abaaca' => " + 'abaaca'.indexOfOccurIn('a', 4) + " [Expected: 5]",
   "Testing indexOfAll('b') 'abaaba' => " + 'abaaba'.indexOfAll('b') + " [Expected: 1, 4]",
   "Testing snakeToTitleCase 'hello-world' => " + 'hello_world'.snakeToTitleCase() + " [Expected: Hello World]",
   "Testing snakeToTitleCase '-good_bye-world-' => " + '_good-bye_world_'.snakeToTitleCase() + " [Expected: \\sGood-Bye World\\s]",
   "Testing snakeToTitleCase 'a-b-c-incorporated' => " + 'a_b_c_incorporated'.snakeToTitleCase() + " [Expected: ABC Incorporated]",
   // still not sure what to do best either emcypte_p_r_p or emcypte_prp
   "Testing titleToSnakeCase 'Emcypte P.R.P.' => " + 'Emcypte P.R.P.'.titleToSnakeCase() + " [Expected: emcypte_prp]", 
   // still not sure what to do best either marth_vg_sun or marth_v_g_sun
   "Testing titleToSnakeCase 'Marth VG Sun' => " + 'Marth VG Sun'.titleToSnakeCase() + " [Expected: marth_vg_sun]",
   "Testing compareIt => " + "asdf".compareIt("asde") + " [Expected: 1]",
   "Testing compareIt => " + "asde".compareIt("asdf") + " [Expected: -1]",
   "Testing compareIt => " + "asdf".compareIt("asdfa") + " [Expected: -1]",
   "Testing compareIt => " + "asdfa".compareIt("asdf") + " [Expected: 1]",
   "Testing compareIt => " + "asdf".compareIt("asdfa", "l") + " [Expected: 1]",
   "Testing compareIt => " + "asdfa".compareIt("asdf", "l") + " [Expected: -1]",
   "Testing compareIt => " + "asdf".compareIt("ASDF", "i") + " [Expected: 0]",
   "Testing compareIt => " + "asdf".compareIt("ASDF") + " [Expected: 1]",
   "Testing compareIt => " + "a".compareIt("<") + " [Expected: -1]",
   "Testing compareIt => " + "a".compareIt("<", "m") + " [Expected: 1]",
   "Testing compareIt => " + "a".compareIt("<", "o") + " [Expected: 1]",
   "Testing compareIt => " + "a".compareIt("<", "f") + " [Expected: -1]",
   "Testing compareIt => " + "a".compareIt("0") + " [Expected: -1]",
   "Testing compareIt => " + "a".compareIt("0", "d") + " [Expected: 1]",
   "Testing compareIt => " + "a".compareIt("0", "o") + " [Expected: 1]",
   "Testing compareIt => " + "a".compareIt("0", "m") + " [Expected: 1]",
   "Testing compareIt => " + "aa".compareIt("a0", "f") + " [Expected: -1]",
].join("\n"));