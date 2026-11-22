import React from 'react';
import { Award } from 'lucide-react';
import { Modal } from './Modal';

const BOARD_LABELS = { STATE_BOARD: 'State Board', CBSE: 'CBSE', ICSE: 'ICSE' };

const chip = {
  display: 'inline-block',
  padding: '0.2rem 0.65rem',
  borderRadius: '999px',
  background: 'var(--bg-secondary, #f1f5f9)',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-main)',
};

/**
 * Big read-only popup for one board result: the student's school details, photo and every subject's marks
 * with the total. Opened from the "View" button of the Board Results list.
 */
export const BoardResultDetailsModal = ({ result, onClose }) => {
  const r = result;
  const subjects = (r && r.subjects) || [];
  const place = r ? [r.area, r.pincode].filter(Boolean).join(', ') : '';

  return (
    <Modal
      isOpen={!!r}
      onClose={onClose}
      title="Board Result"
      icon={Award}
      maxWidth="760px"
      footer={<button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>}
    >
      {r && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* School details */}
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.25 }}>
              {r.schoolName || 'School name not provided'}
            </div>
            {place && <div style={{ marginTop: '0.2rem', color: 'var(--text-muted)' }}>{place}</div>}
            {r.schoolPhone && (
              <div style={{ marginTop: '0.2rem', color: 'var(--text-muted)' }}>Phone: {r.schoolPhone}</div>
            )}
          </div>

          {/* Photo and student */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {r.photo ? (
              <img
                src={r.photo}
                alt={r.studentName ? `Photo of ${r.studentName}` : 'Student photo'}
                style={{ width: '160px', height: '190px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border-color)' }}
              />
            ) : (
              <div
                style={{ width: '160px', height: '190px', borderRadius: '10px', border: '1px dashed var(--border-color)', background: 'var(--bg-secondary, #f1f5f9)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}
              >
                No photo
              </div>
            )}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{r.studentName}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem' }}>
                <span style={chip}>{BOARD_LABELS[r.board] || r.board}</span>
                <span style={chip}>Class {r.standard}</span>
                <span style={chip}>{r.academicYear}</span>
                {r.admissionNumber && <span style={chip}>Adm: {r.admissionNumber}</span>}
              </div>
            </div>
          </div>

          {/* Marks */}
          <div className="table-container" style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style={{ textAlign: 'right' }}>Marks</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.25rem' }}>
                      No subject marks recorded.
                    </td>
                  </tr>
                ) : (
                  subjects.map((s, idx) => (
                    <tr key={idx}>
                      <td>{s.subjectName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.marks}</td>
                    </tr>
                  ))
                )}
                <tr style={{ background: 'var(--bg-secondary, #f1f5f9)' }}>
                  <td style={{ fontWeight: 800 }}>Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>{r.totalMarks}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
};
