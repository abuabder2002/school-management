import React, { useState, useEffect } from 'react';
import { schoolService } from '../../services/schoolService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Building2, Plus, Settings, ToggleLeft, ToggleRight } from 'lucide-react';

const EMPTY_FORM = { name: '', adminName: '', adminEmail: '', adminPassword: '' };

export const AddSchoolPage = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [modulesSchool, setModulesSchool] = useState(null);
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  const { addToast } = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await schoolService.listSchools();
      setSchools(res.success && res.data ? res.data : []);
    } catch {
      addToast('Failed to load schools', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setAddModalOpen(true);
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.adminName.trim() || !form.adminEmail.trim()) {
      addToast('School name, admin name and admin email are required.', 'warning');
      return;
    }
    if (!form.adminPassword || form.adminPassword.trim().length < 4) {
      addToast('Password must be at least 4 characters.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await schoolService.createSchool({
        name: form.name.trim(),
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword.trim(),
      });
      addToast(`School "${form.name.trim()}" created.`, 'success');
      setAddModalOpen(false);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create school', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenModules = async (school) => {
    setModulesSchool(school);
    setModulesLoading(true);
    try {
      const res = await schoolService.getModules(school.id);
      setModules(res.success && res.data ? res.data : []);
    } catch {
      addToast('Failed to load module access', 'error');
    } finally {
      setModulesLoading(false);
    }
  };

  const handleToggleModule = async (m) => {
    const nextEnabled = !m.enabled;
    setSavingKey(m.moduleKey);
    setModules((prev) => prev.map((x) => (x.moduleKey === m.moduleKey ? { ...x, enabled: nextEnabled } : x)));
    try {
      await schoolService.setModule(modulesSchool.id, m.moduleKey, nextEnabled);
    } catch {
      setModules((prev) => prev.map((x) => (x.moduleKey === m.moduleKey ? { ...x, enabled: m.enabled } : x)));
      addToast('Failed to update module access', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Add School' }]} />
      <div className="page-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Add School</h1>
          <p className="page-subtitle">Create a school login and control which modules it can see.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add School
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>School Name</th>
                <th>Admin Login (User ID)</th>
                <th>Plan</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : schools.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No schools yet.</td></tr>
              ) : schools.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.adminEmail || '—'}</td>
                  <td>{s.planType}</td>
                  <td>
                    {s.active
                      ? <span className="badge badge-success">Active</span>
                      : <span className="badge badge-secondary">Inactive</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleOpenModules(s)}>
                      <Settings size={14} /> Modules
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add School"
        icon={Building2}
        footer={(
          <>
            <button className="btn btn-secondary" onClick={() => setAddModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddSchool} disabled={saving}>
              {saving ? 'Creating...' : 'Create School'}
            </button>
          </>
        )}
      >
        <form onSubmit={handleAddSchool} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div className="form-group">
            <label>School Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sunrise Public School" />
          </div>
          <div className="form-group">
            <label>Admin Name</label>
            <input className="form-input" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="School Admin's name" />
          </div>
          <div className="form-group">
            <label>User ID (Login Email)</label>
            <input className="form-input" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@school.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-input" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Minimum 4 characters" />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!modulesSchool}
        onClose={() => setModulesSchool(null)}
        title={modulesSchool ? `Modules — ${modulesSchool.name}` : 'Modules'}
        icon={Settings}
        maxWidth="620px"
      >
        {modulesLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Loading...</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={m.moduleKey}>
                    <td style={{ fontWeight: 600 }}>{m.label}</td>
                    <td>
                      {m.enabled
                        ? <span className="badge badge-success">Enabled</span>
                        : <span className="badge badge-secondary">Disabled</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={`btn btn-sm ${m.enabled ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => handleToggleModule(m)}
                        disabled={savingKey === m.moduleKey}
                      >
                        {m.enabled
                          ? <><ToggleLeft size={14} /> Disable</>
                          : <><ToggleRight size={14} /> Enable</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};
