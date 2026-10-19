# E-Cart

## Requirements

- JDK 25
- Node.js 22.12 or newer (or 20.19 or newer) and npm
- MySQL running on `localhost:3306`

The backend uses the Maven Wrapper, so a separate Maven installation is not
needed.

## Database setup

Create the database if it does not already exist:

```sql
CREATE DATABASE ecart;
```

Check `backend/src/main/resources/application.properties` and set the
datasource username and password to match your local MySQL account.

## Run locally on Windows

Start the backend in one PowerShell terminal:

```powershell
Set-Location .\backend
.\run-local.ps1
```

The launcher generates a random JWT signing key for this local run if
`JWT_SECRET` is not already set. This key is not saved to a file; log in again
after restarting the backend.

Start the frontend in a second PowerShell terminal:

```powershell
Set-Location .\frontend
npm ci
npm run dev -- --host localhost --strictPort
```

`npm ci` is only needed the first time or after dependencies change. The
frontend uses `http://localhost:8081` as its default API address. To override
it, copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.

Open <http://localhost:5173>. Register a user before trying to log in.

Products are reserved when added to a cart. Removing items or reducing their
quantity releases the corresponding stock. Unchecked-out reservations expire
after 30 minutes.

PhonePe QR payments are not verified or stored by the app. Submitting a UPI
reference only changes the status displayed on the current page.

## Verify

From the project root:

```powershell
Set-Location .\frontend
npm run build
npm run lint

Set-Location ..\backend
.\mvnw.cmd test
```
