// Night Vault — the three levels. Each map is a grid of characters, one row
// per line, 20 columns by 11 rows:
//   #  wall (blocks sight and movement)
//   .  floor
//   C  crate — cover, blocks sight and movement
//   D  display case — cover, blocks sight and movement
//   s  shadow pool — a dark patch; standing in it, guards spot you far slower
//   L  the loot (the Star Sapphire)
//   E  the exit (the green service door)
//   P  where Moth starts
// Guards are not in the map: their patrols are listed per level as tile
// waypoints, so a patrol can be shaped without touching the map.

export const LEVELS = [
  {
    name: 'The Foyer',
    hint: 'Learn the cones. Crates and shadows break a guard\'s line of sight.',
    par: 75,
    map: [
      '####################',
      '#P....C.....#......#',
      '#.....C.....#......#',
      '#..s........#......#',
      '#.....C...D.#..L...#',
      '#...........#......#',
      '#..C........#......#',
      '#.....s.....#......#',
      '#..C....C...#..E...#',
      '#..................#',
      '####################',
    ],
    guards: [
      { waypoints: [[14, 2], [17, 2], [17, 5]], speed: 1.5, pause: 1.0 },
      { waypoints: [[14, 6], [17, 6], [17, 8]], speed: 1.5, pause: 1.0 },
    ],
    lamps: [[6, 2], [6, 7], [16, 4]],
  },
  {
    name: 'The Gallery',
    hint: 'Three guards, tighter patrols. The shadow corridor down the middle is your friend.',
    par: 95,
    map: [
      '####################',
      '#P..C....s....C....#',
      '#....D.............#',
      '#.s......C....#....#',
      '#....C....#...#..L.#',
      '#........#....#....#',
      '#....s...#..C......#',
      '#..C.....#.........#',
      '#....D...#....#..E.#',
      '#....s........C....#',
      '####################',
    ],
    guards: [
      { waypoints: [[13, 2], [18, 2]], speed: 1.6, pause: 0.9 },
      { waypoints: [[3, 3], [3, 5]], speed: 1.5, pause: 1.2 },
      { waypoints: [[13, 7], [18, 7]], speed: 1.6, pause: 0.9 },
    ],
    lamps: [[6, 1], [10, 6], [16, 6]],
  },
  {
    name: 'The Vault',
    hint: 'The Sapphire sits in the vault. Four guards, cross patrols, one way in.',
    par: 120,
    map: [
      '####################',
      '#P...C......C......#',
      '#....D..s......D...#',
      '#..s....####.......#',
      '#....C..#.L#...C...#',
      '#.......#..#.......#',
      '#..C....#.#....s...#',
      '#....D........D....#',
      '#..s.....C....C....#',
      '#.................E#',
      '####################',
    ],
    guards: [
      { waypoints: [[2, 9], [8, 9], [8, 7]], speed: 1.7, pause: 0.9 },
      { waypoints: [[12, 9], [17, 9]], speed: 1.7, pause: 0.9 },
      { waypoints: [[14, 1], [18, 1]], speed: 1.7, pause: 0.9 },
      { waypoints: [[2, 3], [2, 6]], speed: 1.6, pause: 1.0 },
    ],
    lamps: [[5, 2], [15, 2], [5, 8], [15, 8]],
  },
];

// Turn a level definition into the grid the game plays on: the character grid,
// the solid tiles, the shadow tiles, and the key positions in pixels.
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  const find = (ch) => {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === ch) return { col: c, row: r };
      }
    }
    return null;
  };
  const start = find('P');
  const loot = find('L');
  const exit = find('E');
  return {
    def,
    grid,
    start: { x: (start.col + 0.5) * 56, y: (start.row + 0.5) * 56 },
    loot: { x: (loot.col + 0.5) * 56, y: (loot.row + 0.5) * 56, col: loot.col, row: loot.row },
    exit: { x: (exit.col + 0.5) * 56, y: (exit.row + 0.5) * 56, col: exit.col, row: exit.row },
    lamps: def.lamps.map(([c, r]) => ({ x: (c + 0.5) * 56, y: (r + 0.5) * 56 })),
  };
}
