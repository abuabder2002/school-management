import React, { useState, useEffect } from 'react';
import { leaveService } from '../../services/leaveService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { CalendarCheck2, CheckCircle, XCircle, Clock, Filter, MessageSquare } from 'lucide-react';

export const LeaveRequestsPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Review Modal
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState('APPROVE'); // 'APPROVE' | 'REJECT'
  const [reviewNote, setReviewNote] = useState('');

  const { addToast } = useToast();

  useEffect(() => {
    loadLeaveRequests();
  }, []);

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      const res = await leaveService.getAll();
      if (res.success && res.data) {
        setLeaveRequests(res.data);
      } else {
        setLeaveRequests([]);
      }
    } catch (err) {
      addToast('Failed to load leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (req, type) => {
    setSelectedReq(req);
    setActionType(type);
    setReviewNote(type === 'APPROVE' ? 'Approved by Admin' : 'Rejected');
    setReviewModal(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      if (actionType === 'APPROVE') {
        await leaveService.approve(selectedReq.id, reviewNote);
        addToast('Leave request approved', 'success');
      } else {
        await leaveService.reject(selectedReq.id, reviewNote);
        addToast('Leave request rejected', 'warning');
      }
      setReviewModal(false);
      setSelectedReq(null);
      loadLeaveRequests();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to process leave request', 'error');
    }
  };

  const filteredRequests = statusFilter === 'ALL'
    ? leaveRequests
    : leaveRequests.filter(r => r.status === statusFilter);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={13} /> APPROVED</span>;
      case 'REJECTED':
        return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={13} /> REJECTED</span>;
      default:
        return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={13} /> PENDING</span>;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>
            <CalendarCheck2 className="text-primary" /> Leave Requests Review
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>Review and approve student absence and leave requests submitted by parents</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Filter size={18} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filter by Status:</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(st)}
            >
              {st} {st !== 'ALL' && `(${leaveRequests.filter(r => r.status === st).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student ID</th>
              <th>Date Range</th>
              <th>Reason</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Review Note</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  {loading ? 'Loading leave requests...' : 'No leave requests found matching current filter.'}
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td><strong>#{req.id}</strong></td>
                  <td>
                    <span className="badge badge-secondary">Student #{req.studentId}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {req.startDate} to {req.endDate}
                  </td>
                  <td style={{ maxWidth: '250px', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                    {req.reason}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {req.reviewNote || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {req.status === 'PENDING' ? (
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openReviewModal(req, 'APPROVE')}
                          title="Approve Leave"
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => openReviewModal(req, 'REJECT')}
                          title="Reject Leave"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reviewed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModal}
        onClose={() => setReviewModal(false)}
        title={actionType === 'APPROVE' ? 'Approve Leave Request' : 'Reject Leave Request'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReviewModal(false)}>Cancel</button>
            <button
              type="submit"
              form="reviewForm"
              className={`btn ${actionType === 'APPROVE' ? 'btn-primary' : 'btn-danger'}`}
            >
              Confirm {actionType === 'APPROVE' ? 'Approval' : 'Rejection'}
            </button>
          </>
        }
      >
        <form id="reviewForm" onSubmit={handleReviewSubmit}>
          {selectedReq && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary, #f8f9fa)', borderRadius: '6px' }}>
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>Student #{selectedReq.studentId}</p>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>Period: {selectedReq.startDate} to {selectedReq.endDate}</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Reason: {selectedReq.reason}</p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Reviewer Note / Feedback</label>
            <textarea
              className="form-control"
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add an optional comment for the parent..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
