# JJKings Academy — Enrollment System Setup Guide

A highly offline-capable Student Enrollment and Management Portal built for **JJKings Academy**. This application is structured with a vanilla HTML, CSS, JavaScript, and Tailwind CSS frontend communicating with a PHP and MySQL backend.

---

## 🛠️ Prerequisites

To run this application locally, ensure you have the following installed:
1. **XAMPP** (includes Apache Web Server, PHP 7.4+ or 8.x, and MariaDB/MySQL).
2. Any modern **Web Browser** (Chrome, Edge, Firefox, etc.).

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Extract the Application Files
1. Extract the downloaded `.zip` file.
2. Copy the extracted folder into your XAMPP server's `htdocs` directory:
   * Path: `C:\xampp\htdocs\sia\`
   * *Note: The folder must be named `sia` so that all local asset routes resolve properly (`http://localhost/sia/`).*

### Step 2: Import the Database
1. Open the **XAMPP Control Panel** and start both **Apache** and **MySQL**.
2. Open your web browser and navigate to **phpMyAdmin**:
   * URL: `http://localhost/phpmyadmin/`
3. Create a new database:
   * Click **New** in the left sidebar.
   * Database name: `enrollment_system`
   * Collation: `utf8mb4_general_ci` or `utf8mb4_unicode_ci`.
   * Click **Create**.
4. Import the schema and record seeds:
   * Select the newly created `enrollment_system` database.
   * Click the **Import** tab on the top menu bar.
   * Under **File to import**, click **Choose File** and locate `enrollment_system.sql` inside your project folder.
   * Click **Import** (or **Go** at the bottom).

### Step 3: Run the Application
1. In your browser, navigate to:
   * **Landing & Login Page**: `http://localhost/sia/index.html` (or simply `http://localhost/sia/`)
   * **Registration Form**: `http://localhost/sia/register.html`

---

## 🔑 Default Credentials

You can use the following pre-configured accounts to sign in:

### Administrative Portals
* **Admin Account 1**:
  * **Email**: `admin@university.local`
  * **Password**: `password123`
* **Admin Account 2**:
  * **Email**: `admin@biringan.edu`
  * **Password**: `admin123`

### Student Portals
* **Student Account (Grade 7 - JHS)**:
  * **Email**: `ankaramessi@gmail.com`
  * **Password**: `password123` (Active account for student *Lionel Messi*)
* **Demo Student Account (Grade 11 - SHS)**:
  * **Email**: `student1@biringan.edu`
  * **Password**: `student123`

---

## 💎 Features Overview

### 🏛️ Admin Dashboard (`admin-dashboard.html`)
* **Enrollment Applications**: Review, approve, or reject student registration forms.
* **Enrolled Students Roster**: Inspect details, billing/outstanding balance cards, and search records.
* **Curriculum Management**: Add, update, and manage subjects for JHS/SHS semesters.
* **Section Rosters**: Add class sections, view schedules, and assign teachers.
* **SQL Database Exporter**: Quick-export tables (`teachers`, `subjects`, `sections`, `section_schedules`) as a `.sql` file in the sidebar footer.

### 🎓 Student Dashboard (`student-dashboard.html`)
* **Timetables**: View class times, rooms, and teacher details grouped by day.
* **Fees & Ledger**: Inspect outstanding balances and run a simulated mock payment system using a card form.
* **Grades**: View quarterly report card grades.
* **JHS / SHS Dynamic Interfaces**: Automatically filters out semester selector dropdowns and Voucher cards for JHS students.
