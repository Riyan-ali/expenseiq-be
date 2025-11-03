# ExpenseIQ Backend

REST API for Expense Tracker using Node.js, Express, and MongoDB.

## Setup

1. Clone repo: `git clone <repo-url> expense-tracker-backend`
2. Install deps: `npm install`
3. Create MongoDB Atlas cluster: Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas), create free cluster, whitelist IPs (0.0.0.0/0 for dev), get SRV connection string.
4. Copy `.env.example` to `.env` and fill values (use strong JWT_SECRET).
5. Run: `npm run dev` (port 4000).

## API Endpoints

- Auth: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
- Categories: GET/POST/PUT/DELETE /api/categories (auth req)
- Transactions: GET/POST/PUT/DELETE /api/transactions (auth req, query params for filter/paginate)
- Reports: GET /api/reports/summary?from=...&to=..., GET /api/reports/balance?from=...&to=...

## Security

- JWT auth (3d expiry), bcrypt passwords.
- Helmet, CORS, rate limiting (100 req/15min).
- Validation with express-validator.
- Production: Use HTTPS, rotate JWT_SECRET.
