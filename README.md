# InterviewForge

InterviewForge is a full-stack interview-preparation and job-search application. It helps candidates find jobs, compare their profile with a role, build an interview plan, practise interview questions and MCQs, solve coding problems, and track progress from one workspace.

## What is included

- India-wide and international job search through external job providers
- Saved jobs and application tracking
- Resume and job-description analysis
- Candidate-to-job match and skill-gap analysis
- AI-generated technical, behavioural, project, and system-design questions
- Timed focused-practice and mock-interview sessions
- MCQ practice with difficulty-based results
- Coding problems with a Monaco editor and JDoodle execution
- Saved question bank and introduction builder
- Progress, activity, and readiness tracking
- Email/password and Google authentication
- AI-assisted resume PDF generation

## Technology

| Area | Main tools |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, SCSS, Monaco Editor |
| Backend | Node.js, Express 5, MongoDB, Mongoose, Zod |
| Authentication | JWT access/refresh cookies, bcrypt, Google OAuth |
| AI | Google Gemini and Groq |
| Code execution | JDoodle |
| Job data | JobDataLake, Adzuna, and JSearch |
| PDF generation | Puppeteer |

## Project layout

```text
InterviewForge/
├── Backend/
│   ├── scripts/          # MCQ import and generation scripts
│   ├── src/
│   │   ├── config/       # Database and shared configuration
│   │   ├── controllers/  # HTTP request handlers
│   │   ├── middlewares/  # Authentication, uploads, and rate limits
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # API routes
│   │   └── services/     # AI, jobs, coding, and business logic
│   ├── test/
│   └── server.js
├── Frontend/
│   └── src/
│       ├── components/   # Shared layout and UI components
│       ├── features/     # Feature-based pages, services, and styles
│       └── services/     # Shared API client
└── README.md
```

## Local setup

### 1. Requirements

Install these before starting:

- Node.js 20 or newer
- npm
- MongoDB, either local or MongoDB Atlas
- Chrome/Chromium if resume PDF generation is required

### 2. Install dependencies

```bash
git clone <repository-url>
cd InterviewForge

cd Backend
npm install

cd ../Frontend
npm install
```

Use `npm ci` instead of `npm install` in CI or when reproducing the lockfile exactly.

### 3. Configure the backend

```bash
cd Backend
cp .env.example .env
```

Fill in `Backend/.env`:

```env
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/interviewforge

JWT_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<different-long-random-secret>

GOOGLE_GENAI_API_KEY=
GROQ_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

JDOODLE_CLIENT_ID=
JDOODLE_CLIENT_SECRET=

CLIENT_ORIGIN=http://localhost:5173

PUPPETEER_EXECUTABLE_PATH=
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=

JOBDATALAKE_API_KEY=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
ADZUNA_COUNTRY=in
JSEARCH_API_KEY=
```

Generate strong JWT secrets with `openssl rand -base64 48`. Run it twice and use different values.

Service requirements:

- `MONGO_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` are required for the core backend.
- `GOOGLE_GENAI_API_KEY` is required for interview plans, focused questions, coding-question generation, and resume content.
- `GROQ_API_KEY` is required for AI-generated MCQs.
- JDoodle credentials are required only for running code.
- Configure at least one job provider to retrieve new jobs. Multiple providers improve coverage.
- Google credentials are required only for Google sign-in.
- `PUPPETEER_EXECUTABLE_PATH` is optional when Puppeteer can find its installed browser.

To install Puppeteer's Chrome build:

```bash
cd Backend
npx puppeteer browsers install chrome
```

### 4. Configure the frontend

```bash
cd Frontend
cp .env.example .env
```

Set:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=<same-google-web-client-id>
```

Never place database credentials, JWT secrets, AI keys, job-provider keys, or JDoodle secrets in a `VITE_*` variable. Vite variables are included in browser code.

### 5. Start the application

Terminal one:

```bash
cd Backend
npm run dev
```

Terminal two:

```bash
cd Frontend
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:3000`.

## Optional database content

MCQs can be imported or generated from the backend scripts:

```bash
cd Backend
npm run import:mcq
npm run generate:mcq
```

These scripts require their corresponding input/configuration and a working MongoDB connection. Coding and focused-practice pools can also be generated from their screens when the required AI provider is configured.

## Checks before committing

```bash
cd Backend
npm test
npm audit --omit=dev

cd ../Frontend
npm run lint
npm run build
npm audit --omit=dev
```

## Production configuration

Before deploying:

1. Set `NODE_ENV=production`.
2. Use separate, randomly generated access-token and refresh-token secrets.
3. Set `CLIENT_ORIGIN` to the exact HTTPS frontend origin. Do not use `*`.
4. Set `COOKIE_SAME_SITE=none` only when frontend and backend are on different sites; HTTPS is required. Prefer `lax` when they share a site.
5. Set `COOKIE_DOMAIN` only when cookies must be shared across trusted subdomains.
6. Restrict database and provider credentials to the minimum permissions required.
7. Keep all `.env` files out of version control and configure secrets through the hosting platform.
8. Run the test, build, and dependency-audit commands above.
9. Configure logs and monitoring without logging resumes, tokens, passwords, or provider secrets.

The backend refuses to start in production when `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, or `CLIENT_ORIGIN` is missing.

## Security work required before public deployment

Complete these items in order:

1. **Secure PDF rendering.** AI-generated HTML is currently loaded into Puppeteer. Sanitize it, disable JavaScript, block unexpected network/file requests, and avoid `--no-sandbox` in production.
2. **Update the backend dependency tree.** The installed `qs` version has moderate denial-of-service advisories. Run `npm audit fix`, inspect the lockfile changes, and rerun tests.
3. **Restrict production origins.** Permit localhost origins only in development; production should accept only origins explicitly listed in `CLIENT_ORIGIN`.
4. **Rate-limit code execution.** Apply a dedicated per-user/IP limiter to `/api/coding/run` to protect JDoodle credits.
5. **Validate authentication input.** Add strict Zod schemas for registration and login, normalize email addresses, enforce maximum lengths, and define a password policy.
6. **Stop exposing internal errors.** Log detailed errors on the server and return stable generic messages to clients.
7. **Bound MCQ polling.** Stop polling on `failed`, add a maximum duration or attempt count, and display a retry action.
8. **Verify uploaded PDF content.** Do not rely only on the browser-provided MIME type; validate the file signature and apply parsing time/resource limits.

Do not consider the application production-hardened until the high-risk PDF-rendering item is resolved.

## Current limitations

- Coding submission and hidden-test judging are not implemented; code can be run but not formally submitted.
- AI and job-search features depend on external provider availability and quotas.
- Job results vary by provider coverage and synchronization time.
- Resume PDF generation requires a compatible Chrome/Chromium installation.

## Typical user flow

1. Register or sign in.
2. Complete the profile and provide resume/job information.
3. Search for a role and save or track the application.
4. Generate an interview plan for the target role.
5. Practise focused questions, MCQs, mock interviews, and coding problems.
6. Review saved questions and progress metrics.

## Troubleshooting

### The backend cannot connect to MongoDB

Check `MONGO_URI`, confirm MongoDB is running, and allow the deployment IP when using MongoDB Atlas.

### Browser requests fail with CORS or authentication errors

Confirm `VITE_API_URL` points to the backend and the frontend origin appears exactly in `CLIENT_ORIGIN`. Cookie-based authentication also requires requests to include credentials, which the shared frontend API client already configures.

### AI generation returns an unavailable message

Confirm the relevant AI key is configured and has available quota. Backend logs contain the provider error; clients should receive a simpler message.

### Code does not run

Set both JDoodle credentials and verify that the account has execution credits.

### PDF generation cannot find Chrome

Install Chrome through Puppeteer or set `PUPPETEER_EXECUTABLE_PATH` to an existing Chrome/Chromium executable.

## License

The backend package currently declares the ISC license. Add a root `LICENSE` file before distributing the project publicly.
