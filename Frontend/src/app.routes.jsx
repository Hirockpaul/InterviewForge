import { createBrowserRouter, Navigate } from "react-router";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Protected from "./features/auth/components/protected";
import Home from "./features/interview/pages/Home";
import Interview from "./features/interview/pages/Interview";
import Dashboard from "./features/dashboard/pages/Dashboard";
import InterviewHistory from "./features/interview/pages/InterviewHistory";
import MockInterview from "./features/mockInterview/pages/MockInterview";
import Progress from "./features/progress/pages/Progress";
import QuestionBank from './features/preparation/pages/QuestionBank'
import IntroductionBuilder from './features/preparation/pages/IntroductionBuilder'
import ProjectQuestions from './features/preparation/pages/ProjectQuestions'
import FocusedPracticeCreate from './features/focusedPractice/pages/FocusedPracticeCreate'
import FocusedPracticeSession from './features/focusedPractice/pages/FocusedPracticeSession'
import FocusedPracticeReport from './features/focusedPractice/pages/FocusedPracticeReport'
import McqCreate from './features/mcq/pages/McqCreate'
import McqSession from './features/mcq/pages/McqSession'
import McqResult from './features/mcq/pages/McqResult'
import CodingWorkspace from './features/coding/pages/CodingWorkspace'
import CodingPractice from './features/coding/pages/CodingPractice'
import CodingTopic from './features/coding/pages/CodingTopic'
import Profile from './features/profile/pages/Profile'


export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/register",
        element: <Register />
    },
    {
        path: "/",
        element: <Protected><Navigate to='/dashboard' replace /></Protected>
    },
    {
        path: "/dashboard",
        element: <Protected><Dashboard /></Protected>
    },
    {
        path: "/profile",
        element: <Protected><Profile /></Protected>
    },
    {
        path: "/interviews/create",
        element: <Protected><Home /></Protected>
    },
    {
        path: "/interviews",
        element: <Protected><InterviewHistory /></Protected>
    },
    {
        path: "/interviews/:interviewId",
        element: <Protected><Interview /></Protected>
    },
    {
        path: "/interviews/new",
        element: <Protected><Navigate to='/interviews/create' replace /></Protected>
    },
    {
        path: "/interview/:interviewId",
        element: <Protected><Interview /></Protected>
    },
    {
        path: "/mock-interview/:mockInterviewId",
        element: <Protected><MockInterview /></Protected>
    },
    {
        path: "/progress",
        element: <Protected><Progress /></Protected>
    },
    {
        path: '/question-bank',
        element: <Protected><QuestionBank /></Protected>
    },
    {
        path: '/timed-practice',
        element: <Protected><Navigate to='/focused-practice' replace /></Protected>
    },
    {
        path: '/timed-practice/:id',
        element: <Protected><Navigate to='/focused-practice' replace /></Protected>
    },
    {
        path: '/introductions',
        element: <Protected><IntroductionBuilder /></Protected>
    },
    {
        path: '/project-questions',
        element: <Protected><ProjectQuestions /></Protected>
    },
    {
        path: '/focused-practice',
        element: <Protected><FocusedPracticeCreate /></Protected>
    },
    {
        path: '/focused-practice/:id',
        element: <Protected><FocusedPracticeSession /></Protected>
    },
    {
        path: '/focused-practice/:id/report',
        element: <Protected><FocusedPracticeReport /></Protected>
    },
    {
        path: '/mcq',
        element: <Protected><McqCreate /></Protected>
    },
    {
        path: '/mcq/:id',
        element: <Protected><McqSession /></Protected>
    },
    {
        path: '/mcq/:id/result',
        element: <Protected><McqResult /></Protected>
    },
    {
        path: '/coding-practice',
        element: <Protected><CodingPractice /></Protected>
    },
    {
        path: '/coding-practice/workspace',
        element: <Protected><CodingWorkspace /></Protected>
    },
    {
        path: '/coding-practice/problem/:problemId',
        element: <Protected><CodingWorkspace /></Protected>
    },
    {
        path: '/coding-practice/:topic',
        element: <Protected><CodingTopic /></Protected>
    }
]);
