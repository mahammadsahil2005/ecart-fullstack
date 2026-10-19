# E-Cart — Full-Stack E-Commerce Application

E-Cart is a full-stack e-commerce web application built to practice and demonstrate frontend development, backend API development, database integration, authentication, and order management.

## Features

- User registration and login
- Product browsing and product details
- Shopping cart and quantity management
- Checkout and order management
- Admin dashboard for product and order management
- REST APIs backed by a relational database
- Responsive frontend interface

*Note: Features may vary depending on the current implementation and configuration.*

## Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- HTML and CSS

**Backend**
- Java
- Spring Boot
- Spring Data JPA
- Spring Security

**Database**
- MySQL

**Tools**
- Git and GitHub
- Maven
- VS Code

## Project Structure

```text
PROJECT-1/
├── backend/
│   ├── src/
│   ├── pom.xml
│   └── mvnw
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Run Locally

### Prerequisites

- Java version compatible with the backend build
- Node.js and npm
- MySQL

### 1. Configure the database

Create a MySQL database named `ecart`.

Configure the backend using environment variables:

- `DB_URL` — JDBC URL for the database
- `DB_USERNAME` — MySQL username
- `DB_PASSWORD` — MySQL password

Never commit real passwords or secret keys to GitHub.

### 2. Start the backend

Open a terminal in the `backend` directory and run the project's Maven wrapper:

```powershell
.\mvnw.cmd spring-boot:run
```

The default backend port is `8081`.

### 3. Start the frontend

Open another terminal in the `frontend` directory:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Production Build

To build the frontend:

```powershell
cd frontend
npm run build
```

The production files are generated in `frontend/dist/`.

## Security and Payment Notes

- Keep database credentials, JWT secrets, and admin bootstrap tokens outside source control.
- Configure authentication, authorization, CORS, and production environment variables before deployment.
- A submitted payment reference or displayed payment status should not be treated as proof of a verified payment unless a trusted payment provider confirms it.

## Future Improvements

- Deploy the frontend and backend
- Configure a production database
- Add automated testing and CI
- Improve error handling and user experience

## Author

**Sk Mahammad Sahil**

GitHub: [mahammadsahil2005](https://github.com/mahammadsahil2005)

LinkedIn: Search for my profile using my name.
