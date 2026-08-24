# InterviewForge

InterviewForge is an AI-powered interview preparation platform designed to help candidates prepare for technical and behavioral interviews.

It combines AI-powered interview planning, mock interviews, focused practice, MCQ assessments, coding practice, resume analysis, and progress tracking in one platform.

## Features

* AI-generated interview plans from resumes and job descriptions
* Candidate-job match analysis
* Skill gap analysis
* Technical and behavioral interview questions
* Personalized preparation roadmap
* Mock interview sessions
* Focused practice sessions
* MCQ assessments with performance analytics
* Question bank for saved interview questions
* "Tell me about yourself" introduction builder
* Project-specific interview questions
* AI-generated coding problems
* Monaco-based coding workspace
* Online code execution with JDoodle
* Progress and interview readiness analytics
* Secure authentication with email/password and Google OAuth
* Customizable user avatars
* PDF resume generation

## Tech Stack

### Frontend

* React
* Vite
* React Router
* Axios
* SCSS
* Monaco Editor

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* Google OAuth
* Zod Validation
* Helmet
* Express Rate Limit


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

## Environment Variables

Create a `.env` file inside the `Backend` directory:

```env
NODE_ENV=
MONGO_URI=

JWT_SECRET=
JWT_REFRESH_SECRET=

GOOGLE_GENAI_API_KEY=
GROQ_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

JDOODLE_CLIENT_ID=
JDOODLE_CLIENT_SECRET=

CLIENT_ORIGIN=http://localhost:5173

PUPPETEER_EXECUTABLE_PATH=
```

Create a `.env` file inside the `Frontend` directory:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=
```

> Never expose backend API keys or secrets through `VITE_*` environment variables.

## Running the Application

### Start Backend

```bash
cd Backend
npm run dev
```

### Start Frontend

Open another terminal:

```bash
cd Frontend
npm run dev
```

The application will be available at:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

## How It Works

1. Create an account or sign in with Google.
2. Upload your resume and provide a job description.
3. InterviewForge analyzes your profile against the target role.
4. Generate a personalized interview preparation plan.
5. Practice through mock interviews, focused practice, and MCQ assessments.
6. Practice coding problems using the built-in coding workspace.
7. Review your performance and identify areas for improvement.

## Authentication

InterviewForge provides secure authentication using:

* Email and password
* Google OAuth
* JWT access and refresh tokens
* HTTP-only cookies
* Session revocation
* bcrypt password hashing

## Testing

Run backend tests:

```bash
cd Backend
npm test
```

Run frontend checks:

```bash
cd Frontend
npm run lint
npm run build
```

## Project Status

InterviewForge is actively being developed.

The core interview preparation, AI analysis, practice, MCQ, coding practice, authentication, profile, and progress features are implemented.

Future improvements may include advanced coding submissions, hidden test cases, coding-specific statistics, and additional interview practice features.
