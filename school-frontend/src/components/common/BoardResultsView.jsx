import React from 'react';
import { GraduationCap } from 'lucide-react';

/**
 * Read-only list of board results (high scorers Super Admin enters for a school or for all schools).
 * Shared by the Parent and Teacher portals so both show exactly the same thing.
 */
export const BoardResultsView = ({ results = [], loading = false }) => (
  <div className="card">
    <div className="card-header">
      <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        <GraduationCap size={15} color="var(--primary)" />
        Board Results
      </h3>
    </div>
    <div style={{ padding: '0 0 0.5rem' }}>
      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1.5rem' }}>
          Loading board results...
        </div>
      )}
      {!loading && results.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1.5rem' }}>
          No board results published yet.
        </div>
      )}
      {!loading && results.map((r) => (
        <div key={r.id} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {r.photo ? (
                <img src={r.photo} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg-secondary, #f1f5f9)', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontWeight: 700 }}>{r.studentName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {r.board === 'STATE_BOARD' ? 'State Board' : r.board} · Class {r.standard} · {r.academicYear}
                  {r.schoolName ? ` · ${r.schoolName}` : ''}{r.area ? `, ${r.area}` : ''}
                </div>
              </div>
            </div>
            <span className="badge badge-success">Total: {r.totalMarks}</span>
          </div>
          <div className="table-container" style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style={{ textAlign: 'right' }}>Marks</th>
                </tr>
              </thead>
              <tbody>
                {(r.subjects || []).map((s, idx) => (
                  <tr key={idx}>
                    <td>{s.subjectName}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  </div>
);
