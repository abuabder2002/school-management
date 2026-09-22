import React, { useState, useRef } from 'react';
import { studentService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  X,
  FileDown,
  RefreshCw,
  Info
} from 'lucide-react';

/**
 * Natural sort helper for Admission Numbers (e.g. ADM-2, ADM-10, ADM-100)
 * Secondary sort by Excel Row ascending.
 */
export const sortErrorsByAdmissionNumber = (errors) => {
  if (!errors || !Array.isArray(errors)) return [];

  const parseChunks = (str) => {
    return str.split(/(\d+)/).filter(Boolean).map((chunk) => {
      const num = parseInt(chunk, 10);
      return isNaN(num) ? chunk.toLowerCase() : num;
    });
  };

  return [...errors].sort((a, b) => {
    const admA = (a.admissionNumber || '').trim();
    const admB = (b.admissionNumber || '').trim();

    if (!admA && !admB) return (a.row || 0) - (b.row || 0);
    if (!admA) return 1;
    if (!admB) return -1;

    // Compare natural chunks
    const chunksA = parseChunks(admA);
    const chunksB = parseChunks(admB);
    const minLen = Math.min(chunksA.length, chunksB.length);

    for (let i = 0; i < minLen; i++) {
      const cA = chunksA[i];
      const cB = chunksB[i];

      if (typeof cA === 'number' && typeof cB === 'number') {
        if (cA !== cB) return cA - cB;
      } else {
        const strA = String(cA);
        const strB = String(cB);
        const comp = strA.localeCompare(strB, undefined, { sensitivity: 'base' });
        if (comp !== 0) return comp;
      }
    }

    if (chunksA.length !== chunksB.length) {
      return chunksA.length - chunksB.length;
    }

    // Secondary sort: Excel Row ASC
    return (a.row || 0) - (b.row || 0);
  });
};

export const BulkUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileProcessingProgress, setFileProcessingProgress] = useState(0);
  const [fileProcessingSuccessful, setFileProcessingSuccessful] = useState(false);
  const [fileProcessingError, setFileProcessingError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setLoading(false);
    setLoadingStep('');
    setFileProcessing(false);
    setFileProcessingProgress(0);
    setFileProcessingSuccessful(false);
    setFileProcessingError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    const validExtensions = ['.xlsx', '.xls'];
    const fileName = selectedFile.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExt) {
      addToast('Please select a valid Excel file (.xlsx or .xls)', 'error');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      addToast('File size exceeds maximum limit of 10MB', 'error');
      return;
    }

    // Initialize State 2: FILE SELECTED / PROCESSING
    setFile(selectedFile);
    setResult(null);
    setFileProcessing(true);
    setFileProcessingProgress(0);
    setFileProcessingSuccessful(false);
    setFileProcessingError('');

    // Read and validate file content
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(95, Math.round((event.loaded / event.total) * 100));
        setFileProcessingProgress(percent);
      }
    };

    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target.result);
        if (buffer.length < 10) {
          throw new Error('Selected Excel file is empty or corrupted.');
        }

        // Check magic bytes for ZIP (.xlsx) or OLE (.xls)
        const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B; // PK
        const isOle = buffer[0] === 0xD0 && buffer[1] === 0xCF; // Compound File Binary
        if (!isZip && !isOle && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
          throw new Error('Unable to process this Excel file: unsupported format.');
        }

        setFileProcessingProgress(100);
        // Short settle to clearly show 100% completion before enabling Submit
        setTimeout(() => {
          setFileProcessing(false);
          setFileProcessingSuccessful(true);
        }, 350);
      } catch (err) {
        setFileProcessing(false);
        setFileProcessingSuccessful(false);
        setFileProcessingError(err.message || 'Unable to process this Excel file.');
        addToast(err.message || 'Unable to process this Excel file.', 'error');
      }
    };

    reader.onerror = () => {
      setFileProcessing(false);
      setFileProcessingSuccessful(false);
      setFileProcessingError('Unable to process this Excel file.');
      addToast('Unable to process this Excel file.', 'error');
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await studentService.downloadBulkTemplate();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('Template downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to download template', err);
      addToast('Failed to download template file', 'error');
    }
  };

  const downloadErrorExcel = (base64Data) => {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const filename = `student_bulk_upload_errors_${timestamp}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to auto-download error report', err);
    }
  };

  const handleSubmit = async () => {
    if (!file || fileProcessing || !fileProcessingSuccessful || loading) {
      return;
    }

    setLoading(true);
    setLoadingStep('Uploading and validating students...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await studentService.bulkUpload(formData);
      const uploadResult = response.data || response;

      // Ensure errors are sorted by Admission No ascending
      if (uploadResult.errors && Array.isArray(uploadResult.errors)) {
        uploadResult.errors = sortErrorsByAdmissionNumber(uploadResult.errors);
      }

      setResult(uploadResult);
      setLoading(false);

      if (uploadResult.success) {
        addToast(
          `Bulk Upload Successful: ${uploadResult.insertedCount} students enrolled!`,
          'success'
        );
        if (onSuccess) onSuccess();
      } else {
        addToast(
          `Bulk Upload Failed: ${uploadResult.errorCount} error(s) found. No students added.`,
          'error'
        );
        if (uploadResult.errorExcelBase64) {
          downloadErrorExcel(uploadResult.errorExcelBase64);
        }
      }
    } catch (err) {
      setLoading(false);
      const errorMsg =
        err.response?.data?.message || err.message || 'Bulk upload failed. Please try again.';
      addToast(errorMsg, 'error');
      setResult({
        success: false,
        insertedCount: 0,
        errorCount: 1,
        message: errorMsg,
        errors: [
          {
            row: 0,
            admissionNumber: '—',
            studentName: '—',
            errorType: 'Server Error',
            errorMessage: errorMsg,
          },
        ],
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Submit is enabled ONLY when file is completely processed, successful, and not submitting
  const isSubmitEnabled = file !== null && !fileProcessing && fileProcessingSuccessful && !loading;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '740px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <UploadCloud size={20} />
            </div>
            <h3 className="card-title" style={{ margin: 0, fontSize: '1.15rem' }}>
              Bulk Student Upload
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem 0.95rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
              }}
              title="Download standard student import Excel template"
            >
              <FileSpreadsheet size={16} /> Download Template
            </button>

            <button
              onClick={handleClose}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* STATE 5 — ADMIN CLICKS SUBMIT: Loading state during backend upload */}
          {loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid var(--primary-light)',
                  borderTopColor: 'var(--primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Processing Bulk Upload</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{loadingStep}</p>
              </div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Success Result View */}
          {!loading && result && result.success && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success-light)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Bulk Upload Successful!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
                <strong style={{ color: 'var(--success)' }}>{result.insertedCount} students</strong> were added successfully to the database.
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  gap: '1.5rem',
                  padding: '1rem 2rem',
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL ROWS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.totalRows}</div>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>STUDENTS ADDED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{result.insertedCount}</div>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ERRORS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-muted)' }}>0</div>
                </div>
              </div>
            </div>
          )}

          {/* Failure Result View with Sorted Errors */}
          {!loading && result && !result.success && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ color: 'var(--danger)', marginTop: '2px' }}>
                  <XCircle size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.05rem', color: '#991b1b', margin: '0 0 0.25rem' }}>
                    Bulk Upload Failed
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: '#b91c1c', margin: 0 }}>
                    <strong>{result.errorCount} error(s)</strong> were found. As the upload is atomic,{' '}
                    <strong>no students were added</strong> to the database.
                  </p>
                </div>

                {result.errorExcelBase64 && (
                  <button
                    type="button"
                    onClick={() => downloadErrorExcel(result.errorExcelBase64)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'var(--danger)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <FileDown size={15} /> Download Error Report
                  </button>
                )}
              </div>

              {/* Sorted Error Details Table */}
              <div style={{ marginBottom: '1rem' }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Detected Issues ({result.errors?.length || 0}):</span>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    Sorted by Admission No (ascending)
                  </span>
                </div>

                <div
                  style={{
                    maxHeight: '230px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#fff',
                  }}
                >
                  <table className="table" style={{ margin: 0, fontSize: '0.85rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)', zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '0.55rem 0.75rem' }}>EXCEL ROW</th>
                        <th style={{ padding: '0.55rem 0.75rem' }}>STUDENT NAME</th>
                        <th style={{ padding: '0.55rem 0.75rem' }}>ADM NO</th>
                        <th style={{ padding: '0.55rem 0.75rem' }}>ISSUE TYPE</th>
                        <th style={{ padding: '0.55rem 0.75rem' }}>DETAILS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortErrorsByAdmissionNumber(result.errors || []).map((err, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>
                            {err.row > 0 ? `Row ${err.row}` : 'File Header'}
                          </td>
                          <td style={{ padding: '0.55rem 0.75rem' }}>{err.studentName || '—'}</td>
                          <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{err.admissionNumber || '—'}</td>
                          <td style={{ padding: '0.55rem 0.75rem' }}>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                fontSize: '0.75rem',
                              }}
                            >
                              {err.errorType || 'Error'}
                            </span>
                          </td>
                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-main)' }}>
                            {err.errorMessage}
                            {err.duplicateWithRow && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Duplicate of Row {err.duplicateWithRow}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Initial Upload Dropzone & File Card View */}
          {!loading && !result && (
            <div>
              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-medium)'}`,
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: dragActive ? 'var(--primary-light)' : 'var(--bg-main)',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  cursor: fileProcessing ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  opacity: fileProcessing ? 0.7 : 1,
                }}
                onClick={() => !fileProcessing && fileInputRef.current && fileInputRef.current.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  disabled={fileProcessing}
                  style={{ display: 'none' }}
                />

                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#eef2ff',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <UploadCloud size={32} />
                </div>

                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Drag And Drop
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Or
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={fileProcessing}
                  style={{
                    backgroundColor: '#0ea5e9',
                    color: '#fff',
                    borderColor: '#0ea5e9',
                    fontWeight: 600,
                    padding: '0.55rem 1.35rem',
                    cursor: fileProcessing ? 'not-allowed' : 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!fileProcessing && fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                >
                  Browse File
                </button>

                <div style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Supported formats: <strong>.xlsx</strong>, <strong>.xls</strong> • Maximum file size: <strong>10 MB</strong>
                </div>
              </div>

              {/* Selected File Card: Displays States 2, 3, or 4 */}
              {file && (
                <div
                  style={{
                    marginTop: '1.25rem',
                    padding: '1rem 1.15rem',
                    backgroundColor: '#f8fafc',
                    border: `1px solid ${
                      fileProcessingError
                        ? 'var(--danger-border)'
                        : fileProcessingSuccessful
                        ? 'var(--success-border)'
                        : 'var(--border-subtle)'
                    }`,
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          backgroundColor: fileProcessingError
                            ? '#fee2e2'
                            : fileProcessingSuccessful
                            ? '#dcfce7'
                            : 'var(--primary-light)',
                          color: fileProcessingError
                            ? 'var(--danger)'
                            : fileProcessingSuccessful
                            ? 'var(--success)'
                            : 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FileSpreadsheet size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatFileSize(file.size)}
                          {fileProcessingSuccessful && (
                            <span style={{ color: 'var(--success)', fontWeight: 600, marginLeft: '0.5rem' }}>
                              • File ready to upload
                            </span>
                          )}
                          {fileProcessingError && (
                            <span style={{ color: 'var(--danger)', fontWeight: 600, marginLeft: '0.5rem' }}>
                              • {fileProcessingError}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={fileProcessing}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: fileProcessing ? 'not-allowed' : 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: fileProcessing ? 0.4 : 1,
                      }}
                      title="Remove selected file"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Progress bar during file processing */}
                  {fileProcessing && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          marginBottom: '0.35rem',
                        }}
                      >
                        <span>Processing Excel...</span>
                        <span>{fileProcessingProgress}%</span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: '#e2e8f0',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${fileProcessingProgress}%`,
                            height: '100%',
                            backgroundColor: 'var(--primary)',
                            transition: 'width 0.2s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {result ? (
            <>
              {!result.success && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReset}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={15} /> Upload Fixed File
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleClose}
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!isSubmitEnabled}
                style={{
                  opacity: isSubmitEnabled ? 1 : 0.5,
                  cursor: isSubmitEnabled ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <UploadCloud size={16} /> Submit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
