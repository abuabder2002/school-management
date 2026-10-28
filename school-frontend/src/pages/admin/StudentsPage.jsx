import React, { useState, useEffect, useMemo } from 'react';
import { studentService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { BulkUploadModal } from '../../components/students/BulkUploadModal';
import { usePersistedState } from '../../hooks/usePersistedState';
import {
  getClassAcademicRank,
  compareAcademicClasses,
  CLASS_CONFIG,
  toDisplayClassName,
  getAvailableEditClasses
} from '../../utils/academicClassOrder';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowLeft,
  ChevronRight,
  Layers,
  RotateCcw,
  Users,
  Download,
  KeyRound,
  ShieldCheck,
  ShieldOff,
  Copy
} from 'lucide-react';

const STANDARD_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const StudentsPage = () => {
  // Navigation View: 'summary' (Class Student Summary) | 'class-details' (Selected Class Records)
  const [view, setView] = useState('summary');
  const [selectedClass, setSelectedClass] = useState('');

  // Class Summary State
  const [classSummaries, setClassSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);

  // Master Search State (Search across all students by Name, Roll No, Admission No, Phone Number)
  const [masterSearch, setMasterSearch] = useState('');
  const [masterStudents, setMasterStudents] = useState([]);
  const [loadingMasterSearch, setLoadingMasterSearch] = useState(false);
  const [masterPagination, setMasterPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [masterClassFilter, setMasterClassFilter] = useState('');
  const [masterSectionFilter, setMasterSectionFilter] = useState('');

  // Class-Specific Students State
  const [students, setStudents] = useState([]);
  const [classStudentCount, setClassStudentCount] = useState(0);
  const [classSearch, setClassSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  // Overall Stats
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);

  // Modals — the Add/Edit Student form survives an accidental page refresh:
  // its open flag, which student (if any) is being edited, and every typed
  // field all live in sessionStorage via usePersistedState, so a refresh
  // mid-entry reopens the same form with everything still filled in.
  const [isModalOpen, setIsModalOpen] = usePersistedState('draft:student-modal-open', false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalTargetClass, setBulkModalTargetClass] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, student: null, loading: false });
  const [editingStudent, setEditingStudent] = usePersistedState('draft:student-editing', null);
  const [showModalPassword, setShowModalPassword] = useState(false);

  const [formData, setFormData] = usePersistedState('draft:student-form', {
    admNo: '',
    name: '',
    className: '',
    section: '',
    dob: '',
    gender: 'Male',
    fatherName: '',
    fatherMobileNumber: '',
    motherName: '',
    motherMobileNumber: '',
    guardianName: '',
    guardianMobileNumber: '',
    address: '',
    bloodGroup: '',
    joiningDate: '',
    phoneNumber: '',
    password: '',
    photo: ''
  });

  const [manualBloodGroup, setManualBloodGroup] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  // Parent login — reset from inside the View Student modal
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newParentPassword, setNewParentPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  // Passwords are stored as a one-way hash, so an old one can never be looked up again —
  // this only remembers the value for the moment right after *this admin* just set it.
  const [justSetPassword, setJustSetPassword] = useState('');

  const { addToast } = useToast();

  useEffect(() => {
    setShowResetPassword(false);
    setNewParentPassword('');
    setJustSetPassword('');
  }, [viewingStudent?.id]);

  const handleResetParentPassword = async () => {
    if (!viewingStudent) return;
    if (!newParentPassword || newParentPassword.trim().length < 4) {
      addToast('Password must be at least 4 characters.', 'warning');
      return;
    }
    setResettingPassword(true);
    try {
      const savedPassword = newParentPassword.trim();
      await studentService.resetParentPassword(viewingStudent.id, savedPassword);
      addToast(`Parent login password updated for ${viewingStudent.name}.`, 'success');
      setViewingStudent({ ...viewingStudent, hasParentLogin: true });
      setShowResetPassword(false);
      setNewParentPassword('');
      setJustSetPassword(savedPassword);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  // Runs once per page load: if the form modal was still open when the page
  // last refreshed, let the admin know their typed details are still there.
  useEffect(() => {
    if (isModalOpen) {
      addToast('Restored the student details you were entering.', 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same backend endpoint (and so the same column template) used everywhere else students are
  // exported — className omitted exports the whole school, passed in scopes it to one class.
  const [exporting, setExporting] = useState(false);
  const handleExportExcel = async (className, filenamePrefix) => {
    try {
      setExporting(true);
      const response = await studentService.exportExcel(className);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('Student records exported successfully', 'success');
    } catch (err) {
      addToast('Failed to export student data', 'error');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadClassSummaries();
  }, []);

  // When classSearch or pagination changes in class-details view, reload class students
  useEffect(() => {
    if (view === 'class-details' && selectedClass) {
      const timer = setTimeout(() => {
        loadStudentsForClass(selectedClass, classSearch, 1);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [classSearch, selectedClass, view]);

  // Multi-field search across: Student Name, Admission/Roll Number, Father/Mother/Guardian Mobile
  // Strictly restricted to selectedClass and filtered by status & section
  const filteredStudents = useMemo(() => {
    let list = students;
    if (statusFilter === 'ACTIVE') {
      list = list.filter((s) => s.isActive !== false);
    } else if (statusFilter === 'INACTIVE') {
      list = list.filter((s) => s.isActive === false);
    }

    if (sectionFilter !== 'ALL') {
      list = list.filter((s) => (s.section || '').trim().toUpperCase() === sectionFilter.toUpperCase());
    }

    if (!classSearch || !classSearch.trim()) {
      return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    }
    const q = classSearch.trim().toLowerCase();
    const rawDigits = q.replace(/\D/g, '');

    return list.filter((s) => {
      // Scoped strictly to the currently selected class
      if (s.className && selectedClass && s.className.trim().toLowerCase() !== selectedClass.trim().toLowerCase()) {
        return false;
      }
      const name = (s.name || '').toLowerCase();
      const adm = (s.admissionNumber || '').toLowerCase();
      const roll = (s.rollNumber || '').toLowerCase();
      const fatherMob = (s.fatherMobileNumber || '').toLowerCase();
      const motherMob = (s.motherMobileNumber || '').toLowerCase();
      const guardianMob = (s.guardianMobileNumber || '').toLowerCase();
      const contact = (s.contactNumber || '').toLowerCase();
      const phone = (s.phoneNumber || '').toLowerCase();

      const textMatch = name.includes(q) || adm.includes(q) || roll.includes(q);
      const phoneMatch =
        fatherMob.includes(q) ||
        motherMob.includes(q) ||
        guardianMob.includes(q) ||
        contact.includes(q) ||
        phone.includes(q) ||
        (rawDigits.length >= 3 && (
          fatherMob.replace(/\D/g, '').includes(rawDigits) ||
          motherMob.replace(/\D/g, '').includes(rawDigits) ||
          guardianMob.replace(/\D/g, '').includes(rawDigits) ||
          contact.replace(/\D/g, '').includes(rawDigits) ||
          phone.replace(/\D/g, '').includes(rawDigits)
        ));

      return textMatch || phoneMatch;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [students, classSearch, selectedClass]);

  // Master Search effect: Debounced search across all students in school, optionally
  // narrowed by Class/Section even without typing a name/admission number.
  useEffect(() => {
    if (view === 'summary') {
      const hasQuery = masterSearch && masterSearch.trim();
      if (!hasQuery && !masterClassFilter) {
        setMasterStudents([]);
        setLoadingMasterSearch(false);
        return;
      }
      const timer = setTimeout(() => {
        handleMasterSearch(masterSearch, 1);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [masterSearch, masterClassFilter, masterSectionFilter, view]);

  const handleMasterSearch = async (query, page = 1) => {
    const trimmedQuery = (query || '').trim();
    if (!trimmedQuery && !masterClassFilter) {
      setMasterStudents([]);
      setLoadingMasterSearch(false);
      return;
    }
    try {
      setLoadingMasterSearch(true);
      const res = await studentService.getAllStudents({
        search: trimmedQuery || undefined,
        className: masterClassFilter || undefined,
        page,
        pageSize: 50,
      });

      if (res && res.success && res.data) {
        setMasterStudents(res.data.data || []);
        const pag = res.data.pagination || { page: 1, pageSize: 50, total: 0, totalPages: 0 };
        setMasterPagination(pag);
      } else if (res && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setMasterStudents(list);
        setMasterPagination({ page: 1, pageSize: 50, total: list.length, totalPages: 1 });
      }
    } catch (err) {
      console.error('Master search failed:', err);
      addToast('Failed to perform master search', 'error');
    } finally {
      setLoadingMasterSearch(false);
    }
  };

  // Instant client-side multi-field filter on master search results
  const filteredMasterStudents = useMemo(() => {
    const hasQuery = masterSearch && masterSearch.trim();
    if (!hasQuery && !masterClassFilter) return [];

    const bySection = masterSectionFilter.trim()
      ? masterStudents.filter((s) => (s.section || '').toLowerCase() === masterSectionFilter.trim().toLowerCase())
      : masterStudents;

    if (!hasQuery) return bySection;

    const q = masterSearch.trim().toLowerCase();
    const rawDigits = q.replace(/\D/g, '');

    return bySection.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const adm = (s.admissionNumber || '').toLowerCase();
      const roll = (s.rollNumber || '').toLowerCase();
      const cName = (s.className || '').toLowerCase();
      const fatherMob = (s.fatherMobileNumber || '').toLowerCase();
      const motherMob = (s.motherMobileNumber || '').toLowerCase();
      const guardianMob = (s.guardianMobileNumber || '').toLowerCase();
      const contact = (s.contactNumber || '').toLowerCase();
      const phone = (s.phoneNumber || '').toLowerCase();

      const textMatch = name.includes(q) || adm.includes(q) || roll.includes(q) || cName.includes(q);
      const phoneMatch =
        fatherMob.includes(q) ||
        motherMob.includes(q) ||
        guardianMob.includes(q) ||
        contact.includes(q) ||
        phone.includes(q) ||
        (rawDigits.length >= 3 && (
          fatherMob.replace(/\D/g, '').includes(rawDigits) ||
          motherMob.replace(/\D/g, '').includes(rawDigits) ||
          guardianMob.replace(/\D/g, '').includes(rawDigits) ||
          contact.replace(/\D/g, '').includes(rawDigits) ||
          phone.replace(/\D/g, '').includes(rawDigits)
        ));

      return textMatch || phoneMatch;
    });
  }, [masterStudents, masterSearch, masterClassFilter, masterSectionFilter]);

  const isMasterSearchActive = Boolean((masterSearch && masterSearch.trim()) || masterClassFilter);

  const matchingClasses = useMemo(() => {
    if (!masterSearch || !masterSearch.trim()) return [];
    const q = masterSearch.trim().toLowerCase();
    return classSummaries.filter((c) => (c.className || '').toLowerCase().includes(q));
  }, [classSummaries, masterSearch]);

  // Load summary of classes with student counts
  const loadClassSummaries = async () => {
    try {
      setLoadingSummaries(true);
      const res = await studentService.getClassSummary();
      let summaryData = [];
      if (res && res.success && Array.isArray(res.data)) {
        summaryData = res.data;
      } else if (Array.isArray(res)) {
        summaryData = res;
      } else if (res && res.data && Array.isArray(res.data.data)) {
        summaryData = res.data.data;
      }

      // Sort classes strictly in ascending academic order using centralized utility
      const sorted = [...summaryData].sort(compareAcademicClasses);
      setClassSummaries(sorted);

      // Compute total students from summary
      const total = sorted.reduce((sum, item) => sum + (Number(item.studentCount) || 0), 0);
      setTotalStudents(total);
      setActiveStudentsCount(total);
    } catch (err) {
      console.error('Failed to load class summary:', err);
      addToast('Failed to load class student summaries', 'error');
    } finally {
      setLoadingSummaries(false);
    }
  };

  // Load students for a selected class with optional search and pagination
  const loadStudentsForClass = async (className, searchParam = '', page = 1) => {
    try {
      setLoadingStudents(true);
      const res = await studentService.getAllStudents({
        className: className,
        search: searchParam,
        page,
        pageSize: pagination.pageSize || 20,
      });

      if (res && res.success && res.data) {
        setStudents(res.data.data || []);
        const pag = res.data.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 };
        setPagination(pag);
        setClassStudentCount(pag.total ?? (res.data.data || []).length);
      } else if (res && res.data) {
        const studentList = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setStudents(studentList);
        setClassStudentCount(studentList.length);
      }
    } catch (err) {
      console.error('Failed to load class students:', err);
      addToast(`Failed to load students for ${className}`, 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Open class-details view
  const handleOpenClassDetails = (className) => {
    setSelectedClass(className);
    setClassSearch('');
    setView('class-details');
    loadStudentsForClass(className, '', 1);
  };

  // Return to Class Student Summary view
  const handleBackToSummary = () => {
    setView('summary');
    setSelectedClass('');
    setClassSearch('');
    loadClassSummaries();
  };

  // Open Bulk Upload Modal
  const handleOpenBulkUpload = (targetClass = null) => {
    setBulkModalTargetClass(targetClass);
    setIsBulkModalOpen(true);
  };

  // Filtered class summary list for Classes Overview
  const filteredClassSummaries = useMemo(() => {
    return classSummaries
      .filter((item) => {
        const count = Number(item.studentCount) || 0;
        return count > 0;
      })
      .sort(compareAcademicClasses);
  }, [classSummaries]);

  // Resizes/compresses a picked photo to a small JPEG data URI before it goes in formData,
  // so the student record (and every list that returns it) stays lightweight.
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        } else if (height > maxDim) {
          width = Math.round(width * (maxDim / height)); height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        setFormData((prev) => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.75) }));
      };
      img.onerror = () => addToast('Could not read that image', 'error');
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Open Add Student Modal (From Summary: class empty; From Class-Details: class locked/prefilled)
  const handleOpenAdd = (prefillClass = '') => {
    setEditingStudent(null);
    setShowModalPassword(false);
    setManualBloodGroup(false);
    setFormData({
      admNo: '',
      name: '',
      className: prefillClass || '',
      section: '',
      dob: '',
      gender: '',
      fatherName: '',
      fatherMobileNumber: '',
      motherName: '',
      motherMobileNumber: '',
      guardianName: '',
      guardianMobileNumber: '',
      address: '',
      bloodGroup: '',
      joiningDate: '',
      phoneNumber: '',
      password: '',
      photo: ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Student Modal
  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setShowModalPassword(false);
    setManualBloodGroup(Boolean(student.bloodGroup) && !STANDARD_BLOOD_GROUPS.includes(student.bloodGroup));
    setFormData({
      admNo: student.admissionNumber || '',
      name: student.name || '',
      className: student.className || '',
      section: student.section || '',
      dob: student.dateOfBirth || '',
      gender: student.gender || '',
      fatherName: student.fatherName || '',
      fatherMobileNumber: student.fatherMobileNumber || student.contactNumber || '',
      motherName: student.motherName || '',
      motherMobileNumber: student.motherMobileNumber || '',
      guardianName: student.guardianName || '',
      guardianMobileNumber: student.guardianMobileNumber || '',
      address: student.address || '',
      bloodGroup: student.bloodGroup || '',
      joiningDate: student.joiningDate || '',
      phoneNumber: student.phoneNumber || '',
      password: '',
      photo: student.photo || ''
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (student) => {
    setDeleteModal({ isOpen: true, student, loading: false });
  };

  const confirmDelete = async () => {
    const { student } = deleteModal;
    if (!student) return;

    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await studentService.deleteStudent(student.id);
      addToast('Student deleted successfully', 'success');
      setDeleteModal({ isOpen: false, student: null, loading: false });
      if (view === 'class-details' && selectedClass) {
        loadStudentsForClass(selectedClass, classSearch, pagination.page);
      }
      if (masterSearch) {
        handleMasterSearch(masterSearch, masterPagination.page);
      }
      loadClassSummaries();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete student. Please try again.', 'error');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fatherName.trim() && !formData.motherName.trim() && !formData.guardianName.trim()) {
      addToast('Please provide at least one Father Name, Mother Name, or Guardian Name.', 'error');
      return;
    }

    // Frontend validation: Promotion must be to current class or higher class
    if (editingStudent) {
      const availableClasses = getAvailableEditClasses(editingStudent.className);
      if (!formData.className || !formData.className.trim()) {
        addToast('Please select a class for the student.', 'error');
        return;
      }
      const isAllowed = availableClasses.some(
        (c) =>
          c.internalValue.toLowerCase() === formData.className.trim().toLowerCase() ||
          c.displayLabel.toLowerCase() === formData.className.trim().toLowerCase()
      );
      if (!isAllowed) {
        addToast('Student cannot be demoted to a lower class.', 'error');
        return;
      }
    } else {
      if (!formData.className || !formData.className.trim()) {
        addToast('Please select a class for the student.', 'error');
        return;
      }
    }

    try {
      const targetClassName = formData.className.trim();

      const payload = {
        admissionNumber: formData.admNo.trim(),
        name: formData.name.trim(),
        className: targetClassName,
        section: formData.section ? formData.section.trim() : '',
        dateOfBirth: formData.dob || null,
        gender: formData.gender,
        fatherName: formData.fatherName ? formData.fatherName.trim() : '',
        fatherMobileNumber: formData.fatherMobileNumber ? formData.fatherMobileNumber.trim() : '',
        motherName: formData.motherName ? formData.motherName.trim() : '',
        motherMobileNumber: formData.motherMobileNumber ? formData.motherMobileNumber.trim() : '',
        guardianName: formData.guardianName ? formData.guardianName.trim() : '',
        guardianMobileNumber: formData.guardianMobileNumber ? formData.guardianMobileNumber.trim() : '',
        contactNumber: formData.fatherMobileNumber || formData.motherMobileNumber || formData.guardianMobileNumber || '',
        address: formData.address ? formData.address.trim() : '',
        bloodGroup: formData.bloodGroup || '',
        joiningDate: formData.joiningDate || null,
        isActive: true,
        phoneNumber: formData.phoneNumber ? formData.phoneNumber.trim() : '',
        password: formData.password ? formData.password.trim() : '',
        parentId: null,
        photo: formData.photo || undefined,
      };

      if (editingStudent) {
        await studentService.updateStudent(editingStudent.id, payload);
        addToast('Student updated successfully!', 'success');
      } else {
        await studentService.createStudent(payload);
        addToast('Student added successfully!', 'success');
      }
      setIsModalOpen(false);

      if (view === 'class-details' && selectedClass) {
        loadStudentsForClass(selectedClass, classSearch, pagination.page);
      }
      if (masterSearch) {
        handleMasterSearch(masterSearch, masterPagination.page);
      }
      loadClassSummaries();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save student', 'error');
    }
  };

  return (
    <div>
      {/* ========================================================================= */}
      {/* 1. MAIN STUDENT DIRECTORY — CLASS SUMMARY VIEW */}
      {/* ========================================================================= */}
      {view === 'summary' && (
        <div>
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                  marginBottom: '0.25rem',
                }}
              >
                <span>Students</span>
                <span>/</span>
                <span style={{ color: 'var(--primary)' }}>Student Directory</span>
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
                Students
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
                Manage student profiles, enrollment and academic information.
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                onClick={loadClassSummaries}
                disabled={loadingSummaries}
                title="Reload class summaries"
              >
                <RotateCcw size={15} className={loadingSummaries ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                onClick={() => handleExportExcel(null, 'EduCore_Students')}
                disabled={exporting}
                title="Export every student, in the same template used for bulk import"
              >
                <Download size={15} />
                {exporting ? 'Exporting...' : 'Export'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem', fontWeight: 600 }}
                onClick={() => handleOpenBulkUpload(null)}
              >
                <Upload size={15} />
                Import
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 0.9rem', fontWeight: 600 }}
                onClick={() => handleOpenAdd('')}
              >
                <Plus size={16} />
                Add Student
              </button>

            </div>
          </div>

          {/* Stat Overview Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              className="card"
              style={{
                padding: '1.25rem',
                borderLeft: '4px solid var(--primary, #4f46e5)',
                boxShadow: 'var(--shadow-sm)',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--primary, #4f46e5)', lineHeight: 1.1 }}>
                {totalStudents}
              </div>
              <h3 style={{ fontSize: '0.925rem', color: 'var(--text-main)', fontWeight: 600, margin: '0.4rem 0 0.15rem' }}>
                Total Students
              </h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0 }}>
                Across all enrolled classes
              </p>
            </div>

            <div
              className="card"
              style={{
                padding: '1.25rem',
                borderLeft: '4px solid #0284c7',
                boxShadow: 'var(--shadow-sm)',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0284c7', lineHeight: 1.1 }}>
                {filteredClassSummaries.length}
              </div>
              <h3 style={{ fontSize: '0.925rem', color: 'var(--text-main)', fontWeight: 600, margin: '0.4rem 0 0.15rem' }}>
                Active Classes
              </h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0 }}>
                Classes with student enrollment
              </p>
            </div>
          </div>

          {/* Toolbar: Master Search */}
          <div
            className="card"
            style={{
              padding: '0.85rem 1.25rem',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: 'var(--radius-md, 6px)',
              backgroundColor: '#ffffff',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                Classes Overview
              </span>
              {isMasterSearchActive && (
                <span
                  style={{
                    backgroundColor: '#eef2ff',
                    color: '#4338ca',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  Master Search Active
                </span>
              )}
            </div>

            {/* Master Search Input */}
            <div style={{ position: 'relative', flex: '1 1 360px', maxWidth: '480px', minWidth: '260px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #94a3b8)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search by student name, roll no, admission no, or phone..."
                className="form-input"
                style={{
                  paddingLeft: '2.2rem',
                  paddingRight: masterSearch ? '2.2rem' : '0.75rem',
                  fontSize: '0.825rem',
                  height: '36px',
                  width: '100%',
                  borderRadius: 'var(--radius-md, 6px)',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
              />
              {masterSearch && (
                <button
                  type="button"
                  onClick={() => setMasterSearch('')}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    fontSize: '1rem',
                    lineHeight: 1,
                    borderRadius: '50%',
                  }}
                  title="Clear master search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Class / Section Filter */}
            <select
              className="form-select"
              value={masterClassFilter}
              onChange={(e) => setMasterClassFilter(e.target.value)}
              style={{ height: '36px', fontSize: '0.825rem', minWidth: '140px' }}
            >
              <option value="">All Classes</option>
              {CLASS_CONFIG.map((c) => (
                <option key={c.internalValue} value={c.internalValue}>{c.displayLabel}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Section"
              className="form-input"
              value={masterSectionFilter}
              onChange={(e) => setMasterSectionFilter(e.target.value)}
              style={{ height: '36px', fontSize: '0.825rem', width: '100px' }}
            />
          </div>

          {/* ========================================================================= */}
          {/* 1A. MASTER SEARCH RESULTS (Shown when masterSearch query or filter is active) */}
          {/* ========================================================================= */}
          {isMasterSearchActive ? (
            <div
              className="card"
              style={{
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-md, 6px)',
                backgroundColor: '#ffffff',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                    Master Search Results
                  </div>
                  <span
                    style={{
                      backgroundColor: '#eef2ff',
                      color: '#4338ca',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    {filteredMasterStudents.length} student{filteredMasterStudents.length === 1 ? '' : 's'} found
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setMasterSearch('')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    padding: '0.3rem 0.65rem',
                  }}
                >
                  Clear Search
                </button>
              </div>

              {/* If any classes match the query */}
              {matchingClasses.length > 0 && (
                <div
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    flexWrap: 'wrap',
                    fontSize: '0.825rem',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Matching Classes:</span>
                  {matchingClasses.map((c) => (
                    <button
                      key={c.className}
                      type="button"
                      onClick={() => handleOpenClassDetails(c.className)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '4px',
                        backgroundColor: '#eef2ff',
                        color: '#3730a3',
                        border: '1px solid #c7d2fe',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {c.className} ({c.studentCount} students) <ChevronRight size={13} />
                    </button>
                  ))}
                </div>
              )}

              <div className="table-responsive">
                <table className="table" style={{ margin: 0 }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Admission No</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class & Section</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Parent Contact</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMasterSearch ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <RotateCcw size={22} className="animate-spin text-primary" />
                            <span style={{ fontSize: '0.9rem' }}>Searching all students for &quot;{masterSearch}&quot;...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredMasterStudents.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                            <Search size={32} style={{ opacity: 0.35, color: 'var(--text-muted)', marginBottom: '0.25rem' }} />
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                              No students found
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '460px', lineHeight: 1.45 }}>
                              No student records matched &quot;{masterSearch}&quot;. Try searching with a different student name, roll number, admission number, or phone number.
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ marginTop: '0.5rem' }}
                              onClick={() => setMasterSearch('')}
                            >
                              Reset to Classes Overview
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredMasterStudents.map((s) => (
                        <tr
                          key={s.id}
                          style={{ transition: 'background-color 0.12s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {s.admissionNumber || s.rollNumber}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {s.dateOfBirth ? `DOB: ${s.dateOfBirth}` : ''} {s.gender ? `• ${s.gender}` : ''}
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenClassDetails(s.className)}
                              title={`Open ${toDisplayClassName(s.className)} records`}
                              style={{
                                backgroundColor: '#eef2ff',
                                color: '#3730a3',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              {toDisplayClassName(s.className)}{s.section ? ` - ${s.section}` : ''}
                              <ChevronRight size={13} />
                            </button>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontSize: '0.8125rem', lineHeight: '1.45' }}>
                              <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                                {s.fatherName || s.guardianName || 'Parent'}
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {s.fatherMobileNumber || s.contactNumber || s.guardianMobileNumber || '—'}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className={`badge ${s.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                              {s.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => setViewingStudent(s)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.35rem 0.55rem' }}
                                title="View student profile"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(s)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.35rem 0.55rem' }}
                                title="Edit student profile"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(s)}
                                className="btn btn-danger btn-sm"
                                style={{ padding: '0.35rem 0.55rem' }}
                                title="Delete student"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {masterPagination.total > 0 && masterPagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-subtle, #e2e8f0)', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Showing {(masterPagination.page - 1) * masterPagination.pageSize + 1}–{Math.min(masterPagination.page * masterPagination.pageSize, masterPagination.total)} of {masterPagination.total} matching students across all classes
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={masterPagination.page <= 1}
                      onClick={() => handleMasterSearch(masterSearch, masterPagination.page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={masterPagination.page >= masterPagination.totalPages}
                      onClick={() => handleMasterSearch(masterSearch, masterPagination.page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* 1B. DEFAULT: CLASS STUDENT SUMMARY TABLE                                  */
            /* ========================================================================= */
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
                  Class Student Summary
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {loadingSummaries ? (
                    <span style={{ fontStyle: 'italic' }}>Loading...</span>
                  ) : (
                    `Showing ${filteredClassSummaries.length} classes in academic order`
                  )}
                </div>
              </div>

              <div className="table-responsive">
                <table className="table" style={{ margin: 0 }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', width: '70px', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>#</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Students</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '160px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingSummaries ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <RotateCcw size={22} className="animate-spin text-primary" />
                            <span style={{ fontSize: '0.9rem' }}>Loading class student summaries...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredClassSummaries.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={32} style={{ opacity: 0.35 }} />
                            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                              No student records found
                            </span>
                            <span style={{ fontSize: '0.825rem' }}>
                              {classSummaries.length === 0
                                ? 'No classes with enrolled students currently exist.'
                                : 'No classes match your search query.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredClassSummaries.map((item, idx) => (
                        <tr
                          key={item.className || idx}
                          style={{ transition: 'background-color 0.12s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            <span
                              style={{
                                backgroundColor: '#eef2ff',
                                color: '#3730a3',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                              }}
                            >
                              {toDisplayClassName(item.className)}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            {item.studentCount}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{
                                padding: '0.3rem 0.75rem',
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: 600,
                                color: 'var(--primary)',
                              }}
                              onClick={() => handleOpenClassDetails(item.className)}
                            >
                              View <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLASS-SPECIFIC STUDENT RECORDS VIEW */}
      {/* ========================================================================= */}
      {view === 'class-details' && (
        <div>
          {/* Compact Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '0.45rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={handleBackToSummary}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary, #4f46e5)',
                cursor: 'pointer',
                padding: 0,
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Students
            </button>
            <span style={{ color: 'var(--text-muted, #94a3b8)', fontWeight: 400, opacity: 0.6 }}>/</span>
            <button
              type="button"
              onClick={handleBackToSummary}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary, #4f46e5)',
                cursor: 'pointer',
                padding: 0,
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Student Directory
            </button>
            <span style={{ color: 'var(--text-muted, #94a3b8)', fontWeight: 400, opacity: 0.6 }}>/</span>
            <span style={{ color: 'var(--text-main, #0f172a)', fontWeight: 700 }}>
              {toDisplayClassName(selectedClass)}
            </span>
          </div>

          {/* Consistent, Compact Back to Summary Button */}
          <div style={{ marginBottom: '0.65rem' }}>
            <button
              type="button"
              onClick={handleBackToSummary}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                height: '32px',
                padding: '0 0.75rem',
                fontSize: '0.825rem',
                fontWeight: 500,
                borderRadius: 'var(--radius-md, 6px)',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                color: 'var(--text-main, #334155)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.04))',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = 'var(--border-subtle, #e2e8f0)';
              }}
            >
              <ArrowLeft size={14} /> Back to Summary
            </button>
          </div>

          {/* Page Title & Subtitle */}
          <div style={{ marginBottom: '1rem' }}>
            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                margin: 0,
                color: 'var(--text-main, #0f172a)',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
              }}
            >
              {toDisplayClassName(selectedClass)} — Student Records
            </h1>
            <p
              style={{
                color: 'var(--text-muted, #64748b)',
                fontSize: '0.875rem',
                margin: '0.25rem 0 0',
                lineHeight: 1.4,
              }}
            >
              Active student directory profiles and contact records for {toDisplayClassName(selectedClass)}.
            </p>
          </div>

          {/* Compact Toolbar: Search + Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Search Box taking most of available width */}
            <div style={{ flex: '1 1 380px', minWidth: '260px', position: 'relative' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #94a3b8)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search by student name, admission no, or parent mobile..."
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  paddingLeft: '2.4rem',
                  paddingRight: classSearch ? '2.4rem' : '0.85rem',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-md, 6px)',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
              {classSearch && (
                <button
                  type="button"
                  onClick={() => setClassSearch('')}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    fontSize: '1rem',
                    lineHeight: 1,
                    borderRadius: '50%',
                  }}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Action & Filter Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '110px', height: '38px', fontSize: '0.825rem' }}
                title="Filter by Section"
              >
                <option value="ALL">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>

              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '110px', height: '38px', fontSize: '0.825rem' }}
                title="Filter by Status"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.825rem',
                  height: '38px',
                  padding: '0 0.85rem',
                }}
                onClick={() => handleExportExcel(selectedClass, `${selectedClass}_Students`)}
                disabled={exporting}
                title="Export this class, in the same template used for bulk import"
              >
                <Download size={14} />
                Export
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.825rem',
                  height: '38px',
                  padding: '0 0.85rem',
                }}
                onClick={() => handleOpenBulkUpload(selectedClass)}
              >
                <Upload size={14} />
                Import
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.825rem',
                  height: '38px',
                  padding: '0 0.95rem',
                  fontWeight: 600,
                }}
                onClick={() => handleOpenAdd(selectedClass)}
              >
                <Plus size={15} />
                Add Student
              </button>
            </div>
          </div>

          {/* Class Students Table */}
          <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-md, 6px)', border: '1px solid var(--border-subtle, #e2e8f0)', boxShadow: 'var(--shadow-sm)' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Admission No</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Section</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Parent</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <RotateCcw size={22} className="animate-spin text-primary" />
                        <span style={{ fontSize: '0.9rem' }}>Fetching {toDisplayClassName(selectedClass)} students...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3.5rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                        <Search size={32} style={{ opacity: 0.35, color: 'var(--text-muted)', marginBottom: '0.25rem' }} />
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                          No students found
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '440px', lineHeight: 1.45 }}>
                          Try adjusting search terms, section or status filters.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr
                      key={s.id}
                      style={{ transition: 'background-color 0.12s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {s.admissionNumber || s.rollNumber}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {s.dateOfBirth ? `DOB: ${s.dateOfBirth}` : ''} {s.gender ? `• ${s.gender}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="badge badge-primary">
                          {toDisplayClassName(s.className)}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 500 }}>
                        {s.section || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.8125rem' }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {s.fatherName || s.guardianName || 'Parent'}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {s.fatherMobileNumber || s.contactNumber || s.guardianMobileNumber || '—'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${s.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                          {s.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => setViewingStudent(s)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.55rem' }}
                            title="View student profile"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.55rem' }}
                            title="Edit student profile"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(s)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.35rem 0.55rem' }}
                            title="Delete student"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {classSearch && classSearch.trim()
                  ? `Showing ${filteredStudents.length} matching students in ${selectedClass}`
                  : `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} students in ${selectedClass}`}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadStudentsForClass(selectedClass, classSearch, pagination.page - 1)}
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum = pagination.page;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      className={`btn btn-sm ${pageNum === pagination.page ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => loadStudentsForClass(selectedClass, classSearch, pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadStudentsForClass(selectedClass, classSearch, pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODALS (Add/Edit Student, Bulk Upload, Delete Confirmation) */}
      {/* ========================================================================= */}

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Student Profile' : (selectedClass ? `Add Individual Student — ${selectedClass}` : 'Add Student')}
        icon={editingStudent ? Edit2 : Users}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="studentForm" className="btn btn-primary">
              {editingStudent ? 'Save Changes' : 'Add Student'}
            </button>
          </>
        }
      >
        <form id="studentForm" onSubmit={handleFormSubmit}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)' }}>
            Student Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Adm No *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="Enter admission number"
                value={formData.admNo}
                onChange={(e) => setFormData({ ...formData, admNo: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="Enter student name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Class *</label>
              {editingStudent ? (
                (() => {
                  const availableClasses = getAvailableEditClasses(editingStudent.className);

                  return (
                    <div>
                      <select
                        className="form-input"
                        required
                        value={formData.className}
                        onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                        style={{ width: '100%', cursor: 'pointer' }}
                      >
                        <option value="" disabled>Select Class</option>
                        {availableClasses.map((c) => (
                          <option key={c.internalValue} value={c.internalValue}>
                            {c.displayLabel}
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                        Current class: <strong>{toDisplayClassName(editingStudent.className)}</strong>. Allowed: current class and higher classes.
                      </div>
                    </div>
                  );
                })()
              ) : (
                <select
                  className="form-input"
                  required
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <option value="" disabled>Select Class</option>
                  {CLASS_CONFIG.map((c) => (
                    <option key={c.internalValue} value={c.internalValue}>
                      {c.displayLabel}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter section (e.g. A, B)"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">DOB</label>
              <input
                type="date"
                className="form-input"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-input"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />

          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)' }}>
            Parent / Guardian Information
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Father Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter father's name"
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Father Mobile Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter father's mobile number"
                value={formData.fatherMobileNumber}
                onChange={(e) => setFormData({ ...formData, fatherMobileNumber: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Mother Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter mother's name"
                value={formData.motherName}
                onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mother Mobile Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter mother's mobile number"
                value={formData.motherMobileNumber}
                onChange={(e) => setFormData({ ...formData, motherMobileNumber: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Guardian Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter guardian's name"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Guardian Mobile Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter guardian's mobile number"
                value={formData.guardianMobileNumber}
                onChange={(e) => setFormData({ ...formData, guardianMobileNumber: e.target.value })}
              />
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
            At least one parent or guardian name is required.
          </p>

          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />

          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)' }}>
            Additional Information
          </h3>

          <div className="form-group">
            <label className="form-label">Photo (optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {formData.photo ? (
                <img
                  src={formData.photo}
                  alt="Student preview"
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-secondary, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  No photo
                </div>
              )}
              <input type="file" accept="image/*" className="form-input" onChange={handlePhotoSelect} style={{ flex: 1 }} />
              {formData.photo && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormData({ ...formData, photo: '' })}>
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea
              className="form-input"
              rows="2"
              placeholder="Enter residential address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select
                className="form-input"
                value={manualBloodGroup ? 'OTHER' : formData.bloodGroup}
                onChange={(e) => {
                  if (e.target.value === 'OTHER') {
                    setManualBloodGroup(true);
                    setFormData({ ...formData, bloodGroup: '' });
                  } else {
                    setManualBloodGroup(false);
                    setFormData({ ...formData, bloodGroup: e.target.value });
                  }
                }}
              >
                <option value="">Select blood group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="OTHER">Other (specify)</option>
              </select>
              {manualBloodGroup && (
                <input
                  type="text"
                  className="form-input"
                  style={{ marginTop: '0.5rem' }}
                  placeholder="Enter blood group"
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Joining Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              />
            </div>
          </div>

          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />

          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)' }}>
            Parent Login Credentials
          </h3>

          <div className="form-group">
            <label className="form-label">Parent Login Phone Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter parent login phone number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showModalPassword ? 'text' : 'password'}
                className="form-input"
                placeholder={editingStudent ? 'Enter parent login password (leave empty to keep current)' : 'Enter parent login password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowModalPassword(!showModalPassword)}
                style={{
                  position: 'absolute',
                  right: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={showModalPassword ? 'Hide password' : 'Show password'}
              >
                {showModalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Bulk Upload Students Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          if (view === 'class-details' && selectedClass) {
            loadStudentsForClass(selectedClass, classSearch, pagination.page);
          }
          if (masterSearch) {
            handleMasterSearch(masterSearch, 1);
          }
          loadClassSummaries();
        }}
        targetClass={bulkModalTargetClass}
      />

      {/* Confirm Delete Modal */}
      {deleteModal.isOpen && deleteModal.student && (
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => !deleteModal.loading && setDeleteModal({ isOpen: false, student: null, loading: false })}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger, #ef4444)' }}>
              <AlertTriangle size={20} />
              Delete Student
            </div>
          }
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModal({ isOpen: false, student: null, loading: false })}
                disabled={deleteModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleteModal.loading}
              >
                {deleteModal.loading ? 'Deleting...' : 'Delete Student'}
              </button>
            </>
          }
        >
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1rem' }}>
              Are you sure you want to delete student &quot;{deleteModal.student.name}&quot; ({deleteModal.student.admissionNumber})?
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              This will permanently remove the student record from the directory.
            </p>
          </div>
        </Modal>
      )}

      {/* View Student Profile Modal */}
      {viewingStudent && (
        <Modal
          isOpen={!!viewingStudent}
          onClose={() => setViewingStudent(null)}
          title={`Student Profile — ${viewingStudent.name || 'Details'}`}
          maxWidth="640px"
          footer={
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingStudent(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const s = viewingStudent;
                  setViewingStudent(null);
                  handleOpenEdit(s);
                }}
              >
                <Edit2 size={14} /> Edit Student
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
              {viewingStudent.photo ? (
                <img
                  src={viewingStudent.photo}
                  alt={viewingStudent.name}
                  style={{ width: '46px', height: '46px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--primary-border)' }}
                />
              ) : (
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    border: '1px solid var(--primary-border)',
                  }}
                >
                  {(viewingStudent.name?.[0] || 'S').toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{viewingStudent.name}</h4>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Admission #{viewingStudent.admissionNumber || viewingStudent.rollNumber || 'N/A'} • {toDisplayClassName(viewingStudent.className)} {viewingStudent.section ? `(${viewingStudent.section})` : ''}
                </div>
              </div>
              <span className={`badge ${viewingStudent.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                {viewingStudent.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Date of Birth</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{viewingStudent.dateOfBirth || '—'}</div>
              </div>
              <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Gender</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{viewingStudent.gender || '—'}</div>
              </div>
              <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Blood Group</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{viewingStudent.bloodGroup || '—'}</div>
              </div>
              <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Joining Date</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{viewingStudent.joiningDate || '—'}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Parent & Emergency Contacts
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Father Name & Mobile</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{viewingStudent.fatherName || '—'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{viewingStudent.fatherMobileNumber || '—'}</div>
                </div>
                <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Mother Name & Mobile</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{viewingStudent.motherName || '—'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{viewingStudent.motherMobileNumber || '—'}</div>
                </div>
                {viewingStudent.guardianName && (
                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Guardian Name & Mobile</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{viewingStudent.guardianName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{viewingStudent.guardianMobileNumber || '—'}</div>
                  </div>
                )}
              </div>
            </div>

            {viewingStudent.address && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Residential Address</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px' }}>{viewingStudent.address}</div>
              </div>
            )}

            {/* Parent Portal Login */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Parent Portal Login
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                padding: '0.65rem 0.85rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)',
              }}>
                <div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Login Mobile Number</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {viewingStudent.phoneNumber || 'Not set'}
                    <span className={`badge ${viewingStudent.hasParentLogin ? 'badge-success' : 'badge-secondary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {viewingStudent.hasParentLogin ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
                      {viewingStudent.hasParentLogin ? 'Password Set' : 'No Password'}
                    </span>
                  </div>
                </div>
                {!showResetPassword && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowResetPassword(true)}>
                    <KeyRound size={13} /> {viewingStudent.hasParentLogin ? 'Reset Password' : 'Set Password'}
                  </button>
                )}
              </div>

              {showResetPassword && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', alignItems: 'flex-start' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="New password (min. 4 characters)"
                    value={newParentPassword}
                    onChange={(e) => setNewParentPassword(e.target.value)}
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleResetParentPassword} disabled={resettingPassword}>
                    {resettingPassword ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setShowResetPassword(false); setNewParentPassword(''); }}>
                    Cancel
                  </button>
                </div>
              )}
              {justSetPassword && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                  marginTop: '0.6rem', padding: '0.6rem 0.85rem', background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: 'var(--radius-sm)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>New password — note it down now, it can't be looked up again later</div>
                    <code style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{justSetPassword}</code>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (!navigator.clipboard) {
                        addToast('Clipboard access not available — please copy it manually.', 'warning');
                        return;
                      }
                      navigator.clipboard.writeText(justSetPassword)
                        .then(() => addToast('Password copied to clipboard.', 'success'))
                        .catch(() => addToast('Could not copy automatically — please copy it manually.', 'warning'));
                    }}
                  >
                    <Copy size={13} /> Copy
                  </button>
                </div>
              )}
              {!viewingStudent.phoneNumber && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  No mobile number is set for this student — add one via Edit Student before setting a password.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
