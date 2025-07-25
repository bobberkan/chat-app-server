const fs = require('fs').promises;
const bcrypt = require('bcrypt');

const hashPasswords = async () => {
  try {
    const data = await fs.readFile('users.json', 'utf8');
    const users = JSON.parse(data);

    const saltRounds = 10;
    for (let user of users) {
      if (!user.password.startsWith('$2b$')) { // Agar parol shifrlanmagan bo‘lsa
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        user.password = hashedPassword;
      }
    }

    await fs.writeFile('users.json', JSON.stringify(users, null, 2));
    console.log('Parollar shifrlangan!');
  } catch (error) {
    console.error('Xato:', error);
  }
};

hashPasswords();