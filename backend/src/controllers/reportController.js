import * as reportService from "../services/reportService.js";

export const getDashboardSummary = async (req, res, next) => {
    try {
        const summary = await reportService.getDashboardSummary();
        res.status(200).json({ success: true, data: summary });
    } catch (err) {
        next(err);
    }
};

export const getReports = async (req, res, next) => {
    try {
        const reports = await reportService.getReportMetrics(req.query);
        res.status(200).json({ success: true, data: reports });
    } catch (err) {
        next(err);
    }
};

export const getSalesRepDashboard = async (req, res, next) => {
    try {
        if (req.user.role !== "sales_rep") return res.status(403).json({ success: false, message: "Sales Representative access required" });
        res.status(200).json({ success: true, data: await reportService.getSalesRepDashboard(req.user.userId) });
    } catch (err) {
        next(err);
    }
};

export const getSalesManagerDashboard = async (req, res, next) => {
    try {
        if (req.user.role !== "sales_manager") return res.status(403).json({ success: false, message: "Sales Manager access required" });
        res.status(200).json({ success: true, data: await reportService.getSalesManagerDashboard() });
    } catch (err) {
        next(err);
    }
};

export const exportPdf = (req, res) => {
    res.setHeader("Content-Disposition", "attachment; filename=dealflow360-sales-report.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.status(200).send("%PDF-1.4 DealFlow360 Executive Report Export");
};

export const exportXls = async (req, res, next) => {
    try {
        const rows = await reportService.getFilteredQuotations(req.query);
        res.setHeader("Content-Disposition", "attachment; filename=dealflow360-sales-report.csv");
        res.setHeader("Content-Type", "text/csv");
        let csv = "Quotation,Customer,Amount,Status,Risk\n";
        for (const row of rows) {
            csv += `"${row.quoteCode}","${row.customerName}",${row.amount},"${row.status}","${row.risk}"\n`;
        }
        res.status(200).send(csv);
    } catch (err) {
        next(err);
    }
};
