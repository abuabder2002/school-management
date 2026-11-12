import React, { useState, useEffect, useRef } from 'react';
import { feeService } from '../../services/feeService';
import { studentService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { usePersistedState } from '../../hooks/usePersistedState';
import { DollarSign, UserCheck, Calculator, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toDisplayClassName } from '../../utils/academicClassOrder';

export const IndividualBillingModal = ({
  isOpen,
  onClose,
  selectedClass,
  activeStudents = [],
  existingBillingRows = [],
  initialStudent = null,
  onSuccess,
}) => {
  const isEditMode = Boolean(initialStudent);

  const [studentList, setStudentList] = useState(activeStudents);
  // Every typed figure here survives an accidental page refresh (sessionStorage).
  // On first mount, if the modal was still open with numbers in it, `skipInitialLoadRef`
  // stops the usual "load this student's current billing" effect from immediately
  // overwriting them with whatever is already saved on the server.
  const [selectedStudentId, setSelectedStudentId] = usePersistedState('draft:bill-selectedStudentId', '');
  const [feeId, setFeeId] = usePersistedState('draft:bill-feeId', null);
  const [termFees1, setTermFees1] = usePersistedState('draft:bill-termFees1', '');
  const [termFees2, setTermFees2] = usePersistedState('draft:bill-termFees2', '');
  const [termFees3, setTermFees3] = usePersistedState('draft:bill-termFees3', '');
  const [busFees, setBusFees] = usePersistedState('draft:bill-busFees', '');
  const [examFees, setExamFees] = usePersistedState('draft:bill-examFees', '');
  const [paidAmount, setPaidAmount] = usePersistedState('draft:bill-paidAmount', '');
  const [description, setDescription] = usePersistedState('draft:bill-description', 'Tuition & Fees');
  const [academicYear, setAcademicYear] = usePersistedState('draft:bill-academicYear', '2026-2027');
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // blocks a second submit in the same instant, before the button re-renders disabled
  const skipInitialLoadRef = useRef(isOpen);

  const { addToast } = useToast();

  const resetFields = () => {
    setFeeId(null);
    setTermFees1('');
    setTermFees2('');
    setTermFees3('');
    setBusFees('');
    setExamFees('');
    setPaidAmount('');
  };

  const loadStudentBillingData = async (studentId, initialData = null) => {
    if (!studentId) {
      resetFields();
      return;
    }

    // If initialData provided in Edit mode has fee breakdown pre-populated
    if (initialData && (initialData.termFees1 !== undefined || initialData.feeId)) {
      if (initialData.feeId) setFeeId(initialData.feeId);
      setTermFees1(initialData.termFees1 != null ? String(initialData.termFees1) : '');
      setTermFees2(initialData.termFees2 != null ? String(initialData.termFees2) : '');
      setTermFees3(initialData.termFees3 != null ? String(initialData.termFees3) : '');
      setBusFees(initialData.busFees != null ? String(initialData.busFees) : '');
      setExamFees(initialData.examFees != null ? String(initialData.examFees) : '');
      setPaidAmount(initialData.paidAmount != null ? String(initialData.paidAmount) : '');
      return;
    }

    // 1. Check existingBillingRows if provided
    const existingInProps = existingBillingRows.find(
      (r) => String(r.studentId) === String(studentId)
    );

    if (existingInProps && (existingInProps.feeId || existingInProps.totalAmount !== undefined)) {
      if (existingInProps.feeId) setFeeId(existingInProps.feeId);
      setTermFees1(existingInProps.termFees1 != null ? String(existingInProps.termFees1) : '');
      setTermFees2(existingInProps.termFees2 != null ? String(existingInProps.termFees2) : '');
      setTermFees3(existingInProps.termFees3 != null ? String(existingInProps.termFees3) : '');
      setBusFees(existingInProps.busFees != null ? String(existingInProps.busFees) : '');
      setExamFees(existingInProps.examFees != null ? String(existingInProps.examFees) : '');
      setPaidAmount(existingInProps.paidAmount != null ? String(existingInProps.paidAmount) : '');
      return;
    }

    // 2. Fetch directly from backend to ensure latest existing billing values
    try {
      setLoadingExisting(true);
      const res = await feeService.getFeesByStudent(studentId);
      const feesList = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(feesList) && feesList.length > 0) {
        const fee = feesList[0];
        if (fee.id) setFeeId(fee.id);
        setTermFees1(fee.termFees1 != null ? String(fee.termFees1) : '');
        setTermFees2(fee.termFees2 != null ? String(fee.termFees2) : '');
        setTermFees3(fee.termFees3 != null ? String(fee.termFees3) : '');
        setBusFees(fee.busFees != null ? String(fee.busFees) : '');
        setExamFees(fee.examFees != null ? String(fee.examFees) : '');
        setPaidAmount(fee.paidAmount != null ? String(fee.paidAmount) : '');
      } else {
        resetFields();
      }
    } catch (err) {
      resetFields();
    } finally {
      setLoadingExisting(false);
    }
  };

  // Runs once, for real, no matter how many times the effect below re-fires.
  useEffect(() => {
    if (skipInitialLoadRef.current) {
      addToast('Restored the billing details you were entering.', 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clears the mount-time restore flag only once the modal actually closes —
  // not after its first render — so the restored draft survives activeStudents
  // arriving async right after mount (which re-runs the effect below once more
  // while the modal is still open) without being wiped by the reset-and-reload
  // path meant for genuinely opening the form fresh.
  useEffect(() => {
    if (!isOpen) {
      skipInitialLoadRef.current = false;
    }
  }, [isOpen]);

  // Load fresh active students or prepopulate on modal open
  useEffect(() => {
    if (!isOpen) return;

    if (skipInitialLoadRef.current) {
      if (isEditMode && initialStudent) {
        setSelectedStudentId(String(initialStudent.studentId || initialStudent.id));
      }
      return;
    }

    if (isEditMode && initialStudent) {
      const sid = String(initialStudent.studentId || initialStudent.id);
      setSelectedStudentId(sid);
      if (initialStudent.feeId) {
        setFeeId(initialStudent.feeId);
      }
      loadStudentBillingData(sid, initialStudent);
    } else {
      setSelectedStudentId('');
      setFeeId(null);
      resetFields();

      // In Add mode, fetch active students to ensure newly created students are present
      const loadStudents = async () => {
        try {
          let list = [];
          if (selectedClass && selectedClass !== 'ALL' && selectedClass !== 'All Classes') {
            const res = await studentService.getActiveStudentsByClass(selectedClass);
            list = res?.data || (Array.isArray(res) ? res : []);
          } else {
            const res = await studentService.getAllStudents({ page: 1, pageSize: 10000, status: 'Active' });
            const all = res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
            list = all.filter((s) => s.isActive !== false);
          }
          if (Array.isArray(list) && list.length > 0) {
            setStudentList(list);
          } else {
            setStudentList(activeStudents);
          }
        } catch (err) {
          console.warn('Failed to load latest active students:', err);
          setStudentList(activeStudents);
        }
      };

      loadStudents();
    }
  }, [isOpen, initialStudent, selectedClass, activeStudents]);

  const handleStudentSelect = (e) => {
    const sid = e.target.value;
    setSelectedStudentId(sid);
    loadStudentBillingData(sid);
  };

  // Real-time automatic calculations
  const t1 = parseFloat(termFees1) || 0;
  const t2 = parseFloat(termFees2) || 0;
  const t3 = parseFloat(termFees3) || 0;
  const bus = parseFloat(busFees) || 0;
  const exam = parseFloat(examFees) || 0;
  const paid = parseFloat(paidAmount) || 0;

  // Total Amount = Term Fee 1 + Term Fee 2 + Term Fee 3 + Bus Fee + Exam Fee
  const totalAmount = t1 + t2 + t3 + bus + exam;

  // Outstanding = Total Amount - Paid Amount
  const outstandingAmount = Math.max(0, totalAmount - paid);

  // Determine current active student details
  const editStudentInfo = isEditMode
    ? {
        id: initialStudent.studentId || initialStudent.id,
        name: initialStudent.studentName || initialStudent.name || '',
        admissionNumber: initialStudent.admissionNumber || '',
        className: initialStudent.className || selectedClass || '',
      }
    : null;

  const selectedStudentObj = !isEditMode
    ? (studentList.find((s) => String(s.id) === String(selectedStudentId)) ||
       activeStudents.find((s) => String(s.id) === String(selectedStudentId)))
    : editStudentInfo;

  const currentStudent = isEditMode ? editStudentInfo : selectedStudentObj;
  const studentDisplayName = currentStudent?.name || 'Student';
  const studentDisplayAdmission = currentStudent?.admissionNumber || '—';
  const studentDisplayClass = currentStudent?.className || selectedClass || '—';

  const formatCurrency = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const targetStudentId = isEditMode
      ? (initialStudent.studentId || initialStudent.id)
      : Number(selectedStudentId);

    if (!targetStudentId || (!isEditMode && !selectedStudentObj)) {
      addToast('Please select a valid active student.', 'error');
      return;
    }

    if (t1 < 0 || t2 < 0 || t3 < 0 || bus < 0 || exam < 0 || paid < 0) {
      addToast('Fee amounts cannot be negative.', 'error');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const studentClass = currentStudent?.className || selectedClass || 'Class 10';
      const payload = {
        id: feeId || undefined,
        studentId: Number(targetStudentId),
        studentName: currentStudent?.name || studentDisplayName,
        admissionNumber: studentDisplayAdmission !== '—' ? studentDisplayAdmission : '',
        className: studentClass,
        termFees1: t1,
        termFees2: t2,
        termFees3: t3,
        busFees: bus,
        examFees: exam,
        totalAmount: totalAmount,
        paidAmount: paid,
        pendingAmount: outstandingAmount,
        description,
        academicYear,
      };

      if (isEditMode && (feeId || initialStudent?.feeId)) {
        const updateId = feeId || initialStudent.feeId;
        await feeService.updateFee(updateId, payload);
        addToast(`Billing updated successfully for ${currentStudent?.name || studentDisplayName}!`, 'success');
      } else {
        await feeService.createFee(payload);
        addToast(
          isEditMode
            ? `Billing updated successfully for ${currentStudent?.name || studentDisplayName}!`
            : `Billing record saved for ${currentStudent?.name || studentDisplayName}!`,
          'success'
        );
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Failed to save billing record.';
      addToast(errorMsg, 'error');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        style={{
          maxWidth: '640px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-medium, #e2e8f0)',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: isEditMode ? '#eff6ff' : 'var(--primary-light, #e0e7ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary, #4f46e5)',
              }}
            >
              <DollarSign size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                {isEditMode ? 'Edit Student Billing' : 'Add Individual Billing'}
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                {isEditMode ? (
                  <span>
                    Student: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{studentDisplayName}</strong> • Class: <strong style={{ color: 'var(--primary, #4f46e5)' }}>{studentDisplayClass}</strong>
                  </span>
                ) : (
                  <span>
                    Target Class: <strong style={{ color: 'var(--primary, #4f46e5)' }}>{selectedClass}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted, #64748b)',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'background-color 0.2s',
            }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            className="modal-body"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem',
              overflowY: 'auto',
              maxHeight: 'calc(92vh - 145px)',
            }}
          >
            {/* Student Section: Edit Mode (Read-only Card) vs Add Mode (Dropdown Selector) */}
            {isEditMode ? (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-medium, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '1rem 1.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Student
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginTop: '2px' }}>
                    {currentStudent?.name || '—'}
                  </div>
                </div>

                <div style={{ borderLeft: '1px solid var(--border-medium, #e2e8f0)', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Admission No
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginTop: '2px' }}>
                    {currentStudent?.admissionNumber || '—'}
                  </div>
                </div>

                <div style={{ borderLeft: '1px solid var(--border-medium, #e2e8f0)', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Class
                  </div>
                  <div style={{ marginTop: '2px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        backgroundColor: 'var(--primary-light, #e0e7ff)',
                        color: 'var(--primary, #4338ca)',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      {toDisplayClassName(currentStudent?.className || selectedClass) || 'Class N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="form-group" style={{ marginBottom: selectedStudentObj ? '0.75rem' : 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                    Select Active Student <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={selectedStudentId}
                    onChange={handleStudentSelect}
                    required
                    disabled={submitting}
                    style={{
                      height: '42px',
                      fontSize: '0.925rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="" disabled>Select active student</option>
                    {(studentList.length > 0 ? studentList : activeStudents).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.admissionNumber || `ID: ${s.id}`}) — {toDisplayClassName(s.className) || 'Class N/A'}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.35rem' }}>
                    Only active students are listed.
                  </div>
                </div>

                {/* Selected Student Details Card in Add Mode */}
                {selectedStudentObj && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--border-medium, #e2e8f0)',
                      fontSize: '0.85rem',
                      color: 'var(--text-main, #1e293b)',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted, #64748b)' }}>Student: </span>
                      <strong>{selectedStudentObj.name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #64748b)' }}>Admission No: </span>
                      <strong>{selectedStudentObj.admissionNumber || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted, #64748b)' }}>Class: </span>
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: 'var(--primary-light, #e0e7ff)',
                          color: 'var(--primary, #4338ca)',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                        }}
                      >
                        {toDisplayClassName(selectedStudentObj.className) || 'Class N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Term Fees Breakdown (3 Columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Term Fees - 1 (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={termFees1}
                  onChange={(e) => setTermFees1(e.target.value)}
                  disabled={loadingExisting || submitting}
                  style={{ height: '40px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Term Fees - 2 (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={termFees2}
                  onChange={(e) => setTermFees2(e.target.value)}
                  disabled={loadingExisting || submitting}
                  style={{ height: '40px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Term Fees - 3 (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={termFees3}
                  onChange={(e) => setTermFees3(e.target.value)}
                  disabled={loadingExisting || submitting}
                  style={{ height: '40px' }}
                />
              </div>
            </div>

            {/* Bus Fees & Exam Fees (2 Columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Bus Fees (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={busFees}
                  onChange={(e) => setBusFees(e.target.value)}
                  disabled={loadingExisting || submitting}
                  style={{ height: '40px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Exam Fees (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={examFees}
                  onChange={(e) => setExamFees(e.target.value)}
                  disabled={loadingExisting || submitting}
                  style={{ height: '40px' }}
                />
              </div>
            </div>

            {/* Paid Amount */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                Paid Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                disabled={loadingExisting || submitting}
                style={{ height: '40px' }}
              />
            </div>

            {/* Calculated Financial Summary Cards */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-medium, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '1rem 1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                  TOTAL AMOUNT
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
                  {formatCurrency(totalAmount)}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid var(--border-medium, #e2e8f0)', paddingLeft: '1rem' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                  PAID AMOUNT
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                  {formatCurrency(paid)}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid var(--border-medium, #e2e8f0)', paddingLeft: '1rem' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                  OUTSTANDING
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: outstandingAmount > 0 ? '#dc2626' : '#16a34a',
                    marginTop: '4px',
                  }}
                >
                  {formatCurrency(outstandingAmount)}
                </div>
              </div>
            </div>
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
              borderTop: '1px solid var(--border-medium, #e2e8f0)',
              backgroundColor: '#ffffff',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '0.55rem 1.15rem', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || (!isEditMode && !selectedStudentId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <DollarSign size={16} /> {isEditMode ? 'Update Billing Record' : 'Save Billing Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
