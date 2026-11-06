import React, { useState, useEffect, useMemo } from 'react';
import { academicService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Award, Search, RefreshCw } from 'lucide-react';

const BOARD_OPTIONS = [
  { value: 'STATE_BOARD', label: 'State Board' },
  { value: 'CBSE', label: 'CBSE' },
  { value: 'ICSE', label: 'ICSE' },
];

/**
 * Admin's read-only view of this school's Board Results. Entry/edit stays Super Admin-only (per
 * standing decision), but the school that owns the data should still be able to see it.
 */
export const BoardResultsPage = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const { addToast } = useToast();

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const res = await academicService.getBoardResults();
      if (res.success && res.data) setResults(res.data);
    } catch {
      addToast('Failed to load board results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const boardLabel = (val) => BOARD_OPTIONS.find((b) => b.value === val)?.label || val;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return results;
    return results.filter((r) =>
      (r.studentName || '').toLowerCase().includes(term) ||
      (r.admissionNumber || '').toLowerCase().includes(term)
    );
  }, [results, search]);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Board Results' }]} />
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Board Results</h1>
          <p className="page-subtitle">Class X / XII board exam results — entered by Super Admin, view-only here.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadResults} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={15} color="var(--primary)" />
            Saved Results
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '0.6rem', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '1.9rem', width: '240px' }}
                placeholder="Search by name or admission no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="badge badge-secondary">{filtered.length} Result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Student Name</th>
                <th>Board</th>
                <th>Class</th>
                <th>Academic Year</th>
                <th>Subjects</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                    {results.length === 0 ? 'No board results published yet.' : 'No results match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {r.photo ? (
                          <img src={r.photo} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary, #f1f5f9)', flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                          {r.admissionNumber && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Adm: {r.admissionNumber}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{boardLabel(r.board)}</td>
                    <td>{r.standard}</td>
                    <td>{r.academicYear}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {(r.subjects || []).map((s) => `${s.subjectName}: ${s.marks}`).join(', ') || '—'}
                    </td>
                    <td style={{ fontWeight: 700 }}>{r.totalMarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
