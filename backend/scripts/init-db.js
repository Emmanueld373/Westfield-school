// scripts/init-db.js
const { Pool } = require('pg');
require('dotenv').config();

// Create database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'postgres', // Connect to default postgres database first
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'school_registration';
    
    try {
      await pool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' created successfully`);
    } catch (error) {
      if (error.code === '42P04') {
        console.log(`ℹ️  Database '${dbName}' already exists`);
      } else {
        throw error;
      }
    }

    // Close connection to postgres database
    await pool.end();

    // Connect to our new database
    const appPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: dbName,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    });

    // Create tables
    console.log('📋 Creating tables...');

    // Students table
    const createStudentsTable = `
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        date_of_birth DATE NOT NULL,
        gender VARCHAR(20) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        parent_name VARCHAR(200) NOT NULL,
        address TEXT NOT NULL,
        medical_info TEXT,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await appPool.query(createStudentsTable);
    console.log('✅ Students table created');

    await appPool.end();
    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();