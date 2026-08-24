const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.services")
const interviewReportModel = require("../models/interviewReport.model")
const mongoose = require("mongoose")

const isValidId = (id) => mongoose.isValidObjectId(id)




/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
    try {
        const { selfDescription = "", jobDescription = "" } = req.body

        if (!jobDescription.trim()) {
            return res.status(400).json({
                message: "Job description is required."
            })
        }

        if (!req.file && !selfDescription.trim()) {
            return res.status(400).json({
                message: "A resume PDF or self-description is required."
            })
        }

        const resumeContent = req.file
            ? await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
            : { text: "" }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeContent.text,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeContent.text,
            selfDescription,
            jobDescription,
            ...interViewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to generate interview report.",
            error: error.message
        })
    }

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    try {

        const { interviewId } = req.params

        if (!isValidId(interviewId)) {
            return res.status(400).json({ message: "Invalid interview ID." })
        }

        const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch interview report.",
            error: error.message
        })
    }
}

async function deleteInterviewReportController(req, res) {
    try {
        const { interviewId } = req.params

        if (!isValidId(interviewId)) {
            return res.status(400).json({ message: "Invalid interview ID." })
        }

        const interviewReport = await interviewReportModel.findOneAndDelete({
            _id: interviewId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        return res.status(200).json({ message: "Interview report deleted successfully." })
    } catch {
        return res.status(500).json({ message: "Failed to delete interview report." })
    }
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch interview reports.",
            error: error.message
        })
    }
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        if (!isValidId(interviewReportId)) {
            return res.status(400).json({ message: "Invalid interview report ID." })
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        })

        res.send(pdfBuffer)
    } catch (error) {
        if (error.code === "PDF_BROWSER_SETUP_ERROR") {
            return res.status(503).json({
                message: "Resume PDF generation is not configured on this machine.",
                error: error.message
            })
        }

        res.status(500).json({
            message: "Failed to generate resume PDF.",
            error: error.message
        })
    }
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, deleteInterviewReportController, generateResumePdfController }
