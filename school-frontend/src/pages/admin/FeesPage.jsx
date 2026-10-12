import React, { useState, useEffect } from 'react';
import { feeService } from '../../services/feeService';
import { studentService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { DollarSign, Plus, Edit2, History, CheckCircle, AlertTriangle, XCircle, CreditCard, Receipt } from 'lucide-react';

export const FeesPage = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    studentId: '',
    totalAmount: 1200.00,
    paidAmount: 0.00,
    dueDate: '2026-11-30',
    description: 'Annual Tuition Fee',
    feeType: 'TUITION',
    academicYear: '2026-2027',
  });

  // Record Payment Modal
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: 0,
    feeComponent: 'AUTO',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
<<<<<<< HEAD
=======
    referenceNumber: '',
>>>>>>> 22873ba (Billing Changes)
    note: '',
  });
  const [paymentError, setPaymentError] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Payment History Modal
  const [historyModal, setHistoryModal] = useState(false);
  const [historyFee, setHistoryFee] = useState(null);
  const [paymentsList, setPaymentsList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

<<<<<<< HEAD
  const loadStudents = async () => {
=======
  const handleExportBillingCSV = () => {
    if (view === 'class-details' && filteredBillingRows.length > 0) {
      const headers = ['Admission No', 'Student Name', 'Class', 'Section', 'Total Billed', 'Current Term', 'Term Paid', 'Term Outstanding', 'Status'];
      const rows = filteredBillingRows.map((r) => [
        r.admissionNumber || '',
        `"${(r.studentName || '').replace(/"/g, '""')}"`,
        r.className || selectedClass || '',
        r.section || '',
        r.totalAmount || 0,
        r.currentTerm || '',
        r.currentTermPaidAmount || 0,
        r.currentTermOutstandingAmount || 0,
        r.status || '',
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${selectedClass}_Billing_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Billing records exported successfully', 'success');
    } else if (classSummaries.length > 0) {
      const headers = ['Class Name', 'Student Count', 'Total Billed', 'Total Collected', 'Total Outstanding', 'Collection Rate'];
      const rows = classSummaries.map((c) => [
        c.className || '',
        c.studentCount || 0,
        c.totalAmount || c.totalBilled || 0,
        c.totalPaidAmount || c.totalCollected || 0,
        c.totalOutstandingAmount || c.totalOutstanding || 0,
        `${c.collectionRate || 0}%`,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Fee_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Class fee summaries exported successfully', 'success');
    } else {
      addToast('No billing records to export', 'warning');
    }
  };

  const loadClassSummaries = async () => {
>>>>>>> 22873ba (Billing Changes)
    try {
      const res = await studentService.getAllStudents();
      if (res.success && res.data) {
        setStudents(res.data);
        if (res.data.length > 0) {
          const firstId = res.data[0].id;
          setSelectedStudentId(firstId);
          loadFeesForStudent(firstId);
        }
      }
    } catch (err) {
      addToast('Failed to load students list', 'error');
    }
  };

  const loadFeesForStudent = async (studentId) => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await feeService.getFeesByStudent(studentId);
      if (res.success && res.data) {
        setFees(res.data);
      } else {
        setFees([]);
      }
    } catch (err) {
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = (e) => {
    const id = e.target.value;
    setSelectedStudentId(id);
    loadFeesForStudent(id);
  };

  const handleCreateFee = async (e) => {
    e.preventDefault();
    try {
      await feeService.createFee({
        ...createForm,
        studentId: parseInt(selectedStudentId),
        totalAmount: parseFloat(createForm.totalAmount),
        paidAmount: parseFloat(createForm.paidAmount || 0),
      });
      addToast('Fee invoice generated successfully!', 'success');
      setCreateModal(false);
      loadFeesForStudent(selectedStudentId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create fee record', 'error');
    }
  };

<<<<<<< HEAD
  const openPaymentModal = (fee) => {
    setSelectedFeeForPayment(fee);
    const remaining = Math.max(0, (fee.totalAmount || 0) - (fee.paidAmount || 0));
    setPaymentForm({
      amountPaid: remaining,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      note: 'Tuition installment',
=======
  const loadStudentBillingForClass = async (className) => {
    try {
      setLoadingClassStudents(true);
      setClassDetailsError(null);
      setClassSearchTerm('');
      setClassStudentStatusFilter('All');
      setCurrentPage(1);
      setExpandedStudentId(null);

      const [billingRes, studentsRes] = await Promise.allSettled([
        feeService.getStudentBillingByClass(className),
        studentService.getActiveStudentsByClass(className),
      ]);

      if (billingRes.status === 'fulfilled' && billingRes.value?.success && billingRes.value?.data) {
        setStudentBillingRows(billingRes.value.data);
      } else {
        setStudentBillingRows([]);
      }

      if (studentsRes.status === 'fulfilled' && studentsRes.value?.success && studentsRes.value?.data) {
        setActiveStudentsInClass(studentsRes.value.data);
      } else {
        setActiveStudentsInClass([]);
      }
    } catch (err) {
      console.error(`Failed to load student billing for ${className}:`, err);
      setClassDetailsError(`Unable to load student billing records for ${className}. Please try again.`);
      setStudentBillingRows([]);
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const handleOpenClassDetails = (className) => {
    setSelectedClass(className);
    setView('class-details');
    loadStudentBillingForClass(className);
  };

  const handleBackToClasses = () => {
    setView('classes');
    setSelectedClass('');
    setExpandedStudentId(null);
    loadClassSummaries();
    loadRecentPayments();
  };

  const toggleRowExpand = (studentId) => {
    setExpandedStudentId((prev) => (prev === studentId ? null : studentId));
  };

  // Currency Formatter
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹ ' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format Date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateTime = (payment) => {
    const value = payment?.createdAt || payment?.paymentDate;
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatFeeComponent = (component) => ({
    TERM_1: 'Term 1 Fees',
    TERM_2: 'Term 2 Fees',
    TERM_3: 'Term 3 Fees',
    BUS_FEE: 'Bus Fees',
    EXAM_FEE: 'Exam Fees',
    MULTIPLE: 'Multiple Fee Components',
  }[component] || (component === 'LEGACY' ? 'Unallocated Legacy Payment' : component || '—'));

  const getComponentOutstanding = (fee, component) => {
    const outstanding = fee?.outstandingByComponent?.[component];
    if (outstanding !== undefined && outstanding !== null) return Number(outstanding);
    return component === fee?.currentTerm ? Number(fee?.currentTermOutstandingAmount || 0) : 0;
  };

  // Financial Aggregates
  const financialOverview = useMemo(() => {
    const totalStudents = classSummaries.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
    const totalBilled = classSummaries.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    const totalCollected = classSummaries.reduce((sum, c) => sum + (c.totalPaidAmount || 0), 0);
    const totalOutstanding = classSummaries.reduce((sum, c) => sum + (c.totalOutstandingAmount || 0), 0);

    const collectionRate = totalBilled > 0
      ? ((totalCollected / totalBilled) * 100).toFixed(1)
      : '0.0';

    return {
      totalStudents,
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate: parseFloat(collectionRate),
    };
  }, [classSummaries]);

  // Distinct class list for filter dropdown in academic order
  const distinctClasses = useMemo(() => {
    const list = classSummaries.map((c) => c.className).filter(Boolean);
    return [...list].sort(compareAcademicClasses);
  }, [classSummaries]);

  // Filtered Class Summaries sorted in academic order
  const filteredClassSummaries = useMemo(() => {
    const filtered = classSummaries.filter((row) => {
      const q = mainSearchTerm.trim().toLowerCase();
      const matchSearch = !q || (row.className && row.className.toLowerCase().includes(q));
      const matchClass = classFilter === 'All' || row.className === classFilter;

      let rowStatus = 'Unbilled';
      if ((row.totalAmount || 0) === 0) {
        rowStatus = 'Unbilled';
      } else if ((row.totalOutstandingAmount || 0) === 0) {
        rowStatus = 'Cleared';
      } else if ((row.totalPaidAmount || 0) > 0) {
        rowStatus = 'Partial';
      } else {
        rowStatus = 'Pending';
      }

      const matchStatus = mainStatusFilter === 'All' || mainStatusFilter === rowStatus;
      return matchSearch && matchClass && matchStatus;
    });
    return [...filtered].sort(compareAcademicClasses);
  }, [classSummaries, mainSearchTerm, classFilter, mainStatusFilter]);

  // Filtered & Paginated Student Billing Rows within Selected Class
  const filteredBillingRows = useMemo(() => {
    return studentBillingRows.filter((row) => {
      const q = classSearchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (row.studentName && row.studentName.toLowerCase().includes(q)) ||
        (row.admissionNumber && row.admissionNumber.toLowerCase().includes(q));

      const matchStatus =
        classStudentStatusFilter === 'All' ||
        (classStudentStatusFilter === 'Settled' && (row.status === 'settled' || row.status === 'PAID')) ||
        (classStudentStatusFilter === 'Partially Paid' && (row.status === 'partially paid' || row.status === 'PARTIAL')) ||
        (classStudentStatusFilter === 'Pending' && (row.status === 'pending' || row.status === 'PENDING')) ||
        (classStudentStatusFilter === 'Unbilled' && row.status === 'unbilled');

      return matchSearch && matchStatus;
    });
  }, [studentBillingRows, classSearchTerm, classStudentStatusFilter]);

  const totalPages = Math.ceil(filteredBillingRows.length / pageSize) || 1;
  const paginatedBillingRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBillingRows.slice(start, start + pageSize);
  }, [filteredBillingRows, currentPage]);

  // Selected Class Aggregates
  const classMetrics = useMemo(() => {
    const count = studentBillingRows.length;
    const billed = studentBillingRows.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const paid = studentBillingRows.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
    const outstanding = studentBillingRows.reduce((sum, r) => sum + (r.outstandingAmount || 0), 0);
    const rate = billed > 0 ? ((paid / billed) * 100).toFixed(1) : '0.0';
    return { count, billed, paid, outstanding, rate };
  }, [studentBillingRows]);

  // Status Badge Helper for Class Table
  const getClassStatusBadge = (row) => {
    const total = row.totalAmount || 0;
    const pending = row.totalOutstandingAmount || 0;
    const paid = row.totalPaidAmount || 0;

    if (total === 0) {
      return (
        <span
          style={{
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#f1f5f9',
            color: '#475569',
            border: '1px solid #e2e8f0',
          }}
        >
          Unbilled
        </span>
      );
    }
    if (pending === 0 && paid > 0) {
      return (
        <span
          style={{
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
          }}
        >
          Cleared
        </span>
      );
    }
    if (paid > 0 && pending > 0) {
      return (
        <span
          style={{
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#fffbeb',
            color: '#b45309',
            border: '1px solid #fde68a',
          }}
        >
          Partially Paid
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '0.2rem 0.6rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
        }}
      >
        Pending
      </span>
    );
  };

  // Status Badge for Student Row
  const renderStudentStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'settled' || s === 'paid') {
      return (
        <span
          style={{
            backgroundColor: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            borderRadius: '4px',
            padding: '0.2rem 0.55rem',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          Settled
        </span>
      );
    }
    if (s === 'partially paid' || s === 'partial') {
      return (
        <span
          style={{
            backgroundColor: '#fffbeb',
            color: '#b45309',
            border: '1px solid #fde68a',
            borderRadius: '4px',
            padding: '0.2rem 0.55rem',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          Partially Paid
        </span>
      );
    }
    if (s === 'pending' || s === 'outstanding') {
      return (
        <span
          style={{
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            padding: '0.2rem 0.55rem',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          Outstanding
        </span>
      );
    }
    return (
      <span
        style={{
          backgroundColor: '#f1f5f9',
          color: '#64748b',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '0.2rem 0.55rem',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        Unbilled
      </span>
    );
  };

  // Open Payment Modal
  const openPaymentModal = (row) => {
    setSelectedFeeForPayment(row);
    const remaining = getComponentOutstanding(row, row.currentTerm);
    setPaymentForm({
      amountPaid: remaining > 0 ? remaining : 0,
      feeComponent: row.currentTerm || 'AUTO',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      referenceNumber: '',
      note: '',
>>>>>>> 22873ba (Billing Changes)
    });
    setPaymentError('');
    setPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
<<<<<<< HEAD
    if (!selectedFeeForPayment) return;
    try {
      await feeService.recordPayment(selectedFeeForPayment.id, {
        amountPaid: parseFloat(paymentForm.amountPaid),
=======
    if (!selectedFeeForPayment?.feeId) {
      addToast('Please save billing for this student before recording a payment.', 'error');
      return;
    }
    const amount = Number(paymentForm.amountPaid);
    const outstanding = getComponentOutstanding(selectedFeeForPayment, paymentForm.feeComponent);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }
    if (amount > outstanding) {
      setPaymentError(`Payment cannot exceed outstanding balance (${formatCurrency(outstanding)}).`);
      return;
    }
    if (paymentAmountError) {
      setPaymentError(paymentAmountError);
      return;
    }
    setPaymentError('');
    setSavingPayment(true);
    try {
      const response = await feeService.collectFee({
        studentId: Number(selectedFeeForPayment.studentId),
        billingId: Number(selectedFeeForPayment.feeId),
        paymentAmount: amount,
>>>>>>> 22873ba (Billing Changes)
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        feeComponent: paymentForm.feeComponent,
        referenceNumber: paymentForm.referenceNumber.trim(),
        remarks: paymentForm.note.trim(),
      });
      addToast(amount === outstanding
        ? `${formatFeeComponent(paymentForm.feeComponent)} will be fully paid after this payment.`
        : `Payment recorded. Balance after payment: ${formatCurrency(outstanding - amount)}.`, 'success');
      setPaymentModal(false);
      setSelectedFeeForPayment(null);
<<<<<<< HEAD
      loadFeesForStudent(selectedStudentId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to record payment', 'error');
    }
  };

  const openHistoryModal = async (fee) => {
    setHistoryFee(fee);
=======
      await Promise.all([
        loadClassSummaries(),
        selectedClass ? loadStudentBillingForClass(selectedClass) : Promise.resolve(),
        loadRecentPayments(),
      ]);
    } catch (err) {
      setPaymentError(err.response?.data?.message || err.message || 'Failed to collect payment.');
    } finally {
      setSavingPayment(false);
    }
  };

  const selectedPaymentOutstanding = getComponentOutstanding(selectedFeeForPayment, paymentForm.feeComponent);
  const paymentFeeBreakdown = [
    { component: 'TERM_1', label: 'Term 1 Fees', amount: Number(selectedFeeForPayment?.termFees1 || 0) },
    { component: 'TERM_2', label: 'Term 2 Fees', amount: Number(selectedFeeForPayment?.termFees2 || 0) },
    { component: 'TERM_3', label: 'Term 3 Fees', amount: Number(selectedFeeForPayment?.termFees3 || 0) },
    { component: 'EXAM_FEE', label: 'Exam Fees', amount: Number(selectedFeeForPayment?.examFees || 0) },
    { component: 'BUS_FEE', label: 'Bus Fees', amount: Number(selectedFeeForPayment?.busFees || 0) },
  ].map((item) => {
    const outstanding = getComponentOutstanding(selectedFeeForPayment, item.component);
    return { ...item, outstanding, paid: Math.max(0, item.amount - outstanding) };
  });
  const paymentAmount = Number(paymentForm.amountPaid);
  const paymentAmountError = !Number.isFinite(paymentAmount) || paymentAmount <= 0
    ? 'Enter a payment amount greater than zero.'
    : paymentAmount > selectedPaymentOutstanding
      ? `Payment cannot exceed outstanding balance (${formatCurrency(selectedPaymentOutstanding)}).`
      : '';
  const selectedFeeBreakdown = paymentFeeBreakdown.find((fee) => fee.component === paymentForm.feeComponent);
  const paymentAmountIsValid = !paymentAmountError;
  const balanceAfterPayment = paymentAmountIsValid
    ? Math.max(0, selectedPaymentOutstanding - paymentAmount)
    : selectedPaymentOutstanding;
  const selectedFeePaidAfterPayment = (selectedFeeBreakdown?.paid || 0) + (paymentAmountIsValid ? paymentAmount : 0);
  const statusAfterPayment = balanceAfterPayment === 0
    ? 'Settled'
    : selectedFeePaidAfterPayment > 0
      ? 'Partially Paid'
      : 'Pending';
  const paymentAmountHelper = paymentAmountError
    ? { text: paymentAmountError, color: '#b91c1c' }
    : balanceAfterPayment === 0
      ? { text: `This payment will settle ${formatFeeComponent(paymentForm.feeComponent)}.`, color: '#047857' }
      : { text: `Balance after payment: ${formatCurrency(balanceAfterPayment)}.`, color: '#2563eb' };
  const canSavePayment = Boolean(selectedFeeForPayment?.feeId)
    && !paymentAmountError
    && Boolean(paymentForm.paymentDate)
    && Boolean(paymentForm.paymentMethod)
    && !savingPayment;

  const openHistoryModal = async (row) => {
    setHistoryFee(row);
>>>>>>> 22873ba (Billing Changes)
    setHistoryModal(true);
    try {
      setLoadingHistory(true);
      const res = await feeService.getPaymentsByFee(fee.id);
      if (res.success && res.data) {
        setPaymentsList(res.data);
      } else {
        setPaymentsList([]);
      }
    } catch (err) {
      setPaymentsList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <span className="badge badge-success"><CheckCircle size={13} /> PAID</span>;
      case 'PARTIAL':
        return <span className="badge badge-warning"><AlertTriangle size={13} /> PARTIAL</span>;
      default:
        return <span className="badge badge-danger"><XCircle size={13} /> UNPAID</span>;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
<<<<<<< HEAD
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>
            <DollarSign className="text-primary" /> Fee & Payment Management
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>
            Track invoices, record payment transactions, and view audit history
          </p>
=======
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem',
              paddingBottom: '1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '0.25rem' }}>
                <span>Finance</span>
                <span>/</span>
                <span style={{ color: 'var(--primary)' }}>Billing & Fee Management</span>
              </div>
              <h1
                style={{
                  fontSize: '1.625rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                Fee Management
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
                Manage student fee structures, collections, payments and outstanding balances.
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                onClick={() => {
                  loadClassSummaries();
                  loadRecentPayments();
                }}
                disabled={loadingSummaries}
                title="Reload financial and billing data"
              >
                <RotateCcw size={15} className={loadingSummaries ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                onClick={handleExportBillingCSV}
                title="Export fee and billing data to CSV"
              >
                <Download size={15} />
                Export
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                onClick={() => handleOpenBulkForClass('ALL')}
              >
                <Upload size={15} />
                Bulk Upload
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                onClick={() => {
                  setIndividualModalStudent(null);
                  setIsIndividualModalOpen(true);
                }}
              >
                <Plus size={15} />
                Add Fee
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {summaryError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#991b1b',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>{summaryError}</span>
              </div>
              <button
                className="btn btn-sm btn-secondary"
                style={{ backgroundColor: '#ffffff', color: '#991b1b', borderColor: '#fca5a5' }}
                onClick={loadClassSummaries}
              >
                Retry
              </button>
            </div>
          )}

          {/* SECTION 1 & 3: COMPACT PROFESSIONAL ERP FINANCIAL OVERVIEW & COLLECTION SUMMARY */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Section 1: Financial Overview Box */}
            <div
              className="card"
              style={{
                padding: '1.25rem 1.5rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.75rem',
                  marginBottom: '0.85rem',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '0.01em' }}>
                  Financial Overview
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  AY: {academicYearFilter}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Billed</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(financialOverview.totalBilled)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Collected</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(financialOverview.totalCollected)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Outstanding</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: financialOverview.totalOutstanding > 0 ? '#b91c1c' : '#047857',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCurrency(financialOverview.totalOutstanding)}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px dashed var(--border-subtle)',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Collection Rate</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {financialOverview.collectionRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Collection Progress & Summary */}
            <div
              className="card"
              style={{
                padding: '1.25rem 1.5rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '0.75rem',
                    marginBottom: '0.85rem',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '0.01em' }}>
                    Collection Summary
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {financialOverview.totalStudents} Active Students
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                    <span style={{ color: '#047857' }}>
                      Collected: {formatCurrency(financialOverview.totalCollected)}
                    </span>
                    <span style={{ color: financialOverview.totalOutstanding > 0 ? '#b91c1c' : 'var(--text-muted)' }}>
                      Outstanding: {formatCurrency(financialOverview.totalOutstanding)}
                    </span>
                  </div>

                  <div
                    style={{
                      height: '10px',
                      backgroundColor: '#fee2e2',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      display: 'flex',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(financialOverview.collectionRate, 100)}%`,
                        backgroundColor: '#10b981',
                        transition: 'width 0.4s ease',
                      }}
                      title={`Collected: ${financialOverview.collectionRate}%`}
                    />
                  </div>
                </div>
              </div>

              {/* Status breakdown pills */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                }}
              >
                <div style={{ padding: '0.4rem 0.25rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Classes
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {classSummaries.length}
                  </div>
                </div>

                <div style={{ padding: '0.4rem 0.25rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Full Settled
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#047857' }}>
                    {classSummaries.filter((c) => (c.totalAmount || 0) > 0 && (c.totalOutstandingAmount || 0) === 0).length}
                  </div>
                </div>

                <div style={{ padding: '0.4rem 0.25rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    With Dues
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#b91c1c' }}>
                    {classSummaries.filter((c) => (c.totalOutstandingAmount || 0) > 0).length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FILTERS & SEARCH TOOLBAR */}
          <div
            className="card"
            style={{
              padding: '0.85rem 1.25rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            {/* Left: Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                <Filter size={15} />
                <span style={{ fontWeight: 600 }}>Filters:</span>
              </div>

              {/* Academic Year */}
              <select
                className="form-select"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.825rem', height: '34px', width: 'auto' }}
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
                disabled={loadingSummaries}
              >
                <option value="2026-2027">AY 2026-2027</option>
                <option value="2025-2026">AY 2025-2026</option>
              </select>

              {/* Class Dropdown */}
              <select
                className="form-select"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.825rem', height: '34px', width: 'auto' }}
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                disabled={loadingSummaries}
              >
                <option value="All">All Classes</option>
                {distinctClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {toDisplayClassName(cls)}
                  </option>
                ))}
              </select>

              {/* Status Dropdown */}
              <select
                className="form-select"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.825rem', height: '34px', width: 'auto' }}
                value={mainStatusFilter}
                onChange={(e) => setMainStatusFilter(e.target.value)}
                disabled={loadingSummaries}
              >
                <option value="All">All Statuses</option>
                <option value="Cleared">Cleared</option>
                <option value="Partial">Partially Paid</option>
                <option value="Pending">Pending</option>
                <option value="Unbilled">Unbilled</option>
              </select>
            </div>

            {/* Right: Search */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search class..."
                className="form-input"
                style={{
                  paddingLeft: '2.2rem',
                  paddingRight: '0.75rem',
                  fontSize: '0.825rem',
                  height: '34px',
                }}
                value={mainSearchTerm}
                onChange={(e) => setMainSearchTerm(e.target.value)}
                disabled={loadingSummaries}
              />
            </div>
          </div>

          {/* SECTION 2 — CLASS BILLING SUMMARY TABLE */}
          <div
            className="card"
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={17} style={{ color: 'var(--primary)' }} />
                Class Billing Summary
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {loadingSummaries ? (
                  <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Loading...</span>
                ) : (
                  `Showing ${filteredClassSummaries.length} of ${classSummaries.length} classes`
                )}
              </div>
            </div>

            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', width: '60px', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Students</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Billed</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Paid</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Outstanding</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '130px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Collection %</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '110px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '140px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSummaries ? (
                    <BillingTableSkeleton rowCount={7} />
                  ) : summaryError ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#b91c1c' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                          <AlertTriangle size={30} style={{ color: '#ef4444' }} />
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {summaryError}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}
                            onClick={loadClassSummaries}
                          >
                            <RotateCcw size={14} /> Try Again
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredClassSummaries.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <FileSpreadsheet size={32} style={{ opacity: 0.35 }} />
                          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            No billing records available
                          </span>
                          <span style={{ fontSize: '0.825rem' }}>
                            {classSummaries.length === 0
                              ? 'No classes or student billing configured yet.'
                              : 'No classes match the selected filter criteria.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredClassSummaries.map((item, idx) => {
                      const billed = item.totalAmount || 0;
                      const paid = item.totalPaidAmount || 0;
                      const outstanding = item.totalOutstandingAmount || 0;
                      const pct = billed > 0 ? Math.min(100, (paid / billed) * 100) : 0;

                      return (
                        <tr
                          key={item.className || idx}
                          style={{ transition: 'background-color 0.12s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                            {item.sNo || idx + 1}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            <span
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#1e293b',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                              }}
                            >
                              {toDisplayClassName(item.className)}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-main)' }}>
                            {item.totalStudents || 0}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(billed)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(paid)}
                          </td>
                          <td
                            style={{
                              padding: '0.85rem 1rem',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: outstanding > 0 ? '#b91c1c' : '#047857',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatCurrency(outstanding)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                              <div
                                style={{
                                  width: '50px',
                                  height: '6px',
                                  backgroundColor: '#e2e8f0',
                                  borderRadius: '9999px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    backgroundColor: pct >= 100 ? '#10b981' : '#f59e0b',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '36px', textAlign: 'right' }}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            {getClassStatusBadge(item)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  padding: '0.25rem 0.6rem',
                                  fontSize: '0.775rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  fontWeight: 600,
                                  color: 'var(--primary)',
                                }}
                                onClick={() => handleOpenClassDetails(item.className)}
                              >
                                View <ChevronRight size={13} />
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.775rem',
                                  color: 'var(--text-muted)',
                                }}
                                title={`Upload Excel for ${toDisplayClassName(item.className)}`}
                                onClick={() => handleOpenBulkForClass(item.className)}
                              >
                                <Upload size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4 — RECENT PAYMENTS */}
          <div
            className="card"
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={17} style={{ color: '#047857' }} />
                Recent Payments
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Latest transactions
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={loadRecentPayments}
                  disabled={loadingRecentPayments}
                >
                  <RotateCcw size={12} className={loadingRecentPayments ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Fee Component</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Amount</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date &amp; Time</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Method</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRecentPayments ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                          <RotateCcw size={18} className="animate-spin text-primary" />
                          <span style={{ fontSize: '0.85rem' }}>Loading recent transactions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                          <CreditCard size={28} style={{ opacity: 0.35 }} />
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            No recent payments recorded
                          </span>
                          <span style={{ fontSize: '0.8rem' }}>Payments collected will appear here automatically.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    recentPayments.map((p) => (
                      <tr key={p.id}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            {p.studentName || 'Student #' + p.studentId}
                          </div>
                          {p.admissionNumber && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Adm: {p.admissionNumber}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.825rem', color: 'var(--text-main)' }}>
                          <span
                            style={{
                              backgroundColor: '#f1f5f9',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '3px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {p.className || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.825rem', color: 'var(--text-main)' }}>
                          {formatFeeComponent(p.feeComponent)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#047857', fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem' }}>
                          {formatCurrency(p.amountPaid)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                          {formatDateTime(p)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '3px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              textTransform: 'uppercase',
                            }}
                          >
                            {p.paymentMethod || 'ONLINE'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '3px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: '#ecfdf5',
                              color: '#047857',
                            }}
                          >
                            Paid
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.note || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
>>>>>>> 22873ba (Billing Changes)
        </div>
        <button
          onClick={() => {
            setCreateForm((f) => ({ ...f, studentId: selectedStudentId }));
            setCreateModal(true);
          }}
          className="btn btn-primary"
          disabled={!selectedStudentId}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Plus size={18} /> Generate Fee Invoice
        </button>
      </div>

      {/* Student Selector Card */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Student:</label>
          <select
            className="form-control"
            style={{ maxWidth: '380px' }}
            value={selectedStudentId}
            onChange={handleStudentChange}
          >
<<<<<<< HEAD
            {students.length === 0 ? (
              <option value="">No students registered</option>
            ) : (
              students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `${s.firstName || ''} ${s.lastName || ''}`} ({s.admissionNumber || s.rollNumber}) — {s.className}
                </option>
              ))
=======
            <div className="card" style={{ padding: '0.65rem 1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Enrolled Students
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                {classMetrics.count}
              </div>
            </div>

            <div className="card" style={{ padding: '0.65rem 1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Invoiced
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                {formatCurrency(classMetrics.billed)}
              </div>
            </div>

            <div className="card" style={{ padding: '0.65rem 1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Collected
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#047857', marginTop: '0.15rem' }}>
                {formatCurrency(classMetrics.paid)}
              </div>
            </div>

            <div className="card" style={{ padding: '0.65rem 1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Outstanding Dues
              </div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: classMetrics.outstanding > 0 ? '#b91c1c' : '#047857',
                  marginTop: '0.15rem',
                }}
              >
                {formatCurrency(classMetrics.outstanding)}
              </div>
            </div>
          </div>

          {/* Search & Status Filter within Class */}
          <div
            className="card"
            style={{
              padding: '0.55rem 0.85rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              marginBottom: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ position: 'relative', width: '260px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search student or roll no..."
                className="form-input"
                style={{
                  paddingLeft: '2.1rem',
                  paddingRight: '0.75rem',
                  fontSize: '0.825rem',
                  height: '32px',
                }}
                value={classSearchTerm}
                onChange={(e) => {
                  setClassSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Status:
              </span>
              <select
                className="form-select"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', height: '32px', width: 'auto' }}
                value={classStudentStatusFilter}
                onChange={(e) => {
                  setClassStudentStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Settled">Settled</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Pending">Pending</option>
                <option value="Unbilled">Unbilled</option>
              </select>
            </div>
          </div>

          {/* Student Billing Table */}
          <div
            className="card"
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}
          >
            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', width: '40px' }}></th>
                    <th style={{ padding: '0.75rem 1rem', width: '50px', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Roll / Adm No</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Billed</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Current Term Paid</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Current Term Due</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '120px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '220px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingClassStudents ? (
                    <BillingTableSkeleton rowCount={6} type="student-billing" />
                  ) : paginatedBillingRows.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Users size={32} style={{ opacity: 0.35 }} />
                          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            No student billing records found
                          </span>
                          <span style={{ fontSize: '0.825rem' }}>
                            {studentBillingRows.length === 0
                              ? `No active students are currently enrolled in ${toDisplayClassName(selectedClass)}.`
                              : 'No students match your filter criteria.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedBillingRows.map((row) => {
                      const studentId = row.studentId || row.id;
                      const isExpanded = expandedStudentId !== null && expandedStudentId === studentId;
                      return (
                        <React.Fragment key={studentId || row.sNo}>
                          <tr
                            style={{ transition: 'background-color 0.12s ease' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                          >
                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                                onClick={() => toggleRowExpand(studentId)}
                                title={isExpanded ? 'Hide breakdown' : 'View breakdown'}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {row.sNo}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                              {row.studentName}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                              {row.admissionNumber || '—'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' }}>
                              {formatCurrency(row.totalAmount)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#047857', fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' }}>
                              {formatCurrency(row.currentTermPaidAmount)}
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>{formatFeeComponent(row.currentTerm)}</div>
                            </td>
                            <td
                              style={{
                                padding: '0.75rem 1rem',
                                textAlign: 'right',
                                fontWeight: 600,
                                color: (row.currentTermOutstandingAmount || 0) > 0 ? '#b91c1c' : '#047857',
                                fontVariantNumeric: 'tabular-nums',
                                fontSize: '0.85rem',
                              }}
                            >
                              {formatCurrency(row.currentTermOutstandingAmount)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              {renderStudentStatusBadge(row.status)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                                {/* Record Payment */}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    order: 2,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    color: (row.currentTermOutstandingAmount || 0) > 0 ? '#047857' : 'var(--text-muted)',
                                  }}
                                  disabled={!row.feeId || (row.currentTermOutstandingAmount || 0) <= 0}
                                  onClick={() => openPaymentModal(row)}
                                  title="Collect Fee"
                                  aria-label={`Collect fee from ${row.studentName}`}
                                >
                                  <CreditCard size={14} />
                                </button>

                                {/* Payment History */}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    order: 1,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    color: 'var(--text-muted)',
                                  }}
                                  onClick={() => openHistoryModal(row)}
                                  title="Payment History"
                                >
                                  <History size={14} />
                                </button>

                                {/* Edit Billing */}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    order: 3,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    color: 'var(--primary)',
                                  }}
                                  onClick={() => {
                                    setIndividualModalStudent(row);
                                    setIsIndividualModalOpen(true);
                                  }}
                                  title="Edit Fee Structure"
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Breakdown Drawer */}
                          {isExpanded && (
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <td colSpan="9" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                    gap: '0.75rem',
                                    backgroundColor: '#ffffff',
                                    padding: '0.85rem 1.25rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  <div>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                      Term 1
                                    </span>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(row.termFees1)}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                      Term 2
                                    </span>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(row.termFees2)}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                      Term 3
                                    </span>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(row.termFees3)}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                      Bus Fee
                                    </span>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(row.busFees)}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                      Exam Fee
                                    </span>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(row.examFees)}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                      Recorded Receipts
                                    </span>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}>
                                      {row.payments?.length || 0} transaction(s)
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Page {currentPage} of {totalPages} ({filteredBillingRows.length} total students)
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
>>>>>>> 22873ba (Billing Changes)
            )}
          </select>
        </div>
      </div>

      {/* Fee Invoices Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Type & Year</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Pending Due</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  {loading ? 'Fetching fee records...' : 'No invoices generated for this student yet.'}
                </td>
              </tr>
            ) : (
              fees.map((fee) => (
                <tr key={fee.id}>
                  <td><strong>#INV-{fee.id}</strong></td>
                  <td>
                    <span className="badge badge-secondary">{fee.feeType || 'TUITION'}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                      {fee.academicYear || '2026-2027'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>${parseFloat(fee.totalAmount || 0).toFixed(2)}</td>
                  <td style={{ color: 'var(--success, #16a34a)', fontWeight: 600 }}>
                    ${parseFloat(fee.paidAmount || 0).toFixed(2)}
                  </td>
                  <td style={{ color: parseFloat(fee.pendingAmount || 0) > 0 ? 'var(--danger, #dc2626)' : 'var(--text-muted)', fontWeight: 600 }}>
                    ${parseFloat(fee.pendingAmount || 0).toFixed(2)}
                  </td>
                  <td>{fee.dueDate}</td>
                  <td>{getStatusBadge(fee.status)}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{fee.description || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => openPaymentModal(fee)}
                        className="btn btn-primary btn-sm"
                        title="Record Payment Transaction"
                        disabled={fee.status === 'PAID'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <CreditCard size={13} /> Pay
                      </button>
                      <button
                        onClick={() => openHistoryModal(fee)}
                        className="btn btn-secondary btn-sm"
                        title="View Payment History"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <History size={13} /> History
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Fee Invoice Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Generate New Fee Invoice"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="submit" form="createFeeForm" className="btn btn-primary">Generate Invoice</button>
          </>
        }
      >
        <form id="createFeeForm" onSubmit={handleCreateFee}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Fee Type</label>
              <select
                className="form-control"
                value={createForm.feeType}
                onChange={(e) => setCreateForm({ ...createForm, feeType: e.target.value })}
              >
                <option value="TUITION">TUITION</option>
                <option value="TRANSPORT">TRANSPORT</option>
                <option value="LIBRARY">LIBRARY</option>
                <option value="EXAMINATION">EXAMINATION</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <input
                type="text"
                className="form-control"
                value={createForm.academicYear}
                onChange={(e) => setCreateForm({ ...createForm, academicYear: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Total Fee Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                required
                value={createForm.totalAmount}
                onChange={(e) => setCreateForm({ ...createForm, totalAmount: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={createForm.dueDate}
                onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Description / Remarks</label>
            <input
              type="text"
              className="form-control"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Collect Student Fee Modal */}
      <Modal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
<<<<<<< HEAD
        title="Record Payment Transaction"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPaymentModal(false)}>Cancel</button>
            <button type="submit" form="paymentForm" className="btn btn-primary">Confirm Payment</button>
          </>
        }
      >
        <form id="paymentForm" onSubmit={handleRecordPayment}>
          {selectedFeeForPayment && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary, #f8f9fa)', borderRadius: '6px' }}>
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>Invoice #INV-{selectedFeeForPayment.id} ({selectedFeeForPayment.feeType || 'TUITION'})</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Total: ${parseFloat(selectedFeeForPayment.totalAmount || 0).toFixed(2)} | Already Paid: ${parseFloat(selectedFeeForPayment.paidAmount || 0).toFixed(2)} | Pending: ${parseFloat(selectedFeeForPayment.pendingAmount || 0).toFixed(2)}
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Amount to Pay ($) *</label>
=======
        title="Collect Student Fee"
        maxWidth="640px"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setPaymentModal(false)} disabled={savingPayment}>
              Cancel
            </button>
            <button type="submit" form="recordPaymentForm" className="btn btn-primary" disabled={!canSavePayment}>
              {savingPayment ? 'Saving...' : 'Collect Fee'}
            </button>
          </>
        }
      >
        <form id="recordPaymentForm" onSubmit={handleRecordPaymentSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '1rem',
              padding: '1rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md, 8px)',
              marginBottom: '1rem',
              border: '1px solid var(--border-medium, #e2e8f0)',
            }}
          >
            {[
              ['Student Name', selectedFeeForPayment?.studentName || '—'],
              ['Roll Number', selectedFeeForPayment?.admissionNumber || '—'],
              ['Class', selectedFeeForPayment?.className || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
                <div style={{ marginTop: '0.2rem', fontSize: '0.95rem', fontWeight: 650, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
            {[
              ['TOTAL BILLED', formatCurrency(selectedFeeForPayment?.totalAmount), 'var(--text-main)'],
              ['TOTAL PAID', formatCurrency(selectedFeeForPayment?.paidAmount), '#059669'],
              ['TOTAL OUTSTANDING', formatCurrency(selectedFeeForPayment?.outstandingAmount), '#dc2626'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ padding: '0.75rem 0.9rem', background: '#f8fafc', border: '1px solid var(--border-medium, #e2e8f0)', borderRadius: 'var(--radius-md, 8px)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                <div style={{ marginTop: '0.25rem', fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '1rem', border: '1px solid var(--border-medium, #e2e8f0)', borderRadius: 'var(--radius-md, 8px)', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-main)' }}>
              Fee Breakdown
            </div>
            <div className="table-responsive">
              <table className="table" style={{ margin: 0, fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '38px' }}></th>
                    <th>Fee Type</th>
                    <th style={{ textAlign: 'right' }}>Total Fee</th>
                    <th style={{ textAlign: 'right' }}>Paid Amount</th>
                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentFeeBreakdown.map((fee) => (
                    <tr key={fee.component} style={{ opacity: fee.outstanding > 0 ? 1 : 0.7 }}>
                      <td>
                        <input
                          type="radio"
                          name="collectFeeComponent"
                          aria-label={`Pay ${fee.label}`}
                          checked={paymentForm.feeComponent === fee.component}
                          disabled={fee.outstanding <= 0 || savingPayment}
                          onChange={() => {
                            setPaymentForm((current) => ({
                              ...current,
                              feeComponent: fee.component,
                              amountPaid: Math.min(Number(current.amountPaid) || fee.outstanding, fee.outstanding),
                            }));
                            setPaymentError('');
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {fee.label}
                        {fee.outstanding <= 0 && <span style={{ marginLeft: '0.4rem', color: '#059669', fontSize: '0.7rem' }}>Paid</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(fee.amount)}</td>
                      <td style={{ textAlign: 'right', color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(fee.paid)}</td>
                      <td style={{ textAlign: 'right', color: fee.outstanding > 0 ? '#dc2626' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(fee.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Payment Amount (₹) *</label>
>>>>>>> 22873ba (Billing Changes)
              <input
                type="number"
                step="0.01"
                min="0.01"
<<<<<<< HEAD
                className="form-control"
                required
                value={paymentForm.amountPaid}
                onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
              />
=======
                max={selectedPaymentOutstanding}
                className="form-input"
                required
                value={paymentForm.amountPaid}
                aria-invalid={Boolean(paymentAmountError)}
                onChange={(e) => {
                  setPaymentForm({ ...paymentForm, amountPaid: e.target.value });
                  setPaymentError('');
                }}
                style={{ height: '40px' }}
              />
              <div role={paymentAmountError ? 'alert' : 'status'} style={{ marginTop: '0.3rem', color: paymentAmountHelper.color, fontSize: '0.75rem' }}>
                {paymentAmountHelper.text}
              </div>
>>>>>>> 22873ba (Billing Changes)
            </div>
            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                style={{ height: '40px' }}
              />
            </div>
          </div>

<<<<<<< HEAD
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Payment Method *</label>
            <select
              className="form-control"
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
            >
              <option value="CASH">CASH</option>
              <option value="ONLINE">ONLINE / CARD</option>
              <option value="BANK_TRANSFER">BANK TRANSFER</option>
              <option value="CHEQUE">CHEQUE</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Transaction Note / Ref #</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Receipt #48291, Cash at counter"
=======
          <div style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select
                className="form-select"
                required
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                style={{ height: '40px' }}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reference Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="Receipt or transaction number"
              value={paymentForm.referenceNumber}
              onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
              style={{ height: '40px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Remarks / Notes</label>
            <textarea
              className="form-input"
              rows="2"
>>>>>>> 22873ba (Billing Changes)
              value={paymentForm.note}
              onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid var(--border-medium, #e2e8f0)', borderRadius: 'var(--radius-md, 8px)', marginTop: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>SELECTED FEE</div>
              <div style={{ marginTop: '0.2rem', fontWeight: 650 }}>{formatFeeComponent(paymentForm.feeComponent)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>OUTSTANDING</div>
              <div style={{ marginTop: '0.2rem', fontWeight: 650 }}>{formatCurrency(selectedPaymentOutstanding)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>PAYING NOW</div>
              <div style={{ marginTop: '0.2rem', fontWeight: 650 }}>{formatCurrency(Number.isFinite(paymentAmount) ? paymentAmount : 0)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>BALANCE AFTER</div>
              <div style={{ marginTop: '0.2rem', fontWeight: 700, color: '#047857' }}>{formatCurrency(balanceAfterPayment)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS AFTER</div>
              <div style={{ marginTop: '0.2rem', fontWeight: 700, color: statusAfterPayment === 'Settled' ? '#047857' : '#b45309' }}>{statusAfterPayment}</div>
            </div>
          </div>

          {paymentError && (
            <div role="alert" style={{ marginTop: '0.75rem', color: '#b91c1c', fontSize: '0.825rem' }}>
              {paymentError}
            </div>
          )}
        </form>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={historyModal}
        onClose={() => setHistoryModal(false)}
        title={historyFee ? `Payment History for Invoice #INV-${historyFee.id}` : 'Payment History'}
        footer={
          <button className="btn btn-secondary" onClick={() => setHistoryModal(false)}>Close</button>
        }
      >
<<<<<<< HEAD
        <div>
          {loadingHistory ? (
            <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Loading transactions...</p>
          ) : paymentsList.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No payment transactions recorded for this invoice yet.</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Txn ID</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Note</th>
=======
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
            {historyFee?.studentName}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Class: {historyFee?.className} | All-time billed: {formatCurrency(historyFee?.totalAmount)} | All-time paid: {formatCurrency(historyFee?.paidAmount)}
          </div>
        </div>

        {loadingHistory ? (
          <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Loading payments...</p>
        ) : paymentsList.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No payment transactions recorded for this student.</p>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ fontSize: '0.825rem' }}>
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Fee Component</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference / Remarks / Collected By</th>
                </tr>
              </thead>
              <tbody>
                {paymentsList.map((p) => (
                  <tr key={p.id ?? `legacy-${historyFee?.feeId}`}>
                    <td>{formatDateTime(p)}</td>
                    <td>{formatFeeComponent(p.feeComponent)}</td>
                    <td style={{ fontWeight: 600, color: '#047857' }}>{formatCurrency(p.amountPaid)}</td>
                    <td><span className="badge badge-primary">{p.paymentMethod || 'ONLINE'}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {p.referenceNumber && <div>Ref: {p.referenceNumber}</div>}
                      {p.note && <div>{p.note}</div>}
                      {p.adminUser && <div style={{ fontSize: '0.72rem' }}>Collected by {p.adminUser}</div>}
                      {!p.referenceNumber && !p.note && !p.adminUser && '—'}
                    </td>
>>>>>>> 22873ba (Billing Changes)
                  </tr>
                </thead>
                <tbody>
                  {paymentsList.map((p) => (
                    <tr key={p.id}>
                      <td><strong>#TXN-{p.id}</strong></td>
                      <td>{p.paymentDate}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success, #16a34a)' }}>
                        ${parseFloat(p.amountPaid || 0).toFixed(2)}
                      </td>
                      <td>
                        <span className="badge badge-secondary">{p.paymentMethod || 'CASH'}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
