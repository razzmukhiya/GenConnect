const bcrypt = require('bcrypt');
const db = require('../db/connection');

async function createInitialAdmin() {
  try {
    // Check if admin already exists
    const [existingAdmins] = await db.execute(
      'SELECT * FROM admins WHERE email = ?',
      ['admin@genconnect.com']
    );

    if (existingAdmins.length > 0) {
      console.log('Admin user already exists!');
      console.log('Email: admin@genconnect.com');
      console.log('You can login with the existing credentials.');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin
    const [result] = await db.execute(
      `INSERT INTO admins (fullName, email, password, role) 
       VALUES (?, ?, ?, ?)`,
      ['System Administrator', 'admin@genconnect.com', hashedPassword, 'super_admin']
    );

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📧 Email: admin@genconnect.com');
    console.log('🔑 Password: admin123');
    console.log('');
    console.log('⚠️  IMPORTANT: Please change these credentials after first login!');
    console.log('');
    console.log(`🆔 Admin ID: ${result.insertId}`);

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('');
      console.log('💡 The admins table does not exist. Please run the schema.sql file first:');
      console.log('   mysql -u root -p your_database < Backend/db/schema.sql');
    }
  } finally {
    process.exit(0);
  }
}

// Run the function
createInitialAdmin();
