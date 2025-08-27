// In-memory storage
let students = [];

// Auto-detect backend URL
const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api/students"   // Development
    : "/api/students";                       // Production (same server)

// Form elements
const form = document.getElementById('registrationForm');
const messageDiv = document.getElementById('message');
const loadingDiv = document.getElementById('loading');
const studentsDiv = document.getElementById('students');

// Form submission handler
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Show loading
    loadingDiv.style.display = 'block';
    form.style.display = 'none';
    
    try {
        // Get form data
        const formData = new FormData(form);
        const studentData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            dateOfBirth: formData.get('dateOfBirth'),
            gender: formData.get('gender'),
            grade: formData.get('grade'),
            parentName: formData.get('parentName'),
            address: formData.get('address'),
            medicalInfo: formData.get('medicalInfo')
        };
        
        // Send data to backend API
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to register student');
        }
        
        // Show success message
        showMessage(result.message || 'Student registered successfully! Welcome to Westfield Academy.', 'success');
        
        // Reset form
        form.reset();
        
        // Reload student list from database
        await loadStudents();
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage(error.message || 'Failed to register student. Please try again.', 'error');
    } finally {
        // Hide loading and show form
        loadingDiv.style.display = 'none';
        form.style.display = 'block';
    }
});

// Display message function
function showMessage(message, type) {
    messageDiv.innerHTML = `<div class="${type}-message">${message}</div>`;
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}

// Load students from database
async function loadStudents() {
    try {
        const response = await fetch(API_BASE);
        const result = await response.json();
        
        if (response.ok && result.success) {
            students = result.data;
            displayStudents();
        } else {
            console.error('Failed to load students:', result.message);
            studentsDiv.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Failed to load students from database.</p>';
        }
    } catch (error) {
        console.error('Error loading students:', error);
        studentsDiv.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Error connecting to database.</p>';
    }
}

// Display students function
function displayStudents() {
    if (students.length === 0) {
        studentsDiv.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No students registered yet.</p>';
        return;
    }
    
    const studentsHTML = students.map(student => {
        const birthDate = new Date(student.date_of_birth || student.dateOfBirth).toLocaleDateString();
        const regDate = new Date(student.registration_date || student.registrationDate || student.created_at).toLocaleDateString();
        
        return `
        <div class="student-card">
            <div class="student-name">${student.first_name || student.firstName} ${student.last_name || student.lastName}</div>
            <div class="student-details">
                <div><strong>Email:</strong> ${student.email}</div>
                <div><strong>Phone:</strong> ${student.phone}</div>
                <div><strong>Grade:</strong> ${student.grade}</div>
                <div><strong>Gender:</strong> ${student.gender}</div>
                <div><strong>Date of Birth:</strong> ${birthDate}</div>
                <div><strong>Parent/Guardian:</strong> ${student.parent_name || student.parentName}</div>
                <div><strong>Registration Date:</strong> ${regDate}</div>
                ${(student.medical_info || student.medicalInfo) ? `<div><strong>Medical Info:</strong> ${student.medical_info || student.medicalInfo}</div>` : ''}
            </div>
        </div>
    `;
    }).join('');
    
    studentsDiv.innerHTML = studentsHTML;
}

// Initialize - load students from database
loadStudents();

// Add form animations
const inputs = document.querySelectorAll('input, select, textarea');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.querySelector('label').style.color = '#4facfe';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.querySelector('label').style.color = '#333';
    });
});
