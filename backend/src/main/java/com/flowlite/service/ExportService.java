package com.flowlite.service;

import com.flowlite.dto.AuditReportResponse;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Slf4j
public class ExportService {
    
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter FILENAME_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");
    
    /**
     * Sanitizes a filename by removing special characters and limiting length.
     * Keeps only alphanumeric, dash, underscore and replaces spaces with underscores.
     */
    public String sanitizeFilename(String title) {
        if (title == null || title.isEmpty()) {
            return "untitled";
        }
        
        String sanitized = title
            .toLowerCase()
            .replaceAll("[^a-z0-9\\s\\-_]", "") // Remove special chars
            .replaceAll("\\s+", "_")             // Replace spaces with underscore
            .replaceAll("_+", "_")               // Remove multiple underscores
            .replaceAll("^_|_$", "");            // Trim leading/trailing underscores
        
        // Limit to 50 characters
        if (sanitized.length() > 50) {
            sanitized = sanitized.substring(0, 50);
        }
        
        return sanitized.isEmpty() ? "untitled" : sanitized;
    }
    
    /**
     * Generates a filename for the export file.
     * Format: flowlite_audit_task{id}_{sanitized-title}_{timestamp}.{extension}
     */
    public String generateExportFilename(Long taskId, String taskTitle, String extension) {
        String sanitizedTitle = sanitizeFilename(taskTitle);
        String timestamp = LocalDateTime.now().format(FILENAME_DATE_FORMATTER);
        return String.format("flowlite_audit_task%d_%s_%s.%s", taskId, sanitizedTitle, timestamp, extension);
    }
    
    /**
     * Exports audit report to Excel format (.xlsx)
     * Sheet 1: Task Details
     * Sheet 2: Comments/Activity History
     */
    public byte[] exportAuditToExcel(AuditReportResponse report) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            
            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 12);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            
            // Create data style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setWrapText(true);
            
            // Sheet 1: Task Details
            Sheet taskSheet = workbook.createSheet("Task Details");
            createTaskDetailsSheet(taskSheet, report, headerStyle, dataStyle);
            
            // Sheet 2: Comments
            if (report.getComments() != null && !report.getComments().isEmpty()) {
                Sheet commentsSheet = workbook.createSheet("Comments");
                createCommentsSheet(commentsSheet, report.getComments(), headerStyle, dataStyle);
            }
            
            workbook.write(outputStream);
            return outputStream.toByteArray();
            
        } catch (Exception e) {
            log.error("Error generating Excel export", e);
            throw new RuntimeException("Failed to generate Excel export: " + e.getMessage());
        }
    }
    
    private void createTaskDetailsSheet(Sheet sheet, AuditReportResponse report, 
                                         CellStyle headerStyle, CellStyle dataStyle) {
        String[][] data = {
            {"Task ID", String.valueOf(report.getTaskId())},
            {"Title", report.getTaskTitle()},
            {"Description", report.getTaskDescription() != null ? report.getTaskDescription() : "N/A"},
            {"Priority", report.getPriority()},
            {"Final Status", report.getFinalStatus()},
            {"Project", report.getProjectName() != null ? report.getProjectName() : "N/A"},
            {"Created By", report.getCreatedBy() != null ? report.getCreatedBy() : "N/A"},
            {"Assigned To", report.getAssignedTo() != null ? report.getAssignedTo() : "N/A"},
            {"Approved By", report.getApprovedBy() != null ? report.getApprovedBy() : "N/A"},
            {"Created At", report.getCreatedAt() != null ? report.getCreatedAt().format(DATE_FORMATTER) : "N/A"},
            {"Completed At", report.getCompletedAt() != null ? report.getCompletedAt().format(DATE_FORMATTER) : "N/A"}
        };
        
        int rowNum = 0;
        for (String[] rowData : data) {
            Row row = sheet.createRow(rowNum++);
            
            Cell headerCell = row.createCell(0);
            headerCell.setCellValue(rowData[0]);
            headerCell.setCellStyle(headerStyle);
            
            Cell valueCell = row.createCell(1);
            valueCell.setCellValue(rowData[1]);
            valueCell.setCellStyle(dataStyle);
        }
        
        // Auto-size columns
        sheet.setColumnWidth(0, 20 * 256);
        sheet.setColumnWidth(1, 50 * 256);
    }
    
    private void createCommentsSheet(Sheet sheet, List<AuditReportResponse.CommentEntry> comments,
                                      CellStyle headerStyle, CellStyle dataStyle) {
        // Header row
        Row headerRow = sheet.createRow(0);
        String[] headers = {"Timestamp", "Author", "Type", "Comment"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        // Data rows
        int rowNum = 1;
        for (AuditReportResponse.CommentEntry comment : comments) {
            Row row = sheet.createRow(rowNum++);
            
            Cell timestampCell = row.createCell(0);
            timestampCell.setCellValue(comment.getTimestamp() != null ? 
                comment.getTimestamp().format(DATE_FORMATTER) : "N/A");
            timestampCell.setCellStyle(dataStyle);
            
            Cell authorCell = row.createCell(1);
            authorCell.setCellValue(comment.getAuthor());
            authorCell.setCellStyle(dataStyle);
            
            Cell typeCell = row.createCell(2);
            typeCell.setCellValue(comment.getType());
            typeCell.setCellStyle(dataStyle);
            
            Cell commentCell = row.createCell(3);
            commentCell.setCellValue(comment.getComment());
            commentCell.setCellStyle(dataStyle);
        }
        
        // Auto-size columns
        sheet.setColumnWidth(0, 22 * 256);
        sheet.setColumnWidth(1, 15 * 256);
        sheet.setColumnWidth(2, 12 * 256);
        sheet.setColumnWidth(3, 50 * 256);
    }
    
    /**
     * Exports audit report to PDF format
     * Includes task details table, comments section, and page numbers
     */
    public byte[] exportAuditToPdf(AuditReportResponse report) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 54, 54);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            
            // Add page numbers in footer
            writer.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter writer, Document document) {
                    try {
                        PdfContentByte cb = writer.getDirectContent();
                        cb.beginText();
                        cb.setFontAndSize(BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED), 10);
                        cb.showTextAligned(PdfContentByte.ALIGN_CENTER,
                            "Page " + writer.getPageNumber(),
                            (document.right() - document.left()) / 2 + document.leftMargin(),
                            document.bottom() - 20, 0);
                        cb.endText();
                    } catch (Exception e) {
                        log.warn("Failed to add page number to PDF", e);
                    }
                }
            });
            
            document.open();
            
            // Header
            com.itextpdf.text.Font titleFont = new com.itextpdf.text.Font(
                com.itextpdf.text.Font.FontFamily.HELVETICA, 18, com.itextpdf.text.Font.BOLD, 
                new BaseColor(51, 51, 51));
            Paragraph title = new Paragraph("FlowLite Audit Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);
            
            // Task Details Table
            addSectionTitle(document, "Task Details");
            PdfPTable detailsTable = createDetailsTable(report);
            document.add(detailsTable);
            
            // Comments Section
            if (report.getComments() != null && !report.getComments().isEmpty()) {
                document.add(new Paragraph(" "));
                addSectionTitle(document, "Activity History");
                PdfPTable commentsTable = createCommentsTable(report.getComments());
                document.add(commentsTable);
            }
            
            // Footer timestamp
            document.add(new Paragraph(" "));
            com.itextpdf.text.Font footerFont = new com.itextpdf.text.Font(
                com.itextpdf.text.Font.FontFamily.HELVETICA, 9, com.itextpdf.text.Font.ITALIC, 
                BaseColor.GRAY);
            Paragraph footer = new Paragraph("Generated on: " + 
                java.time.LocalDateTime.now().format(DATE_FORMATTER), footerFont);
            footer.setAlignment(Element.ALIGN_RIGHT);
            document.add(footer);
            
            document.close();
            return outputStream.toByteArray();
            
        } catch (Exception e) {
            log.error("Error generating PDF export", e);
            throw new RuntimeException("Failed to generate PDF export: " + e.getMessage());
        }
    }
    
    private void addSectionTitle(Document document, String titleText) throws DocumentException {
        com.itextpdf.text.Font sectionFont = new com.itextpdf.text.Font(
            com.itextpdf.text.Font.FontFamily.HELVETICA, 14, com.itextpdf.text.Font.BOLD, 
            new BaseColor(59, 130, 246));
        Paragraph sectionTitle = new Paragraph(titleText, sectionFont);
        sectionTitle.setSpacingBefore(15);
        sectionTitle.setSpacingAfter(10);
        document.add(sectionTitle);
    }
    
    private PdfPTable createDetailsTable(AuditReportResponse report) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1, 2.5f});
        
        com.itextpdf.text.Font headerFont = new com.itextpdf.text.Font(
            com.itextpdf.text.Font.FontFamily.HELVETICA, 10, com.itextpdf.text.Font.BOLD);
        com.itextpdf.text.Font dataFont = new com.itextpdf.text.Font(
            com.itextpdf.text.Font.FontFamily.HELVETICA, 10);
        
        addTableRow(table, "Task ID", String.valueOf(report.getTaskId()), headerFont, dataFont);
        addTableRow(table, "Title", report.getTaskTitle(), headerFont, dataFont);
        addTableRow(table, "Description", report.getTaskDescription() != null ? report.getTaskDescription() : "N/A", headerFont, dataFont);
        addTableRow(table, "Priority", report.getPriority(), headerFont, dataFont);
        addTableRow(table, "Final Status", report.getFinalStatus(), headerFont, dataFont);
        addTableRow(table, "Project", report.getProjectName() != null ? report.getProjectName() : "N/A", headerFont, dataFont);
        addTableRow(table, "Created By", report.getCreatedBy() != null ? report.getCreatedBy() : "N/A", headerFont, dataFont);
        addTableRow(table, "Assigned To", report.getAssignedTo() != null ? report.getAssignedTo() : "N/A", headerFont, dataFont);
        addTableRow(table, "Approved By", report.getApprovedBy() != null ? report.getApprovedBy() : "N/A", headerFont, dataFont);
        addTableRow(table, "Created At", report.getCreatedAt() != null ? report.getCreatedAt().format(DATE_FORMATTER) : "N/A", headerFont, dataFont);
        addTableRow(table, "Completed At", report.getCompletedAt() != null ? report.getCompletedAt().format(DATE_FORMATTER) : "N/A", headerFont, dataFont);
        
        return table;
    }
    
    private void addTableRow(PdfPTable table, String label, String value, 
                              com.itextpdf.text.Font labelFont, com.itextpdf.text.Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBackgroundColor(new BaseColor(241, 245, 249));
        labelCell.setPadding(8);
        table.addCell(labelCell);
        
        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setPadding(8);
        table.addCell(valueCell);
    }
    
    private PdfPTable createCommentsTable(List<AuditReportResponse.CommentEntry> comments) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.2f, 0.8f, 0.6f, 2f});
        
        com.itextpdf.text.Font headerFont = new com.itextpdf.text.Font(
            com.itextpdf.text.Font.FontFamily.HELVETICA, 9, com.itextpdf.text.Font.BOLD, 
            BaseColor.WHITE);
        com.itextpdf.text.Font dataFont = new com.itextpdf.text.Font(
            com.itextpdf.text.Font.FontFamily.HELVETICA, 9);
        
        // Header row
        String[] headers = {"Timestamp", "Author", "Type", "Comment"};
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
            cell.setBackgroundColor(new BaseColor(59, 130, 246));
            cell.setPadding(6);
            table.addCell(cell);
        }
        
        // Data rows
        boolean alternate = false;
        for (AuditReportResponse.CommentEntry comment : comments) {
            BaseColor bgColor = alternate ? new BaseColor(248, 250, 252) : BaseColor.WHITE;
            
            addCommentCell(table, comment.getTimestamp() != null ? 
                comment.getTimestamp().format(DATE_FORMATTER) : "N/A", dataFont, bgColor);
            addCommentCell(table, comment.getAuthor(), dataFont, bgColor);
            addCommentCell(table, comment.getType(), dataFont, bgColor);
            addCommentCell(table, comment.getComment(), dataFont, bgColor);
            
            alternate = !alternate;
        }
        
        return table;
    }
    
    private void addCommentCell(PdfPTable table, String text, 
                                 com.itextpdf.text.Font font, BaseColor bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bgColor);
        cell.setPadding(5);
        table.addCell(cell);
    }
}
