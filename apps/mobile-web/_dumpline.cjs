const fs = require("fs");
const p = "C:/Users/admin/3team-holo/apps/mobile-web/src/features/board/board-list-screen.tsx";
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
for (let i = 303; i < 311; i++) {
  process.stdout.write((i + 1) + ": " + JSON.stringify(lines[i]) + "\n");
}
