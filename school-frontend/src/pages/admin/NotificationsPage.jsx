import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../../services/notificationService';
import { useToast } from '../../context/ToastContext';
import {
  Bell,
  Send,
  Calendar,
  Users,
  MessageSquare,
  History,
  RefreshCw,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';

export const NotificationsPage = () => {
  const { addToast } = useToast();
  const summaryRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    targetAudience: 'BOTH',
    title: '',
    message: '',
  });

  const [sending, setSending] = useState(false);

  // Summary / History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [audienceFilter, setAudienceFilter] = useState('ALL');
  const [showSummarySection, setShowSummarySection] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await notificationService.getHistory();
      if (Array.isArray(data)) {
        setHistory(data);
      } else if (data?.data && Array.isArray(data.data)) {
        setHistory(data.data);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Error fetching notification history:', err);
      addToast('Failed to load notification history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      addToast('Please enter a message before sending', 'error');
      return;
    }

    try {
      setSending(true);
      const payload = {
        date: formData.date || new Date().toISOString().split('T')[0],
        targetAudience: formData.targetAudience,
        title: formData.title.trim() || `Announcement for ${formData.targetAudience}`,
        message: formData.message.trim(),
        status: 'Sent',
      };

      await notificationService.sendNotification(payload);
      addToast('Notification dispatched successfully!', 'success');

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        targetAudience: 'BOTH',
        title: '',
        message: '',
      });

      // Reload summary
      await loadHistory();

      // Scroll to summary table
      if (summaryRef.current) {
        summaryRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      addToast(err.response?.data?.message || 'Failed to dispatch notification', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleScrollToSummary = () => {
    setShowSummarySection(true);
    if (summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredHistory = history.filter((item) => {
    if (audienceFilter === 'ALL') return true;
    return item.targetAudience?.toUpperCase() === audienceFilter;
  });

  const getAudienceBadgeClass = (aud) => {
    switch (aud?.toUpperCase()) {
      case 'STUDENTS':
        return 'badge-primary';
      case 'TEACHERS':
        return 'badge-info';
      case 'BOTH':
      default:
        return 'badge-warning';
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.75rem', fontWeight: 700 }}>
            <Bell className="text-primary" size={28} /> Notification Center
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>
            Broadcast real-time announcements to students, parents, and teachers
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleScrollToSummary}
            id="btn-view-summary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <History size={16} /> View Summary
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 460px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Send Notification Card */}
        <div className="card" style={{ boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={18} className="text-primary" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Send New Notification</h2>
          </div>
          <div className="card-body" style={{ padding: '1.5rem' }}>
            <form onSubmit={handleSend} id="sendNotificationForm">
              {/* Date Picker */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="notification-date" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <Calendar size={15} /> Date *
                </label>
                <input
                  type="date"
                  id="notification-date"
                  name="date"
                  className="form-control"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Send To Dropdown */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="notification-send-to" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <Users size={15} /> Send To *
                </label>
                <select
                  id="notification-send-to"
                  name="targetAudience"
                  className="form-control"
                  value={formData.targetAudience}
                  onChange={handleInputChange}
                  required
                >
                  <option value="STUDENTS">Students</option>
                  <option value="TEACHERS">Teachers</option>
                  <option value="BOTH">Both</option>
                </select>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Select the target audience for this broadcast
                </small>
              </div>

              {/* Title (Optional Header) */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="notification-title" style={{ fontWeight: 600 }}>
                  Title / Subject (Optional)
                </label>
                <input
                  type="text"
                  id="notification-title"
                  name="title"
                  className="form-control"
                  placeholder="e.g., Annual Sports Day Notice"
                  value={formData.title}
                  onChange={handleInputChange}
                />
              </div>

              {/* Message Textarea */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="notification-message" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <MessageSquare size={15} /> Message *
                </label>
                <textarea
                  id="notification-message"
                  name="message"
                  className="form-control"
                  rows={5}
                  placeholder="Type your official announcement here..."
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleScrollToSummary}
                >
                  View Summary
                </button>
                <button
                  type="submit"
                  id="btn-send-notification"
                  className="btn btn-primary"
                  disabled={sending}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px', justifyContent: 'center' }}
                >
                  {sending ? (
                    <>
                      <RefreshCw size={16} className="spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Send Notification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* View Summary / Notification History */}
        <div ref={summaryRef} className="card" style={{ boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} className="text-primary" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Notification Summary & History</h2>
              <span className="badge badge-secondary" style={{ marginLeft: '0.25rem' }}>
                {filteredHistory.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Audience Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  className="form-control"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', height: 'auto', width: 'auto' }}
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value)}
                >
                  <option value="ALL">All Audiences</option>
                  <option value="STUDENTS">Students</option>
                  <option value="TEACHERS">Teachers</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadHistory}
                disabled={loadingHistory}
                title="Refresh history"
                style={{ display: 'flex', alignItems: 'center', padding: '0.35rem 0.6rem' }}
              >
                <RefreshCw size={14} className={loadingHistory ? 'spin' : ''} />
              </button>
            </div>
          </div>

          <div className="card-body" style={{ padding: '0' }}>
            <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
              <table className="table" id="notification-summary-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Date</th>
                    <th style={{ width: '120px' }}>Audience</th>
                    <th>Message</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHistory ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <RefreshCw size={16} className="spin" /> Loading notification history...
                        </div>
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                        No notifications found. Send your first announcement above.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{item.date || (item.createdAt ? item.createdAt.split('T')[0] : '—')}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getAudienceBadgeClass(item.targetAudience)}`}>
                            {item.targetAudience || 'BOTH'}
                          </span>
                        </td>
                        <td>
                          {item.title && (
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem', color: 'var(--text-heading)' }}>
                              {item.title}
                            </div>
                          )}
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.45 }}>
                            {item.message}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="badge badge-success"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <CheckCircle2 size={12} /> {item.status || 'Sent'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
