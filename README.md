# InterviewForge

InterviewForge is a full-stack interview preparation and job-search platform that helps candidates discover jobs, analyze their profiles against job descriptions, prepare for interviews, practise technical questions, solve coding problems, and track their progress from a single workspace.

## Features

* India-wide and international job search
* Save jobs and track applications
* Resume and job-description analysis
* Candidate-to-job matching and skill-gap analysis
* AI-generated technical, behavioural, project, and system-design questions
* Timed focused-practice sessions
* Mock interviews
* Difficulty-based MCQ practice
* Coding problems with Monaco Editor and JDoodle execution
* Saved question bank
* Introduction builder
* Progress, activity, and interview-readiness tracking
* Email/password and Google authentication
* AI-assisted resume PDF generation

## Tech Stack

| Area           | Technology                                               |
| -------------- | -------------------------------------------------------- |
| Frontend       | React 19, Vite, React Router, Axios, SCSS, Monaco Editor |
| Backend        | Node.js, Express 5, MongoDB, Mongoose, Zod               |
| Authentication | JWT, HTTP-only cookies, bcrypt, Google OAuth             |
| AI             | Google Gemini, Groq                                      |
| Code Execution | JDoodle                                                  |
| Job Providers  | JobDataLake, Adzuna, JSearch                             |
| PDF Generation | Puppeteer                                                |

## Project Structure

```text
InterviewForge/
├── Backend/
│   ├── scripts/          # MCQ import and generation scripts
│   ├── src/
│   │   ├── config/       # Database and application configuration
│   │   ├── controllers/  # Request handlers
│   │   ├── middlewares/  # Authentication, uploads, and rate limits
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # API routes
│   │   └── services/     # AI, jobs, coding, and business logic
│   ├── test/
│   └── server.js
│
├── Frontend/
│   └── src/
│       ├── components/   # Shared UI components
│       ├── features/     # Feature-specific pages and services
│       └── services/     # Shared API client
│
└── README.md
```

## Requirements

* Node.js 20+
* npm
* MongoDB or MongoDB Atlas
* Chrome/Chromium for resume PDF generation

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd InterviewForge
```

Install backend dependencies:

```bash
cd Backend
npm install
```

Install frontend dependencies:

```bash
cd ../Frontend
npm install
```

For CI environments or exact lockfile reproduction:

```bash
npm ci
```

## Environment Variables

### Backend

Create the backend environment file:

```bash
cd Backend
cp .env.example .env
```

Configure `Backend/.env`:

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

Generate strong JWT secrets:

```bash
openssl rand -base64 48
```

Run the command twice and use different values for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

### Required Services

| Variable                 | Purpose                          | Required              |
| ------------------------ | -------------------------------- | --------------------- |
| `MONGO_URI`              | MongoDB connection               | Yes                   |
| `JWT_SECRET`             | Access-token signing             | Yes                   |
| `JWT_REFRESH_SECRET`     | Refresh-token signing            | Yes                   |
| `CLIENT_ORIGIN`          | Frontend origin                  | Yes                   |
| `GOOGLE_GENAI_API_KEY`   | Interview and resume AI features | For AI features       |
| `GROQ_API_KEY`           | MCQ generation and evaluation    | For MCQ AI features   |
| `JDOODLE_CLIENT_ID`      | Code execution                   | For code execution    |
| `JDOODLE_CLIENT_SECRET`  | Code execution                   | For code execution    |
| Job provider keys        | Job search                       | At least one provider |
| Google OAuth credentials | Google sign-in                   | Optional              |
| Puppeteer Chrome         | Resume PDF generation            | For PDF generation    |

Install Puppeteer's Chrome build if required:

```bash
cd Backend
npx puppeteer browsers install chrome
```

### Frontend

Create the frontend environment file:

```bash
cd Frontend
cp .env.example .env
```

Configure:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=<google-web-client-id>
```

> Never put database credentials, JWT secrets, AI keys, job-provider keys, or JDoodle secrets in `VITE_*` variables. Vite exposes these variables to browser code.

## Run Locally

Start the backend:

```bash
cd Backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd Frontend
npm run dev
```

Open the application:

```text
http://localhost:5173
```

Backend API:

```text
http://localhost:3000
```

## Database Content

MCQs can be imported or generated using the backend scripts:

```bash
cd Backend

npm run import:mcq
npm run generate:mcq
```

These commands require a working MongoDB connection and the required configuration.

Coding and focused-practice question pools can also be generated from the application when the required AI provider is configured.

## User Flow

```text
Sign Up / Sign In
       ↓
Complete Profile
       ↓
Search for Jobs
       ↓
Analyze Job + Resume
       ↓
Identify Skill Gaps
       ↓
Generate Interview Plan
       ↓
Practice
 ┌─────┼──────────┬──────────┐
 ↓     ↓          ↓          ↓
MCQs  Questions  Mock      Coding
                Interview
       ↓
Track Progress
       ↓
Improve Readiness
```

## Development Checks

### Backend

```bash
cd Backend

npm test
npm audit --omit=dev
```

### Frontend

```bash
cd Frontend

npm run lint
npm run build
npm audit --omit=dev
```
