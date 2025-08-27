// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'school_registration',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('Connected to PostgreSQL database');
    release();
  }
});

// Create students table if it doesn't exist
const createTable = async () => {
  const query = `
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
  
  try {
    await pool.query(query);
    console.log('Students table created or already exists');
  } catch (error) {
    console.error('Error creating table:', error);
  }
};

createTable();

// API Routes

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
});

// Get student by ID
app.get('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message
    });
  }
});

// Register new student
app.post('/api/students', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      grade,
      parentName,
      address,
      medicalInfo
    } = req.body;

    // Validation
    const requiredFields = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
      dateOfBirth: 'Date of birth',
      gender: 'Gender',
      grade: 'Grade',
      parentName: 'Parent name',
      address: 'Address'
    };

    const missingFields = [];
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field]) {
        missingFields.push(label);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if email already exists
    const existingStudent = await pool.query('SELECT id FROM students WHERE email = $1', [email]);
    if (existingStudent.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A student with this email address already exists'
      });
    }

    // Insert new student
    const insertQuery = `
      INSERT INTO students (
        first_name, last_name, email, phone, date_of_birth,
        gender, grade, parent_name, address, medical_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      grade,
      parentName,
      address,
      medicalInfo || null
    ];

    const result = await pool.query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering student',
      error: error.message
    });
  }
});

// Update student
app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      grade,
      parentName,
      address,
      medicalInfo
    } = req.body;

    // Check if student exists
    const existingStudent = await pool.query('SELECT id FROM students WHERE id = $1', [id]);
    if (existingStudent.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if email is being updated and if it's already taken by another student
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM students WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email address is already in use by another student'
        });
      }
    }

    const updateQuery = `
      UPDATE students SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        date_of_birth = COALESCE($5, date_of_birth),
        gender = COALESCE($6, gender),
        grade = COALESCE($7, grade),
        parent_name = COALESCE($8, parent_name),
        address = COALESCE($9, address),
        medical_info = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;

    const values = [
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      grade,
      parentName,
      address,
      medicalInfo,
      id
    ];

    const result = await pool.query(updateQuery, values);

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message
    });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message
    });
  }
});

// Search students
app.get('/api/students/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const searchQuery = `
      SELECT * FROM students 
      WHERE first_name ILIKE $1 
         OR last_name ILIKE $1 
         OR email ILIKE $1 
         OR parent_name ILIKE $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(searchQuery, [`%${term}%`]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching students',
      error: error.message
    });
  }
});

// Get students by grade
app.get('/api/students/grade/:grade', async (req, res) => {
  try {
    const { grade } = req.params;
    const result = await pool.query('SELECT * FROM students WHERE grade = $1 ORDER BY last_name, first_name', [grade]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching students by grade:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students by grade',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the registration form`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

module.exports = app;