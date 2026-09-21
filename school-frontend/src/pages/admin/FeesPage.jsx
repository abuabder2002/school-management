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
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    note: '',
  });

  // Payment History Modal
  const [historyModal, setHistoryModal] = useState(false);
  const [historyFee, setHistoryFee] = useState(null);
  const [paymentsList, setPaymentsList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
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

  const openPaymentModal = (fee) => {
    setSelectedFeeForPayment(fee);
    const remaining = Math.max(0, (fee.totalAmount || 0) - (fee.paidAmount || 0));
    setPaymentForm({
      amountPaid: remaining,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      note: 'Tuition installment',
    });
    setPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedFeeForPayment) return;
    try {
      await feeService.recordPayment(selectedFeeForPayment.id, {
        amountPaid: parseFloat(paymentForm.amountPaid),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        note: paymentForm.note,
      });
      addToast('Payment recorded successfully!', 'success');
      setPaymentModal(false);
      setSelectedFeeForPayment(null);
      loadFeesForStudent(selectedStudentId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to record payment', 'error');
    }
  };

  const openHistoryModal = async (fee) => {
    setHistoryFee(fee);
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
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>
            <DollarSign className="text-primary" /> Fee & Payment Management
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>
            Track invoices, record payment transactions, and view audit history
          </p>
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
            {students.length === 0 ? (
              <option value="">No students registered</option>
            ) : (
              students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `${s.firstName || ''} ${s.lastName || ''}`} ({s.admissionNumber || s.rollNumber}) — {s.className}
                </option>
              ))
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

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
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
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                required
                value={paymentForm.amountPaid}
                onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              />
            </div>
          </div>

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
              value={paymentForm.note}
              onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
            />
          </div>
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
