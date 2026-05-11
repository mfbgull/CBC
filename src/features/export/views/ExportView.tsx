/**
 * Export View
 * Generate PDF, Excel, and Print exports from BOQ data
 * Uses ERP design system
 */

import { useCallback, useMemo } from 'react';
import { useBoqStore } from '../../boq/store';
import { useProjectsStore } from '../../projects/store';
import { useSettingsStore } from '../../settings/store';
import { useExportStore } from '../store';
import { formatCurrency, calculateTotals } from '../../../lib/calculations';

export function ExportView() {
  // Store state
  const boqItems = useBoqStore((state) => state.items);
  const projects = useProjectsStore((state) => state.projects);
  const currentProjectId = useProjectsStore((state) => state.currentProjectId);
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const settings = useSettingsStore((state) => state.settings);
  const exportOptions = useExportStore((state) => state.exportOptions);
  const setExportOptions = useExportStore((state) => state.setExportOptions);
  const isExporting = useExportStore((state) => state.isExporting);
  const setExporting = useExportStore((state) => state.setExporting);

  // Calculate summary
  const subtotal = useMemo(() => 
    boqItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
    [boqItems]
  );

  const totals = useMemo(() => 
    calculateTotals(
      subtotal,
      exportOptions.includeTax ? exportOptions.taxRate : 0,
      exportOptions.includeContingency ? exportOptions.contingencyRate : 0,
      exportOptions.includeProfitMargin ? exportOptions.profitMarginRate : 0
    ),
    [subtotal, exportOptions]
  );

  // Generate PDF
  const generatePDF = useCallback(async () => {
    if (!currentProject) {
      alert('Please select a project first');
      return;
    }

    try {
      setExporting(true);

      // Dynamic import of jsPDF
      const jsPDFModule = await import('jspdf');
      const JsPDF = jsPDFModule.default;
      
      const doc = new JsPDF({
        orientation: exportOptions.orientation as 'portrait' | 'landscape',
        unit: 'mm',
        format: exportOptions.pageSize as 'a4' | 'a3' | 'letter',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      let y = margin;
      
      // Colors
      const primaryColor: [number, number, number] = [37, 99, 235]; // #2563eb
      const inkColor: [number, number, number] = [30, 41, 59]; // #1e293b
      const mutedColor: [number, number, number] = [100, 116, 139]; // #64748b
      const lineColor: [number, number, number] = [226, 232, 240]; // #e2e8f0
      
      // ===== HEADER SECTION =====
      // Blue header bar
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Company name in header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.companyName || 'Construction BOQ', margin, 18);
      
      // Subtitle
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const contactParts = [
        settings.companyAddress,
        settings.companyPhone,
        settings.companyEmail,
      ].filter(Boolean);
      doc.text(contactParts.join(' | ') || 'Professional Construction Services', margin, 28);
      
      // Date on right
      doc.setFontSize(9);
      doc.text(`Date: ${new Date().toLocaleDateString('en-PK')}`, pageWidth - margin, 18, { align: 'right' });
      
      y = 50;
      
      // ===== PROJECT INFO SECTION =====
      const infoBoxWidth = contentWidth / 2 - 5;
      
      // Project info box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, infoBoxWidth, 28, 3, 3, 'F');
      
      // Blue accent line
      doc.setFillColor(...primaryColor);
      doc.rect(margin, y, 3, 28, 'F');
      
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT', margin + 8, y + 8);
      
      doc.setTextColor(...inkColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(currentProject.name, margin + 8, y + 16);
      
      doc.setTextColor(...mutedColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(currentProject.projectType?.charAt(0).toUpperCase() + currentProject.projectType?.slice(1) || '', margin + 8, y + 24);
      
      // Client info box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin + infoBoxWidth + 10, y, infoBoxWidth, 28, 3, 3, 'F');
      
      doc.setFillColor(...primaryColor);
      doc.rect(margin + infoBoxWidth + 10, y, 3, 28, 'F');
      
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENT', margin + infoBoxWidth + 18, y + 8);
      
      doc.setTextColor(...inkColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(currentProject.clientName || 'N/A', margin + infoBoxWidth + 18, y + 15);
      
      doc.setTextColor(...mutedColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(currentProject.clientPhone || currentProject.location || '', margin + infoBoxWidth + 18, y + 22);
      
      y += 38;
      
      // ===== TABLE HEADER =====
      doc.setFillColor(...primaryColor);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      const tableY = y + 7;
      const colWidths = { desc: 75, cat: 32, qty: 32, rate: 22, total: 20 };
      const colX: Record<string, number> = { desc: margin + 4 };
      colX.cat = colX.desc + colWidths.desc;
      colX.qty = colX.cat + colWidths.cat;
      colX.rate = colX.qty + colWidths.qty;
      colX.total = colX.rate + colWidths.rate;
      
      doc.text('Description', colX.desc, tableY);
      doc.text('Category', colX.cat, tableY);
      doc.text('Quantity', colX.qty, tableY);
      doc.text('Rate', colX.rate, tableY);
      doc.text('Total', pageWidth - margin - 4, tableY, { align: 'right' });
      
      y += 12;
      
      // ===== TABLE ROWS =====
      const categoryLabels: Record<string, string> = {
        structure: 'Structure',
        architecture: 'Architecture',
        electrical: 'Electrical',
        plumbing: 'Plumbing',
        hvac: 'HVAC',
        other: 'Other',
      };
      
      boqItems.forEach((item, index) => {
        // Check if we need a new page
        if (y > pageHeight - 60) {
          doc.addPage();
          y = margin;
          
          // Repeat header on new page
          doc.setFillColor(...primaryColor);
          doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Description', colX.desc, tableY);
          doc.text('Category', colX.cat, tableY);
          doc.text('Quantity', colX.qty, tableY);
          doc.text('Rate', colX.rate, tableY);
          doc.text('Total', pageWidth - margin - 4, tableY, { align: 'right' });
          y += 12;
        }
        
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 2, contentWidth, 9, 'F');
        }
        
        // Draw bottom line
        doc.setDrawColor(...lineColor);
        doc.setLineWidth(0.3);
        doc.line(margin, y + 5, margin + contentWidth, y + 5);
        
        doc.setTextColor(...inkColor);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        // Description (truncate if needed)
        const desc = (item.description || '-').substring(0, 40);
        doc.text(desc, colX.desc, y + 4);
        
        // Category
        doc.setTextColor(...mutedColor);
        doc.text(categoryLabels[item.category] || item.category, colX.cat, y + 4);
        
        // Quantity + Unit merged (e.g., "100 sft")
        doc.setTextColor(...inkColor);
        const qtyStr = item.quantity.toLocaleString('en-PK', { minimumFractionDigits: 2 });
        const unitStr = item.unit || 'sft';
        doc.text(`${qtyStr} ${unitStr}`, colX.qty, y + 4);
        
        // Rate
        doc.text(formatCurrency(item.rate, '').replace('PKR ', ''), colX.rate, y + 4);
        
        // Total - bold and primary color
        doc.setTextColor(...primaryColor);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(item.quantity * item.rate, '').replace('PKR ', ''), pageWidth - margin - 4, y + 4, { align: 'right' });
        
        y += 8;
      });
      
      y += 10;
      
      // ===== SUMMARY SECTION =====
      const summaryX = pageWidth - margin - 80;
      const summaryWidth = 80;
      
      // Summary background
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(summaryX - 5, y, summaryWidth + 5, 70, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // Subtotal
      doc.setTextColor(...mutedColor);
      doc.text('Subtotal', summaryX, y + 10);
      doc.setTextColor(...inkColor);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(subtotal, '').replace('PKR ', ''), summaryX + summaryWidth, y + 10, { align: 'right' });
      
      // Tax
      if (exportOptions.includeTax) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mutedColor);
        doc.text(`Tax (${exportOptions.taxRate}%)`, summaryX, y + 22);
        doc.setTextColor(...inkColor);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(totals.tax, '').replace('PKR ', ''), summaryX + summaryWidth, y + 22, { align: 'right' });
      }
      
      // Contingency
      if (exportOptions.includeContingency) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mutedColor);
        doc.text(`Contingency (${exportOptions.contingencyRate}%)`, summaryX, y + 34);
        doc.setTextColor(...inkColor);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(totals.contingency, '').replace('PKR ', ''), summaryX + summaryWidth, y + 34, { align: 'right' });
      }
      
      // Profit Margin
      if (exportOptions.includeProfitMargin) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mutedColor);
        doc.text(`Profit (${exportOptions.profitMarginRate}%)`, summaryX, y + 46);
        doc.setTextColor(...inkColor);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(totals.profitMargin, '').replace('PKR ', ''), summaryX + summaryWidth, y + 46, { align: 'right' });
      }
      
      // Grand Total box
      doc.setFillColor(...primaryColor);
      doc.roundedRect(summaryX - 5, y + 52, summaryWidth + 5, 14, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('GRAND TOTAL', summaryX, y + 61);
      doc.setFontSize(13);
      doc.text(formatCurrency(totals.grandTotal, '').replace('PKR ', ''), summaryX + summaryWidth, y + 61, { align: 'right' });
      
      // ===== FOOTER =====
      const footerY = pageHeight - 12;
      doc.setDrawColor(...lineColor);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        margin,
        footerY
      );
      doc.text('Construction BOQ Calculator', pageWidth - margin, footerY, { align: 'right' });
      
      // Save
      const filename = `${currentProject.name.replace(/\s+/g, '_')}_BOQ_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      alert('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [currentProject, boqItems, settings, exportOptions, subtotal, totals, setExporting]);

  // Generate Excel
  const generateExcel = useCallback(async () => {
    if (!currentProject) {
      alert('Please select a project first');
      return;
    }

    try {
      setExporting(true);

      const XLSX = await import('xlsx');

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Prepare data
      const rows: (string | number)[][] = [
        // Company info
        settings.companyName ? [settings.companyName] : [],
        settings.companyAddress ? [settings.companyAddress] : [],
        settings.companyPhone ? [`Phone: ${settings.companyPhone}`] : [],
        [],
        // Project info
        ['Project:', currentProject.name],
        currentProject.clientName ? ['Client:', currentProject.clientName] : [],
        currentProject.clientPhone ? ['Phone:', currentProject.clientPhone] : [],
        currentProject.location ? ['Location:', currentProject.location] : [],
        [],
        // Headers
        ['Description', 'Category', 'Quantity', 'Unit', 'Rate', 'Total'],
      ];

      // Add items
      boqItems.forEach((item) => {
        rows.push([
          item.description,
          item.category,
          item.quantity,
          item.unit,
          item.rate,
          item.quantity * item.rate,
        ]);
      });

      // Summary
      rows.push([]);
      rows.push(['Subtotal', '', '', '', '', subtotal]);

      if (exportOptions.includeTax) {
        rows.push(['Tax', '', '', '', '', totals.tax]);
      }
      if (exportOptions.includeContingency) {
        rows.push(['Contingency', '', '', '', '', totals.contingency]);
      }
      if (exportOptions.includeProfitMargin) {
        rows.push(['Profit Margin', '', '', '', '', totals.profitMargin]);
      }
      rows.push(['Grand Total', '', '', '', '', totals.grandTotal]);

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Set column widths
      ws['!cols'] = [
        { wch: 40 },
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'BOQ');

      const filename = `${currentProject.name.replace(/\s+/g, '_')}_BOQ_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      alert('Excel exported successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to export Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [currentProject, boqItems, settings, exportOptions, subtotal, totals, setExporting]);

  // Print with styled layout
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }

    const categoryLabels: Record<string, string> = {
      structure: 'Structure',
      architecture: 'Architecture',
      electrical: 'Electrical',
      plumbing: 'Plumbing',
      hvac: 'HVAC',
      other: 'Other',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BOQ - ${currentProject?.name || 'Project'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            font-size: 11px; 
            color: #1e293b;
            padding: 20mm;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            padding-bottom: 15px; 
            border-bottom: 2px solid #2563eb;
          }
          .header h1 { 
            font-size: 22px; 
            color: #2563eb; 
            margin-bottom: 5px; 
          }
          .header p { color: #64748b; font-size: 10px; }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 20px;
          }
          .info-box { 
            background: #f8fafc; 
            padding: 12px; 
            border-radius: 6px;
            border-left: 3px solid #2563eb;
          }
          .info-box h3 { 
            font-size: 9px; 
            color: #64748b; 
            text-transform: uppercase; 
            margin-bottom: 5px; 
          }
          .info-box p { font-size: 12px; font-weight: 600; }
          .info-box small { color: #64748b; font-size: 10px; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
          }
          th { 
            background: #2563eb; 
            color: white; 
            padding: 10px 8px; 
            text-align: left; 
            font-weight: 600;
          }
          th:last-child, td:last-child { text-align: right; }
          td { 
            padding: 10px 8px; 
            border-bottom: 1px solid #e2e8f0; 
          }
          tr:nth-child(even) { background: #f8fafc; }
          .qty-cell, .rate-cell { text-align: right; }
          .total-cell { font-weight: 600; color: #2563eb; }
          .summary { 
            background: #f1f5f9; 
            padding: 15px; 
            border-radius: 8px; 
            margin-top: 20px;
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 6px 0; 
            border-bottom: 1px solid #e2e8f0;
          }
          .summary-row:last-child { border: none; }
          .summary-label { color: #64748b; }
          .summary-value { font-weight: 600; }
          .grand-total { 
            background: #2563eb; 
            color: white; 
            padding: 12px 15px; 
            border-radius: 6px; 
            display: flex; 
            justify-content: space-between; 
            margin-top: 10px;
          }
          .grand-total .label { font-weight: 600; }
          .grand-total .value { font-size: 18px; font-weight: 700; }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            color: #94a3b8; 
            font-size: 9px;
          }
          @media print {
            body { padding: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${settings.companyName || 'Construction BOQ'}</h1>
          <p>${settings.companyAddress || ''} | ${settings.companyPhone || ''} | ${settings.companyEmail || ''}</p>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Project</h3>
            <p>${currentProject?.name || 'N/A'}</p>
            <small>${currentProject?.projectType || ''}</small>
          </div>
          <div class="info-box">
            <h3>Client</h3>
            <p>${currentProject?.clientName || 'N/A'}</p>
            <small>${currentProject?.clientPhone || ''}${currentProject?.location ? (currentProject?.clientPhone ? ' | ' : '') + currentProject?.location : ''}</small>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40%">Description</th>
              <th style="width: 15%">Category</th>
              <th style="width: 12%">Quantity</th>
              <th style="width: 10%">Unit</th>
              <th style="width: 12%">Rate</th>
              <th style="width: 11%">Total</th>
            </tr>
          </thead>
          <tbody>
            ${boqItems.map(item => `
              <tr>
                <td>${item.description || '-'}</td>
                <td>${categoryLabels[item.category] || item.category}</td>
                <td class="qty-cell">${item.quantity.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                <td>${item.unit}</td>
                <td class="rate-cell">${formatCurrency(item.rate, '')}</td>
                <td class="total-cell">${formatCurrency(item.quantity * item.rate, '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Subtotal (${boqItems.length} items)</span>
            <span class="summary-value">${formatCurrency(subtotal)}</span>
          </div>
          ${exportOptions.includeTax ? `
          <div class="summary-row">
            <span class="summary-label">Tax (${exportOptions.taxRate}%)</span>
            <span class="summary-value">${formatCurrency(totals.tax)}</span>
          </div>
          ` : ''}
          ${exportOptions.includeContingency ? `
          <div class="summary-row">
            <span class="summary-label">Contingency (${exportOptions.contingencyRate}%)</span>
            <span class="summary-value">${formatCurrency(totals.contingency)}</span>
          </div>
          ` : ''}
          ${exportOptions.includeProfitMargin ? `
          <div class="summary-row">
            <span class="summary-label">Profit Margin (${exportOptions.profitMarginRate}%)</span>
            <span class="summary-value">${formatCurrency(totals.profitMargin)}</span>
          </div>
          ` : ''}
          <div class="grand-total">
            <span class="label">GRAND TOTAL</span>
            <span class="value">${formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>

        <div class="footer">
          Generated on ${new Date().toLocaleDateString('en-PK', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })} | Construction BOQ Calculator
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }, [currentProject, boqItems, settings, exportOptions, subtotal, totals]);

  // No project selected
  if (!currentProject) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📄</div>
        <div className="empty-state-title">No Project Selected</div>
        <div className="empty-state-desc">Please select a project from the Projects tab to export its BOQ</div>
      </div>
    );
  }

  // Empty BOQ
  if (boqItems.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📄</div>
        <div className="empty-state-title">No BOQ Items</div>
        <div className="empty-state-desc">Add items to your BOQ first before exporting</div>
      </div>
    );
  }

  return (
    <div className="panel">
      {/* Panel Header */}
      <div className="panel-head">
        <div className="title-block">
          <h1 className="panel-title">Export BOQ</h1>
        </div>
      </div>

      {/* Export Options */}
      <div className="panel mt-4">
        <h2 className="text-base font-semibold mb-4">Export Options</h2>
        
        <div className="form-grid">
          <div className="form-field span-6">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={exportOptions.includeCompanyDetails}
                onChange={(e) => setExportOptions({ includeCompanyDetails: e.target.checked })}
              />
              <span>Include Company Details</span>
            </label>
          </div>
          <div className="form-field span-6">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={exportOptions.includeProjectDetails}
                onChange={(e) => setExportOptions({ includeProjectDetails: e.target.checked })}
              />
              <span>Include Project Details</span>
            </label>
          </div>
          <div className="form-field span-4">
            <label className="form-label">Page Size</label>
            <select
              className="form-control"
              value={exportOptions.pageSize}
              onChange={(e) => setExportOptions({ pageSize: e.target.value as 'a4' | 'a3' | 'letter' })}
            >
              <option value="a4">A4</option>
              <option value="a3">A3</option>
              <option value="letter">Letter</option>
            </select>
          </div>
          <div className="form-field span-4">
            <label className="form-label">Orientation</label>
            <select
              className="form-control"
              value={exportOptions.orientation}
              onChange={(e) => setExportOptions({ orientation: e.target.value as 'portrait' | 'landscape' })}
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>

        {/* Tax/Contingency/Profit Options */}
        <div className="form-grid mt-4 pt-4 border-t border-line">
          <div className="form-field span-4">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={exportOptions.includeTax}
                onChange={(e) => setExportOptions({ includeTax: e.target.checked })}
              />
              <span>Tax ({exportOptions.taxRate}%)</span>
            </label>
          </div>
          <div className="form-field span-4">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={exportOptions.includeContingency}
                onChange={(e) => setExportOptions({ includeContingency: e.target.checked })}
              />
              <span>Contingency ({exportOptions.contingencyRate}%)</span>
            </label>
          </div>
          <div className="form-field span-4">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={exportOptions.includeProfitMargin}
                onChange={(e) => setExportOptions({ includeProfitMargin: e.target.checked })}
              />
              <span>Profit Margin ({exportOptions.profitMarginRate}%)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Export Preview Card */}
      <div className="export-preview-card mt-4">
        <div className="export-preview-header">
          <span className="export-preview-title">BOQ Preview</span>
          <span className="export-preview-count">{boqItems.length} items</span>
        </div>
        <div className="export-preview-body">
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-ink">{currentProject.name}</p>
              <p className="text-sm text-muted">{currentProject.clientName || 'No client'}{currentProject.clientPhone ? ` | ${currentProject.clientPhone}` : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary-600">{formatCurrency(totals.grandTotal)}</p>
              <p className="text-sm text-muted">Grand Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="panel-actions mt-4">
        <button
          onClick={generatePDF}
          disabled={isExporting}
          className="btn btn-danger"
        >
          📕 Export PDF
        </button>
        <button
          onClick={generateExcel}
          disabled={isExporting}
          className="btn btn-success"
        >
          📊 Export Excel
        </button>
        <button
          onClick={handlePrint}
          className="btn btn-secondary"
        >
          🖨️ Print
        </button>
      </div>
    </div>
  );
}

export default ExportView;