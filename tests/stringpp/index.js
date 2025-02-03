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
   "Testing titleToSnakeCase 'Marth VG Sun' => " + 'Marth VG Sun'.titleToSnakeCase() + " [Expected: marth_vg_sun]"
].join("\n"));