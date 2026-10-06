# Waygood Study Abroad API

This is the backend for a small study-abroad discovery and application-tracking product. Students can browse universities and programmes, see recommendations based on their profile, and track applications. Counselors have access to the wider application workflow.

The project was built on the supplied starter structure. I kept the existing models and routes where they were useful, then completed the missing auth, recommendation, and application flows.

## Running the project

### Prerequisites

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB connection string

### Setup

```bash
cd backend
npm install
copy .env.example .env
npm run seed
npm run dev
```

The API listens on `http://localhost:4000` by default.

The seed command resets the local `waygood-evaluation` database and inserts sample universities, programmes, students, and applications. It is useful when starting over after manual testing.

### Environment variables

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/waygood-evaluation
JWT_SECRET=replace-this-with-a-long-random-value
JWT_EXPIRES_IN=1d
CACHE_TTL_SECONDS=300
```

## Sample users

| Account | Email | Password |
| --- | --- | --- |
| Student | `aarav@example.com` | `Candidate123!` |
| Student | `sara@example.com` | `Candidate123!` |
| Counselor | `counselor@example.com` | `Candidate123!` |

## API routes

| Method | Route | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | Creates a student account and returns a token |
| POST | `/api/auth/login` | Logs in a seeded or registered user |
| GET | `/api/auth/me` | Requires a bearer token |
| GET | `/api/universities` | Supports country, partner type, scholarship, search, sorting, and pagination |
| GET | `/api/universities/popular` | Cached popular universities |
| GET | `/api/programs` | Supports country, degree, field, intake, budget, scholarship, search, and pagination |
| GET | `/api/recommendations/:studentId` | Available to that student or a counselor |
| GET | `/api/applications` | Students only receive their own applications |
| POST | `/api/applications` | Creates a draft application |
| PATCH | `/api/applications/:id/status` | Changes status when the transition is allowed |
| GET | `/api/dashboard/overview` | Cached counts and status summary |

Protected requests use:

```text
Authorization: Bearer <token>
```

## A few implementation notes

### Authentication

The Student model already has a password pre-save hook, so registration passes the original password to Mongoose rather than hashing it a second time in the controller. The login response and profile endpoint only return safe student fields. Public signup creates a student account; counselor accounts are not self-service.

### Recommendations

Recommendations are calculated with a MongoDB aggregation pipeline instead of loading programmes into Node.js and scoring them there. The pipeline compares a student's country preferences, field, budget, intake, and English-test score; computes a match score; sorts it; and only returns the top five programmes. The response includes the criteria that matched for each programme.

### Applications

The `student + program + intake` compound unique index is the database-level protection against duplicate applications. The controller also returns a clear `409 Conflict` response for that case.

Application statuses are intentionally forward-only:

```text
draft → submitted → under-review → offer-received → visa-processing → enrolled
```

An application can be rejected while it is still in progress. Each valid update adds an entry to the timeline. Students may submit their own draft, while counselors handle later decisions.

### Cache and indexes

The popular-university and dashboard endpoints use the provided in-memory TTL cache. Dashboard cache is cleared after an application is created or changes status. This is enough for a single local instance; a shared Redis cache would be preferable if the service were deployed on multiple instances.

The existing model indexes target the common discovery filters and application lookups. Regex search is deliberately kept simple for the sample data. For a much larger catalogue I would use MongoDB Atlas Search rather than rely on regex queries.

## Tests

```bash
cd backend
npm test
```

The test suite covers the auth API flow, duplicate-email handling, protected profile access, aggregation recommendation behaviour, application transition rules, and cache invalidation behaviour.

## Manual smoke check

After seeding and starting the server, this URL should return a health response:

```text
http://localhost:4000/api/health
```

For a full check: log in with a seeded student, call `/api/auth/me`, request that student's recommendations, create an application, submit it, and repeat the create request to confirm the duplicate request returns `409`.
