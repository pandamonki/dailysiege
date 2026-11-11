// Seats: how many lords a war can hold, and the team colour of each seat.
// Battles record each lord's colour, so the server needs this list too.
const MAX_LORDS = 12;     // the most castles a map is built for
const DEFAULT_LORDS = 10; // seats in a new hosted war, unless the host chooses otherwise
// The first eight are the original colours. The last four were picked to stay clearly apart from every other
// colour for people with red-green colour blindness as well (each is further from its nearest neighbour than
// the closest pair among the original eight).
const SEAT_COLORS = ["#2f5fa8", "#b8322a", "#3d7a35", "#7a3d8f", "#c9862f", "#d6559a", "#2d8a8a", "#d8d2c0", "#2b2724", "#7cc6ee", "#f0d848", "#1b2a5c"];
const TEAM_COLOR_NAMES = { "#2f5fa8": "Blue", "#b8322a": "Red", "#3d7a35": "Green", "#7a3d8f": "Purple", "#c9862f": "Orange", "#d6559a": "Pink", "#2d8a8a": "Teal", "#d8d2c0": "Bone", "#2b2724": "Black", "#7cc6ee": "Sky", "#f0d848": "Yellow", "#1b2a5c": "Navy" };
