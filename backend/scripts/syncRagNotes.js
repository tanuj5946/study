require('dotenv').config();

const { ensureNotesSyncedForUser, syncNotesForAllUsers } = require('../services/ragNotes');

async function main() {
  const userArg = process.argv[2];

  if (userArg) {
    const userId = Number.parseInt(userArg, 10);

    if (Number.isNaN(userId)) {
      throw new Error('User id must be a number');
    }

    const result = await ensureNotesSyncedForUser(userId);
    console.log(JSON.stringify({ user_id: userId, ...result }, null, 2));
    return;
  }

  const results = await syncNotesForAllUsers();
  console.log(JSON.stringify(results, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
