const bcrypt = require('bcrypt');

async function generarHash() {
  const password = '12345';
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
  } catch (error) {
    console.error('Error:', error);
  }
}

generarHash();