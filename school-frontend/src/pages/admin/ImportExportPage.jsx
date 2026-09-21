import React, { useState } from 'react';
import { studentService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { FileSpreadsheet, Upload, Download, CheckCircle, AlertCircle, RefreshCw, Info, AlertTriangle } from 'lucide-react';

export const ImportExportPage = () => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const { addToast } = useToast();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) {
      addToast('Please select an Excel file (.xlsx) first', 'warning');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await studentService.importExcel(formData);
      if (res.success && res.data) {
        setImportResult(res.data);
        addToast(`Import complete: ${res.data.imported} inserted, ${res.data.updated} updated`, 'success');
      } else {
        addToast(res.message || 'Import failed', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error processing Excel file', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await studentService.exportExcel();
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'school_management_backup.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('Backup downloaded successfully', 'success');
    } catch (err) {
      addToast('Failed to export school data', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>
          <FileSpreadsheet className="text-primary" /> Data Import & Export
        </h1>
        <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>
          Bulk import student rosters using Excel spreadsheets and generate comprehensive system backups
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Import Section Card */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Upload className="text-primary" size={20} /> Excel Student Bulk Import
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Upload a spreadsheet with student records. If an <strong>Admission Number</strong> already exists, that student record will be updated automatically (upsert).
          </p>

          <form onSubmit={handleImport}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Choose .xlsx File</label>
              <input
                type="file"
                accept=".xlsx, .xls"
                className="form-control"
                onChange={handleFileChange}
                disabled={importing}
              />
              {file && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || importing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {importing ? <RefreshCw className="spin" size={16} /> : <Upload size={16} />}
              {importing ? 'Processing File...' : 'Start Import'}
            </button>
          </form>

          {/* Guidelines Box */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary, #f8f9fa)', borderRadius: '6px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Info size={16} className="text-primary" /> Supported Column Headers
            </div>
            <ul style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text-muted)' }}>
              <li><strong>Admission No</strong> or <strong>Admission Number</strong> (Required, Unique)</li>
              <li><strong>Student Name</strong> or <strong>Name</strong> (Required)</li>
              <li><strong>Class</strong> or <strong>Class Name</strong> (Required)</li>
              <li><strong>Section</strong> (e.g. A, B)</li>
              <li><strong>Gender</strong> (e.g. Male, Female)</li>
              <li><strong>Date of Birth</strong> (YYYY-MM-DD)</li>
            </ul>
          </div>
        </div>

        {/* Export Section Card */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Download className="text-primary" size={20} /> System Excel Backup Export
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Export all student directory records into a multi-column Excel spreadsheet. Formatted with bold header rows, auto-fitted columns, and frozen header pane.
          </p>

          <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary, #f8f9fa)', borderRadius: '6px', marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Includes:</p>
            <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <li>Complete Student Directory with IDs & Roll details</li>
              <li>Parent Linkage Identifiers</li>
              <li>Class and Section assignments</li>
            </ul>
          </div>

          <button
            onClick={handleExport}
            className="btn btn-secondary"
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {exporting ? <RefreshCw className="spin" size={16} /> : <Download size={16} />}
            {exporting ? 'Generating Excel...' : 'Download school_management_backup.xlsx'}
          </button>
        </div>
      </div>

      {/* Import Results Banner & Errors Table */}
      {importResult && (
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle className="text-success" size={20} /> Import Results Summary
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0369a1' }}>{importResult.totalRows}</div>
              <div style={{ fontSize: '0.85rem', color: '#0369a1' }}>Total Rows</div>
            </div>
            <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#047857' }}>{importResult.importedCount}</div>
              <div style={{ fontSize: '0.85rem', color: '#047857' }}>New Inserted</div>
            </div>
            <div style={{ padding: '1rem', background: '#fefce8', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a16207' }}>{importResult.updatedCount}</div>
              <div style={{ fontSize: '0.85rem', color: '#a16207' }}>Existing Updated</div>
            </div>
            <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4b5563' }}>{importResult.skippedCount}</div>
              <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>Skipped</div>
            </div>
            <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b91c1c' }}>{importResult.failedCount}</div>
              <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>Failed Rows</div>
            </div>
          </div>

          {/* Row Errors Table */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <AlertTriangle size={16} /> Row-Level Issues & Warnings
              </h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Row</th>
                      <th style={{ width: '150px' }}>Field</th>
                      <th>Reason / Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((err, idx) => (
                      <tr key={idx}>
                        <td><strong>#{err.rowNumber}</strong></td>
                        <td><span className="badge badge-secondary">{err.fieldName}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
