import React, { useState, useEffect, useMemo } from 'react';
import { academicService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { BoardResultDetailsModal } from '../../components/common/BoardResultDetailsModal';
import { Award, Search, RefreshCw, Eye } from 'lucide-react';

const BOARD_OPTIONS = [
  { value: 'STATE_BOARD', label: 'State Board' },
  { value: 'CBSE', label: 'CBSE' },
  { value: 'ICSE', label: 'ICSE' },
];

// "X" before "XII", then anything else alphabetically
const compareClass = (a, b) => (a.length - b.length) || a.localeCompare(b);

/**
 * Admin's read-only view of this school's Board Results. Entry/edit stays Super Admin-only (per standing
 * decision), but the school that owns the data should still be able to see it.
 *
 * Filter by board, class, academic year or name; the list is always highest total first; "View" opens the
 * full result (school details, photo, every subject's marks) in a big popup.
 */
export const BoardResultsPage = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardFilter, setBoardFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);

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

  const classOptions = useMemo(
    () => [...new Set(results.map((r) => r.standard).filter(Boolean))].sort(compareClass),
    [results]
  );
  const yearOptions = useMemo(
    () => [...new Set(results.map((r) => r.academicYear).filter(Boolean))].sort().reverse(),
    [results]
  );

  // Highest total first; equal totals fall back to name so the order never jumps around.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return results
      .filter((r) => !boardFilter || r.board === boardFilter)
      .filter((r) => !classFilter || r.standard === classFilter)
      .filter((r) => !yearFilter || r.academicYear === yearFilter)
      .filter((r) => !term
        || (r.studentName || '').toLowerCase().includes(term)
        || (r.admissionNumber || '').toLowerCase().includes(term))
      .sort((a, b) => (Number(b.totalMarks) || 0) - (Number(a.totalMarks) || 0)
        || (a.studentName || '').localeCompare(b.studentName || ''));
  }, [results, boardFilter, classFilter, yearFilter, search]);

  const anyFilter = boardFilter || classFilter || yearFilter || search.trim();
  const clearFilters = () => {
    setBoardFilter('');
    setClassFilter('');
    setYearFilter('');
    setSearch('');
  };

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
            {anyFilter && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear filters</button>
            )}
            <span className="badge badge-secondary">{filtered.length} Result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Filters: Board, Class, Academic Year, Search */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem',
            padding: '0.9rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <select className="form-select" aria-label="Filter by board" value={boardFilter} onChange={(e) => setBoardFilter(e.target.value)}>
            <option value="">All Boards</option>
            {BOARD_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
          <select className="form-select" aria-label="Filter by class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">All Classes</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
          <select className="form-select" aria-label="Filter by academic year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="">All Years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '0.6rem', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '1.9rem', width: '100%' }}
              placeholder="Search by name or admission no..."
              aria-label="Search results"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                <th>Total</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                    {results.length === 0 ? 'No board results published yet.' : 'No results match your filters.'}
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
                    <td style={{ fontWeight: 700 }}>{r.totalMarks}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewing(r)}>
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BoardResultDetailsModal result={viewing} onClose={() => setViewing(null)} />
    </div>
  );
};
