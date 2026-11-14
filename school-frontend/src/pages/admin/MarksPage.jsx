import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { marksService } from '../../services/marksService';
import { studentService } from '../../services/studentService';
import { Modal } from '../../components/common/Modal';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import {
  Award,
  Upload,
  Download,
  Filter,
  Save,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  BookOpen,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  ChevronDown
} from 'lucide-react';
import { CLASS_CONFIG, toDisplayClassName, compareAcademicClasses } from '../../utils/academicClassOrder';

const BULK_SUBJECTS_STORAGE_KEY = 'marks.bulkTemplateSubjectIds';

export const MarksPage = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { addToast } = useToast();

  // Primary navigation tabs: 'entry' | 'view' | 'bulk' | 'config'
  const [activeTab, setActiveTab] = useState('entry');

  // Master Data
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Tab 1: Marks Entry State
  const [entryClass, setEntryClass] = useState('');
  const [entrySection, setEntrySection] = useState('');
  const [entrySectionOptions, setEntrySectionOptions] = useState([]);
  const [entryExam, setEntryExam] = useState('');
  const [entrySubject, setEntrySubject] = useState('');
  const [entryMaxMarks, setEntryMaxMarks] = useState(100);
  const [studentsForEntry, setStudentsForEntry] = useState([]);
  const [marksEntryMap, setMarksEntryMap] = useState({}); // { [studentId]: { marksObtained: '', grade: '', remarks: '' } }
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentFetchError, setStudentFetchError] = useState(null);
  const [savingBatch, setSavingBatch] = useState(false);

  // Tab 2: Marks View State
  const [viewClass, setViewClass] = useState('');
  const [viewSection, setViewSection] = useState('');
  const [viewSectionOptions, setViewSectionOptions] = useState([]);
  const [viewExam, setViewExam] = useState('');
  const [viewSubject, setViewSubject] = useState('');
  const [viewSearchQuery, setViewSearchQuery] = useState('');
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Edit Single Mark Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMark, setEditingMark] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Tab 3: Bulk Upload State
  const [bulkClass, setBulkClass] = useState(''); // '' = all classes
  const [bulkExam, setBulkExam] = useState('');
  const [bulkSubjectIds, setBulkSubjectIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(BULK_SUBJECTS_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Tab 4: Config Modal (Admin only)
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', examDate: new Date().toISOString().split('T')[0], totalMarks: 100 });
  const [editingExam, setEditingExam] = useState(null); // null when adding, Exam object when editing
  const [savingExam, setSavingExam] = useState(false);

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' });
  const [editingSubject, setEditingSubject] = useState(null); // null when adding, Subject object when editing
  const [savingSubject, setSavingSubject] = useState(false);

  // Confirmation Modal for Deleting Subject or Exam
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    type: null, // 'subject' | 'exam'
    item: null,
    title: '',
    message: '',
  });
  const [deletingItem, setDeletingItem] = useState(false);


  // Grade helper
  const calculateGrade = (score, max = 100) => {
    if (score === '' || score === null || score === undefined || isNaN(score)) return '';
    const pct = (Number(score) / Number(max)) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 35) return 'D';
    return 'F';
  };

  // Class & Section normalization helpers for robust matching
  const normalizeClass = (cls) => {
    if (!cls) return '';
    return String(cls).trim().replace(/^class\s*/i, '').trim().toLowerCase();
  };

  const normalizeSection = (sec) => {
    if (!sec) return '';
    return String(sec).trim().replace(/^section\s*/i, '').trim().toUpperCase();
  };

  // Sections are free-text per class (e.g. LKG uses "Lily", "Rose"; other classes use "A"/"B"),
  // so the dropdown must reflect whatever is actually stored for that class, not a fixed A-D list.
  const fetchSectionsForClass = async (className) => {
    if (!className) return [];
    try {
      const res = await studentService.getActiveStudentsByClass(className);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      const sections = [...new Set(
        list.map((s) => (s.section || '').trim()).filter(Boolean)
      )];
      sections.sort((a, b) => a.localeCompare(b));
      return sections;
    } catch (err) {
      console.error('Error fetching sections for class', className, err);
      return [];
    }
  };

  // Load master data on mount
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setLoadingMaster(true);
      const [clsRes, exRes, subRes] = await Promise.allSettled([
        studentService.getDistinctClasses(),
        marksService.getExams(),
        marksService.getSubjects(),
      ]);

      let classList = [];
      const rawClasses = clsRes.status === 'fulfilled' ? (clsRes.value?.data || clsRes.value || []) : [];
      if (Array.isArray(rawClasses)) {
        classList = rawClasses.filter(Boolean);
      } else if (Array.isArray(rawClasses?.data)) {
        classList = rawClasses.data.filter(Boolean);
      }
      if (classList.length === 0) {
        classList = CLASS_CONFIG.map((c) => c.internalValue);
      }
      classList = [...classList].sort(compareAcademicClasses);
      setClasses(classList);

      let examList = [];
      const rawExams = exRes.status === 'fulfilled' ? (exRes.value?.data || exRes.value || []) : [];
      if (Array.isArray(rawExams)) {
        examList = rawExams;
      } else if (Array.isArray(rawExams?.data)) {
        examList = rawExams.data;
      }
      setExams(examList);

      let subList = [];
      const rawSubs = subRes.status === 'fulfilled' ? (subRes.value?.data || subRes.value || []) : [];
      if (Array.isArray(rawSubs)) {
        subList = rawSubs;
      } else if (Array.isArray(rawSubs?.data)) {
        subList = rawSubs.data;
      }
      setSubjects(subList);

      // Default selections
      if (classList.length > 0 && !entryClass) setEntryClass(classList[0]);
      if (examList.length > 0 && !entryExam) setEntryExam(examList[0].name);
      if (subList.length > 0 && !entrySubject) setEntrySubject(subList[0].name);
    } catch (err) {
      console.error('Error loading master data:', err);
      addToast('Failed to load classes or exams', 'error');
    } finally {
      setLoadingMaster(false);
    }
  };

  // Whenever the entry class changes, reload that class's real section list and
  // re-point entrySection at a section that actually exists for it.
  useEffect(() => {
    if (!entryClass) {
      setEntrySectionOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const sections = await fetchSectionsForClass(entryClass);
      if (cancelled) return;
      setEntrySectionOptions(sections);
      setEntrySection((prev) => (sections.includes(prev) ? prev : (sections[0] || '')));
    })();
    return () => { cancelled = true; };
  }, [entryClass]);

  // Same for the view tab's section filter.
  useEffect(() => {
    if (!viewClass) {
      setViewSectionOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const sections = await fetchSectionsForClass(viewClass);
      if (cancelled) return;
      setViewSectionOptions(sections);
      setViewSection((prev) => (sections.includes(prev) ? prev : ''));
    })();
    return () => { cancelled = true; };
  }, [viewClass]);

  // Whenever entry filters change, fetch students and any existing marks for them
  useEffect(() => {
    if (activeTab === 'entry' && entryClass) {
      fetchStudentsForEntry();
    }
  }, [activeTab, entryClass, entrySection, entryExam, entrySubject]);

  const fetchStudentsForEntry = async () => {
    if (!entryClass) return;
    try {
      setLoadingStudents(true);
      setStudentFetchError(null);

      const stuRes = await studentService.getAllStudents({ page: 1, pageSize: 10000, status: 'Active' });

      let rawStudents = [];
      if (Array.isArray(stuRes)) {
        rawStudents = stuRes;
      } else if (Array.isArray(stuRes?.data?.data)) {
        rawStudents = stuRes.data.data;
      } else if (Array.isArray(stuRes?.data)) {
        rawStudents = stuRes.data;
      } else if (Array.isArray(stuRes?.students)) {
        rawStudents = stuRes.students;
      }

      if (!Array.isArray(rawStudents)) {
        throw new Error('Invalid response structure: student list is not an array.');
      }

      const targetClassNorm = normalizeClass(entryClass);
      const targetSectionNorm = normalizeSection(entrySection);

      const studentList = rawStudents.filter(s => {
        // Active students only
        if (s.isActive === false) return false;

        // Class matching
        if (targetClassNorm) {
          const sClassNorm = normalizeClass(s.className);
          if (sClassNorm !== targetClassNorm) return false;
        }

        // Section matching
        if (targetSectionNorm) {
          const sSecNorm = normalizeSection(s.section);
          if (sSecNorm && sSecNorm !== targetSectionNorm) return false;
        }

        return true;
      });

      setStudentsForEntry(studentList);

      // Also check if marks already exist for this class, section, exam, subject to prepopulate
      let existingMarks = [];
      if (entryExam && entrySubject) {
        try {
          const marksRes = await marksService.getMarks({
            className: entryClass,
            section: entrySection,
            examName: entryExam,
            subjectName: entrySubject,
          });
          if (Array.isArray(marksRes)) {
            existingMarks = marksRes;
          } else if (Array.isArray(marksRes?.data?.data)) {
            existingMarks = marksRes.data.data;
          } else if (Array.isArray(marksRes?.data)) {
            existingMarks = marksRes.data;
          }
        } catch (e) {
          console.warn('Could not fetch existing marks for prepopulate:', e);
        }
      }

      const initialMap = {};
      studentList.forEach(s => {
        const found = Array.isArray(existingMarks) ? existingMarks.find(m => 
          (m.studentId && String(m.studentId) === String(s.id)) ||
          (m.admissionNumber && s.admissionNumber && String(m.admissionNumber).trim().toLowerCase() === String(s.admissionNumber).trim().toLowerCase())
        ) : null;

        if (found) {
          initialMap[s.id] = {
            id: found.id,
            marksObtained: found.marksObtained !== null && found.marksObtained !== undefined ? found.marksObtained : '',
            maxMarks: found.maxMarks || entryMaxMarks || 100,
            grade: found.grade || calculateGrade(found.marksObtained, found.maxMarks || entryMaxMarks || 100),
            remarks: found.remarks || '',
          };
        } else {
          initialMap[s.id] = {
            id: null,
            marksObtained: '',
            maxMarks: entryMaxMarks || 100,
            grade: '',
            remarks: '',
          };
        }
      });
      setMarksEntryMap(initialMap);
    } catch (err) {
      console.error('Error fetching students for entry:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load students for entry';
      setStudentFetchError(msg);
      addToast(msg, 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleMarkChange = (studentId, value) => {
    const num = value === '' ? '' : Number(value);
    const max = entryMaxMarks || 100;
    const grade = calculateGrade(num, max);
    setMarksEntryMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marksObtained: value,
        grade,
      }
    }));
  };

  const handleRemarksChange = (studentId, value) => {
    setMarksEntryMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: value,
      }
    }));
  };

  const handleSaveBatchMarks = async () => {
    if (!entryClass || !entryExam || !entrySubject) {
      addToast('Please select Class, Exam, and Subject before saving', 'warning');
      return;
    }

    const marksToSave = [];
    for (const s of studentsForEntry) {
      const entry = marksEntryMap[s.id];
      if (entry && entry.marksObtained !== '' && entry.marksObtained !== null && entry.marksObtained !== undefined) {
        const numVal = Number(entry.marksObtained);
        if (numVal < 0 || numVal > (entryMaxMarks || 100)) {
          addToast(`Invalid mark ${numVal} for ${s.name}. Must be between 0 and ${entryMaxMarks}.`, 'error');
          return;
        }
        marksToSave.push({
          id: entry.id || null,
          studentId: s.id,
          admissionNumber: s.admissionNumber,
          studentName: s.name,
          className: s.className || entryClass,
          section: s.section || entrySection,
          examName: entryExam,
          subjectName: entrySubject,
          marksObtained: numVal,
          maxMarks: Number(entryMaxMarks) || 100,
          grade: entry.grade || calculateGrade(numVal, entryMaxMarks || 100),
          remarks: entry.remarks || '',
        });
      }
    }

    if (marksToSave.length === 0) {
      addToast('No marks entered to save.', 'warning');
      return;
    }

    try {
      setSavingBatch(true);
      await marksService.saveBatchMarks({
        className: entryClass,
        section: entrySection,
        examName: entryExam,
        subjectName: entrySubject,
        maxMarks: Number(entryMaxMarks) || 100,
        marks: marksToSave,
      });
      addToast(`Successfully saved marks for ${marksToSave.length} student(s)!`, 'success');
      // Refresh to update IDs
      fetchStudentsForEntry();
    } catch (err) {
      console.error('Error saving batch marks:', err);
      addToast(err.response?.data?.message || 'Failed to save marks', 'error');
    } finally {
      setSavingBatch(false);
    }
  };

  // Tab 2: Search/Filter Records
  const handleFetchRecords = async () => {
    try {
      setLoadingRecords(true);
      const res = await marksService.getMarks({
        className: viewClass || undefined,
        section: viewSection || undefined,
        examName: viewExam || undefined,
        subjectName: viewSubject || undefined,
      });
      setRecords(res?.data || []);
    } catch (err) {
      console.error('Error searching marks:', err);
      addToast('Failed to fetch marks records', 'error');
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'view') {
      handleFetchRecords();
    }
  }, [activeTab, viewClass, viewSection, viewExam, viewSubject]);

  // Edit Single Mark Modal Handlers
  const handleOpenEditModal = (mark) => {
    setEditingMark({
      id: mark.id,
      studentId: mark.studentId,
      admissionNumber: mark.admissionNumber,
      studentName: mark.studentName,
      className: mark.className,
      section: mark.section,
      examName: mark.examName,
      subjectName: mark.subjectName,
      marksObtained: mark.marksObtained,
      maxMarks: mark.maxMarks || 100,
      remarks: mark.remarks || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEditedMark = async (e) => {
    e.preventDefault();
    if (!editingMark) return;
    const num = Number(editingMark.marksObtained);
    const max = Number(editingMark.maxMarks) || 100;
    if (isNaN(num) || num < 0 || num > max) {
      addToast(`Marks must be between 0 and ${max}`, 'error');
      return;
    }

    try {
      setSavingEdit(true);
      await marksService.updateMark(editingMark.id, {
        marksObtained: num,
        maxMarks: max,
        remarks: editingMark.remarks,
      });
      addToast(`Updated marks for ${editingMark.studentName} successfully!`, 'success');
      setEditModalOpen(false);
      setEditingMark(null);
      handleFetchRecords();
    } catch (err) {
      console.error('Error updating mark:', err);
      addToast(err.response?.data?.message || 'Failed to update mark', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMark = async (id, studentName) => {
    if (!window.confirm(`Are you sure you want to delete mark record for ${studentName || 'this student'}?`)) {
      return;
    }
    try {
      await marksService.deleteMark(id);
      addToast('Mark record deleted', 'success');
      handleFetchRecords();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete mark record', 'error');
    }
  };

  // Tab 3: Bulk Upload Handlers
  // Subject columns of the template, kept in the Subjects master order
  const bulkSubjects = subjects.filter(sub => bulkSubjectIds.includes(sub.id));

  const toggleBulkSubject = (subjectId) => {
    setBulkSubjectIds(prev => {
      const next = prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId];
      try {
        localStorage.setItem(BULK_SUBJECTS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // remembering the selection is a convenience only
      }
      return next;
    });
  };

  const handleDownloadTemplate = async () => {
    if (bulkSubjects.length === 0) {
      addToast('Select at least one subject for the template', 'warning');
      return;
    }
    try {
      setDownloadingTemplate(true);
      const response = await marksService.downloadTemplate({
        className: bulkClass,
        subjectIds: bulkSubjects.map(sub => sub.id),
        examName: bulkExam,
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const classPart = bulkClass ? toDisplayClassName(bulkClass).replace(/\s+/g, '_') : 'All_Classes';
      link.setAttribute('download', `Mark_${classPart}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Template downloaded successfully!', 'success');
    } catch (err) {
      console.error('Download template error:', err);
      addToast('Failed to download template', 'error');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast('Please select an Excel file (.xlsx or .xls) to upload', 'warning');
      return;
    }
    if (!bulkExam) {
      addToast('Please select the exam these marks belong to', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploading(true);
      setUploadResult(null);
      const res = await marksService.bulkUpload(formData, { examName: bulkExam });
      setUploadResult(res?.data || null);
      if (res?.data?.successfulRows > 0 || res?.data?.updatedRows > 0) {
        addToast(`Upload processed! Marks added: ${res.data.successfulRows}, updated: ${res.data.updatedRows}`, 'success');
      } else if (res?.data?.failedRows > 0) {
        addToast('Upload finished with errors. Please check the report below.', 'warning');
      } else {
        addToast('No marks found in the sheet.', 'warning');
      }
    } catch (err) {
      console.error('Bulk upload error:', err);
      addToast(err.response?.data?.message || 'Bulk upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!uploadResult?.errors || uploadResult.errors.length === 0) return;
    const headers = ['Row', 'Student Name', 'Mobile', 'Class', 'Subject', 'Exam', 'Issue', 'Details'];
    const rows = uploadResult.errors.map(err => [
      err.rowNumber,
      `"${(err.studentName || '').replace(/"/g, '""')}"`,
      `"${(err.mobile || '').replace(/"/g, '""')}"`,
      `"${(err.className || '').replace(/"/g, '""')}"`,
      `"${(err.subjectName || '').replace(/"/g, '""')}"`,
      `"${(err.examName || '').replace(/"/g, '""')}"`,
      `"${(err.issue || '').replace(/"/g, '""')}"`,
      `"${(err.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `marks_upload_error_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Tab 4: Config Handlers — Subjects & Exams Management
  const handleOpenAddExam = () => {
    setEditingExam(null);
    setExamForm({ name: '', examDate: new Date().toISOString().split('T')[0], totalMarks: 100 });
    setExamModalOpen(true);
  };

  const handleOpenEditExam = (ex) => {
    setEditingExam(ex);
    setExamForm({
      name: ex.name || '',
      examDate: ex.examDate || new Date().toISOString().split('T')[0],
      totalMarks: ex.totalMarks || 100,
    });
    setExamModalOpen(true);
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    const nameTrimmed = (examForm.name || '').trim();
    if (!nameTrimmed) {
      addToast('Exam Name is required', 'warning');
      return;
    }

    // Frontend duplicate check
    const currentId = editingExam ? editingExam.id : null;
    const duplicate = exams.find(ex => ex.id !== currentId && ex.name && ex.name.trim().toLowerCase() === nameTrimmed.toLowerCase());
    if (duplicate) {
      addToast(`Exam with name "${nameTrimmed}" already exists.`, 'warning');
      return;
    }

    try {
      setSavingExam(true);
      if (editingExam) {
        await marksService.updateExam(editingExam.id, {
          ...editingExam,
          name: nameTrimmed,
          examDate: examForm.examDate,
          totalMarks: Number(examForm.totalMarks) || 100,
        });
        addToast('Exam updated successfully!', 'success');
      } else {
        await marksService.createExam({
          name: nameTrimmed,
          examDate: examForm.examDate,
          totalMarks: Number(examForm.totalMarks) || 100,
        });
        addToast('Exam created successfully!', 'success');
      }
      setExamModalOpen(false);
      setEditingExam(null);
      setExamForm({ name: '', examDate: new Date().toISOString().split('T')[0], totalMarks: 100 });
      loadMasterData();
    } catch (err) {
      console.error('Error saving exam:', err);
      const errorMsg = err.response?.data?.message || (editingExam ? 'Failed to update exam' : 'Failed to create exam');
      addToast(errorMsg, 'error');
    } finally {
      setSavingExam(false);
    }
  };

  const handleOpenDeleteExam = (ex) => {
    setDeleteConfirmModal({
      isOpen: true,
      type: 'exam',
      item: ex,
      title: 'Delete Exam',
      message: 'Are you sure you want to delete this exam?',
    });
  };

  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectForm({ name: '', code: '' });
    setSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (sub) => {
    setEditingSubject(sub);
    setSubjectForm({
      name: sub.name || '',
      code: sub.code || '',
    });
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    const nameTrimmed = (subjectForm.name || '').trim();
    const codeTrimmed = (subjectForm.code || '').trim();

    if (!nameTrimmed) {
      addToast('Subject Name is required', 'warning');
      return;
    }
    if (!codeTrimmed) {
      addToast('Subject Code is required', 'warning');
      return;
    }

    // Frontend duplicate check
    const currentId = editingSubject ? editingSubject.id : null;
    const duplicateName = subjects.find(s => s.id !== currentId && s.name && s.name.trim().toLowerCase() === nameTrimmed.toLowerCase());
    if (duplicateName) {
      addToast(`Subject with name "${nameTrimmed}" already exists.`, 'warning');
      return;
    }
    const duplicateCode = subjects.find(s => s.id !== currentId && s.code && s.code.trim().toLowerCase() === codeTrimmed.toLowerCase());
    if (duplicateCode) {
      addToast(`Subject with code "${codeTrimmed}" already exists.`, 'warning');
      return;
    }

    try {
      setSavingSubject(true);
      if (editingSubject) {
        await marksService.updateSubject(editingSubject.id, {
          ...editingSubject,
          name: nameTrimmed,
          code: codeTrimmed,
        });
        addToast('Subject updated successfully!', 'success');
      } else {
        await marksService.createSubject({
          name: nameTrimmed,
          code: codeTrimmed,
        });
        addToast('Subject created successfully!', 'success');
      }
      setSubjectModalOpen(false);
      setEditingSubject(null);
      setSubjectForm({ name: '', code: '' });
      loadMasterData();
    } catch (err) {
      console.error('Error saving subject:', err);
      const errorMsg = err.response?.data?.message || (editingSubject ? 'Failed to update subject' : 'Failed to create subject');
      addToast(errorMsg, 'error');
    } finally {
      setSavingSubject(false);
    }
  };

  const handleOpenDeleteSubject = (sub) => {
    setDeleteConfirmModal({
      isOpen: true,
      type: 'subject',
      item: sub,
      title: 'Delete Subject',
      message: 'Are you sure you want to delete this subject?',
    });
  };

  const handleConfirmDelete = async () => {
    const { type, item } = deleteConfirmModal;
    if (!item) return;

    try {
      setDeletingItem(true);
      if (type === 'subject') {
        await marksService.deleteSubject(item.id);
        addToast('Subject deleted successfully!', 'success');
      } else if (type === 'exam') {
        await marksService.deleteExam(item.id);
        addToast('Exam deleted successfully!', 'success');
      }
      setDeleteConfirmModal({ isOpen: false, type: null, item: null, title: '', message: '' });
      loadMasterData();
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      const errorMsg = err.response?.data?.message || `Failed to delete ${type}`;
      addToast(errorMsg, 'error');
      setDeleteConfirmModal({ isOpen: false, type: null, item: null, title: '', message: '' });
    } finally {
      setDeletingItem(false);
    }
  };


  // Filtered records in View tab
  const filteredRecords = records.filter(r => {
    if (!viewSearchQuery) return true;
    const q = viewSearchQuery.toLowerCase();
    return (
      (r.studentName && r.studentName.toLowerCase().includes(q)) ||
      (r.admissionNumber && r.admissionNumber.toLowerCase().includes(q)) ||
      (r.className && r.className.toLowerCase().includes(q)) ||
      (r.subjectName && r.subjectName.toLowerCase().includes(q)) ||
      (r.examName && r.examName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="marks-page" style={{ padding: '0 0.5rem' }}>
      <Breadcrumb items={[{ label: 'Marks Management' }]} />
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Marks Management</h1>
          <p className="page-subtitle">
            Manage subject-wise examination marks and academic results.
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '100%', gap: '0.35rem', background: 'var(--bg-subtle)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'entry' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8125rem', border: 'none', background: activeTab === 'entry' ? 'var(--primary)' : 'transparent', color: activeTab === 'entry' ? '#fff' : 'var(--text-secondary)' }}
            onClick={() => setActiveTab('entry')}
          >
            <Edit size={14} /> Enter Marks
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'view' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8125rem', border: 'none', background: activeTab === 'view' ? 'var(--primary)' : 'transparent', color: activeTab === 'view' ? '#fff' : 'var(--text-secondary)' }}
            onClick={() => setActiveTab('view')}
          >
            <Search size={14} /> Marks View
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'bulk' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8125rem', border: 'none', background: activeTab === 'bulk' ? 'var(--primary)' : 'transparent', color: activeTab === 'bulk' ? '#fff' : 'var(--text-secondary)' }}
            onClick={() => setActiveTab('bulk')}
          >
            <Upload size={14} /> Bulk Upload
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'config' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.8125rem', border: 'none', background: activeTab === 'config' ? 'var(--primary)' : 'transparent', color: activeTab === 'config' ? '#fff' : 'var(--text-secondary)' }}
              onClick={() => setActiveTab('config')}
            >
              <BookOpen size={14} /> Subjects & Exams
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ENTER MARKS */}
      {/* ========================================================================= */}
      {activeTab === 'entry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Class</label>
                <select
                  className="form-control"
                  value={entryClass}
                  onChange={(e) => setEntryClass(e.target.value)}
                >
                  <option value="" disabled>Select Class</option>
                  {classes.map(c => (
                    <option key={c} value={c}>{toDisplayClassName(c)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Section</label>
                <select
                  className="form-control"
                  value={entrySection}
                  onChange={(e) => setEntrySection(e.target.value)}
                  disabled={entrySectionOptions.length === 0}
                >
                  {entrySectionOptions.length === 0 ? (
                    <option value="">No sections found</option>
                  ) : (
                    entrySectionOptions.map((sec) => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Exam</label>
                <select
                  className="form-control"
                  value={entryExam}
                  onChange={(e) => setEntryExam(e.target.value)}
                >
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.name}>{ex.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Subject</label>
                <select
                  className="form-control"
                  value={entrySubject}
                  onChange={(e) => setEntrySubject(e.target.value)}
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.code || 'SUB'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Max Marks</label>
                <input
                  type="number"
                  className="form-control"
                  value={entryMaxMarks}
                  min={1}
                  max={500}
                  onChange={(e) => setEntryMaxMarks(Number(e.target.value))}
                />
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={fetchStudentsForEntry}
                  disabled={loadingStudents}
                >
                  <RefreshCw size={16} className={loadingStudents ? 'spin' : ''} /> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Student Marks Table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>
                  Enter Marks: <span style={{ color: 'var(--primary)' }}>{entryClass} - {entrySection}</span>
                </h3>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Exam: <strong>{entryExam}</strong> | Subject: <strong>{entrySubject}</strong> | Max: <strong>{entryMaxMarks}</strong>
                </span>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveBatchMarks}
                disabled={savingBatch || studentsForEntry.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
              >
                <Save size={16} />
                {savingBatch ? 'Saving Marks...' : 'Save Marks'}
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Roll / Adm No</th>
                    <th>Student Name</th>
                    <th style={{ width: '140px' }}>Marks (Max: {entryMaxMarks})</th>
                    <th style={{ width: '90px' }}>Max Marks</th>
                    <th style={{ width: '90px' }}>Grade</th>
                    <th>Remarks</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStudents ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        Loading students for {entryClass} - {entrySection}...
                      </td>
                    </tr>
                  ) : studentFetchError ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--danger)' }}>
                        Failed to load students: {studentFetchError}
                      </td>
                    </tr>
                  ) : studentsForEntry.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        No active students found in {entryClass} - {entrySection}.
                      </td>
                    </tr>
                  ) : (
                    studentsForEntry.map(student => {
                      const entry = marksEntryMap[student.id] || { marksObtained: '', grade: '', remarks: '' };
                      const hasMark = entry.marksObtained !== '' && entry.marksObtained !== null;
                      return (
                        <tr key={student.id}>
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                              {student.admissionNumber || `ID-${student.id}`}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--text-main)' }}>{student.name}</strong>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              style={{ width: '100px', fontWeight: 700 }}
                              min={0}
                              max={entryMaxMarks}
                              step="any"
                              value={entry.marksObtained}
                              onChange={(e) => handleMarkChange(student.id, e.target.value)}
                              placeholder="0 - 100"
                            />
                          </td>
                          <td>{entryMaxMarks}</td>
                          <td>
                            {entry.grade ? (
                              <span className={`badge ${['A+', 'A'].includes(entry.grade) ? 'badge-success' : ['B+', 'B'].includes(entry.grade) ? 'badge-primary' : entry.grade === 'F' ? 'badge-danger' : 'badge-warning'}`}>
                                {entry.grade}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control"
                              value={entry.remarks || ''}
                              onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                              placeholder="Optional remarks..."
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {entry.id ? (
                              <span className="badge badge-success" title="Saved in database">Saved</span>
                            ) : hasMark ? (
                              <span className="badge badge-warning" title="Unsaved changes">Pending</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unentered</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {studentsForEntry.length > 0 && (
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveBatchMarks}
                  disabled={savingBatch}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  <Save size={16} />
                  {savingBatch ? 'Saving Marks...' : 'Save All Marks'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MARKS VIEW / RECORDS */}
      {/* ========================================================================= */}
      {activeTab === 'view' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filters Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Filter Class</label>
                <select
                  className="form-control"
                  value={viewClass}
                  onChange={(e) => setViewClass(e.target.value)}
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c} value={c}>{toDisplayClassName(c)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Filter Section</label>
                <select
                  className="form-control"
                  value={viewSection}
                  onChange={(e) => setViewSection(e.target.value)}
                >
                  <option value="">All Sections</option>
                  {viewSectionOptions.map((sec) => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Filter Exam</label>
                <select
                  className="form-control"
                  value={viewExam}
                  onChange={(e) => setViewExam(e.target.value)}
                >
                  <option value="">All Exams</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.name}>{ex.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Filter Subject</label>
                <select
                  className="form-control"
                  value={viewSubject}
                  onChange={(e) => setViewSubject(e.target.value)}
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Search Student</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name or Adm No..."
                  value={viewSearchQuery}
                  onChange={(e) => setViewSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={handleFetchRecords}
                  disabled={loadingRecords}
                >
                  <RefreshCw size={16} className={loadingRecords ? 'spin' : ''} /> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                Marks History & Records ({filteredRecords.length} records)
              </h3>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Adm No</th>
                    <th>Student Name</th>
                    <th>Class & Section</th>
                    <th>Exam</th>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Max</th>
                    <th>Grade</th>
                    <th>Remarks</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRecords ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        Loading marks records...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        No marks records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.admissionNumber || `ID-${r.studentId}`}</strong></td>
                        <td>{r.studentName}</td>
                        <td>
                          <span className="badge badge-secondary">
                            {r.className} {r.section ? `- ${r.section}` : ''}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-primary">{r.examName}</span>
                        </td>
                        <td><strong>{r.subjectName}</strong></td>
                        <td>
                          <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>{r.marksObtained}</strong>
                        </td>
                        <td>{r.maxMarks || 100}</td>
                        <td>
                          <span className={`badge ${['A+', 'A'].includes(r.grade) ? 'badge-success' : ['B+', 'B'].includes(r.grade) ? 'badge-primary' : r.grade === 'F' ? 'badge-danger' : 'badge-warning'}`}>
                            {r.grade || '—'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.remarks || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                              onClick={() => handleOpenEditModal(r)}
                              title="Edit Mark"
                            >
                              <Edit size={14} style={{ marginRight: '4px' }} /> Edit
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '0.35rem 0.5rem', color: 'var(--danger)' }}
                                onClick={() => handleDeleteMark(r.id, r.studentName)}
                                title="Delete Record"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BULK UPLOAD */}
      {/* ========================================================================= */}
      {activeTab === 'bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Instructions and Template Options Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
                  Bulk Marks Upload
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  One row per student, one column per subject. Download the mark sheet, fill in the marks, then upload it for the selected exam.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate || bulkSubjects.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
              >
                <Download size={16} />
                {downloadingTemplate ? 'Preparing...' : 'Download Mark Sheet Template'}
              </button>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Exam *</label>
                  <select
                    className="form-control"
                    value={bulkExam}
                    onChange={(e) => setBulkExam(e.target.value)}
                  >
                    <option value="">Select Exam</option>
                    {exams.map(ex => (
                      <option key={ex.id} value={ex.name}>{ex.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Class (for template)</label>
                  <select
                    className="form-control"
                    value={bulkClass}
                    onChange={(e) => setBulkClass(e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {classes.map(c => (
                      <option key={c} value={c}>{toDisplayClassName(c)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                Subjects in the template * ({bulkSubjects.length} selected)
              </label>
              {subjects.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No subjects configured yet. Add subjects in the configuration tab first.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {subjects.map(sub => {
                    const checked = bulkSubjectIds.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 0.75rem',
                          border: `1px solid ${checked ? 'var(--primary)' : 'var(--border-color)'}`,
                          borderRadius: 'var(--radius-md)',
                          background: checked ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBulkSubject(sub.id)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        {sub.name}
                      </label>
                    );
                  })}
                </div>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Each subject gets a marks column and an "A subject" column — enter <strong>A</strong> there if the student was absent. Total, Average and Grade are calculated in the sheet.
              </div>
            </div>

            {/* Upload Drop Zone / File Input */}
            <form onSubmit={handleBulkUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'var(--bg-main)',
                  cursor: 'pointer',
                }}
                onClick={() => document.getElementById('bulk-excel-input').click()}
              >
                <FileSpreadsheet size={42} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  {selectedFile ? selectedFile.name : 'Click to browse Excel spreadsheet (.xlsx, .xls)'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : `Columns: S.No, Mobile, Name, Class, ${bulkSubjects.length ? bulkSubjects.map(sub => sub.name).join(', ') : 'subjects'}, Total, Average, Grade, absent flags`}
                </div>
                <input
                  id="bulk-excel-input"
                  type="file"
                  accept=".xlsx, .xls"
                  style={{ display: 'none' }}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                {selectedFile && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setSelectedFile(null)}
                  >
                    Clear File
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading || !selectedFile || !bulkExam}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                >
                  <Upload size={16} />
                  {uploading ? 'Processing Spreadsheet...' : bulkExam ? `Upload Marks for ${bulkExam}` : 'Select an Exam to Upload'}
                </button>
              </div>
            </form>
          </div>

          {/* Results Summary Card */}
          {uploadResult && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={22} style={{ color: 'var(--success)' }} />
                Upload Processing Summary
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Student Rows</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{uploadResult.totalRows || 0}</div>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', textTransform: 'uppercase', fontWeight: 600 }}>Marks Added</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>{uploadResult.successfulRows || 0}</div>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 600 }}>Marks Updated</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{uploadResult.updatedRows || 0}</div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Blank Rows</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>{uploadResult.skippedRows || 0}</div>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 600 }}>Errors</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)' }}>{uploadResult.failedRows || 0}</div>
                </div>
              </div>

              {/* Error Report Section */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertCircle size={18} />
                      Validation Errors ({uploadResult.errors.length})
                    </h4>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                      onClick={handleDownloadErrorReport}
                    >
                      <Download size={14} style={{ marginRight: '4px' }} /> Download Error Report
                    </button>
                  </div>

                  <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '70px' }}>Row</th>
                          <th>Student</th>
                          <th>Mobile</th>
                          <th>Class</th>
                          <th>Subject</th>
                          <th>Issue</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.errors.map((err, idx) => (
                          <tr key={idx} style={{ background: 'rgba(239, 68, 68, 0.02)' }}>
                            <td><strong>#{err.rowNumber}</strong></td>
                            <td>{err.studentName || '—'}</td>
                            <td>{err.mobile || '—'}</td>
                            <td>{err.className || '—'}</td>
                            <td>{err.subjectName || '—'}</td>
                            <td>
                              <span className="badge badge-danger" style={{ fontWeight: 700 }}>
                                {err.issue}
                              </span>
                            </td>
                            <td style={{ color: 'var(--danger)', fontSize: '0.825rem' }}>
                              {err.details}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SUBJECTS & EXAMS (Admin only) */}
      {/* ========================================================================= */}
      {activeTab === 'config' && isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: '1.5rem' }}>
          {/* Exams Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ margin: 0 }}>School Exams</h3>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={handleOpenAddExam}
              >
                <Plus size={14} /> Add Exam
              </button>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Exam Date</th>
                    <th>Total Marks</th>
                    <th style={{ textAlign: 'right', minWidth: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map(ex => (
                    <tr key={ex.id}>
                      <td><span className="badge badge-primary" style={{ fontWeight: 600 }}>{ex.name}</span></td>
                      <td>{ex.examDate || '—'}</td>
                      <td>{ex.totalMarks || 100}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)' }}
                            onClick={() => handleOpenEditExam(ex)}
                            title="Edit Exam"
                          >
                            <Edit size={13} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444' }}
                            onClick={() => handleOpenDeleteExam(ex)}
                            title="Delete Exam"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {exams.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No exams registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subjects Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ margin: 0 }}>School Subjects</h3>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={handleOpenAddSubject}
              >
                <Plus size={14} /> Add Subject
              </button>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject Name</th>
                    <th>Code</th>
                    <th style={{ textAlign: 'right', minWidth: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(sub => (
                    <tr key={sub.id}>
                      <td><strong>{sub.name}</strong></td>
                      <td><span className="badge badge-secondary">{sub.code || '—'}</span></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)' }}
                            onClick={() => handleOpenEditSubject(sub)}
                            title="Edit Subject"
                          >
                            <Edit size={13} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444' }}
                            onClick={() => handleOpenDeleteSubject(sub)}
                            title="Delete Subject"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {subjects.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No subjects registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT SINGLE MARK */}
      {/* ========================================================================= */}
      {editModalOpen && editingMark && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => { setEditModalOpen(false); setEditingMark(null); }}
          title={`Edit Mark: ${editingMark.studentName}`}
        >
          <form onSubmit={handleSaveEditedMark} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div><strong>Adm No:</strong> {editingMark.admissionNumber || `ID-${editingMark.studentId}`}</div>
              <div><strong>Class:</strong> {editingMark.className} - {editingMark.section}</div>
              <div><strong>Subject:</strong> {editingMark.subjectName}</div>
              <div><strong>Exam:</strong> {editingMark.examName}</div>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600 }}>Marks Obtained *</label>
              <input
                type="number"
                step="any"
                className="form-control"
                required
                min={0}
                max={editingMark.maxMarks || 100}
                value={editingMark.marksObtained}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingMark(prev => ({ ...prev, marksObtained: val }));
                }}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600 }}>Maximum Marks</label>
              <input
                type="number"
                className="form-control"
                value={editingMark.maxMarks || 100}
                onChange={(e) => setEditingMark(prev => ({ ...prev, maxMarks: Number(e.target.value) }))}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600 }}>Remarks</label>
              <input
                type="text"
                className="form-control"
                placeholder="Optional feedback..."
                value={editingMark.remarks || ''}
                onChange={(e) => setEditingMark(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setEditModalOpen(false); setEditingMark(null); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingEdit}
              >
                {savingEdit ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT EXAM (Admin) */}
      {/* ========================================================================= */}
      {examModalOpen && (
        <Modal
          isOpen={examModalOpen}
          onClose={() => { setExamModalOpen(false); setEditingExam(null); }}
          title={editingExam ? 'Edit Exam' : 'Add School Exam'}
        >
          <form onSubmit={handleSaveExam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">Exam Name *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g., Annual Exam, 1st Mid Term"
                value={examForm.name}
                onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Exam Date</label>
              <input
                type="date"
                className="form-control"
                value={examForm.examDate}
                onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Total Marks</label>
              <input
                type="number"
                className="form-control"
                value={examForm.totalMarks}
                onChange={(e) => setExamForm({ ...examForm, totalMarks: Number(e.target.value) })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setExamModalOpen(false); setEditingExam(null); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingExam}
              >
                {savingExam ? (editingExam ? 'Updating...' : 'Creating...') : (editingExam ? 'Update Exam' : 'Create Exam')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SUBJECT (Admin) */}
      {/* ========================================================================= */}
      {subjectModalOpen && (
        <Modal
          isOpen={subjectModalOpen}
          onClose={() => { setSubjectModalOpen(false); setEditingSubject(null); }}
          title={editingSubject ? 'Edit Subject' : 'Add School Subject'}
        >
          <form onSubmit={handleSaveSubject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">Subject Name *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g., Mathematics, Physics, Computer Science"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Subject Code *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g., MATH-101, PHY-101, TAM"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setSubjectModalOpen(false); setEditingSubject(null); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingSubject}
              >
                {savingSubject ? (editingSubject ? 'Updating...' : 'Creating...') : (editingSubject ? 'Update Subject' : 'Create Subject')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM DELETE (Subject or Exam) */}
      {/* ========================================================================= */}
      {deleteConfirmModal.isOpen && (
        <Modal
          isOpen={deleteConfirmModal.isOpen}
          onClose={() => setDeleteConfirmModal({ isOpen: false, type: null, item: null, title: '', message: '' })}
          title={deleteConfirmModal.title}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '50%', color: '#ef4444' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {deleteConfirmModal.message}
                </p>
                {deleteConfirmModal.item && (
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Item: <strong>{deleteConfirmModal.item.name}</strong> {deleteConfirmModal.item.code ? `(${deleteConfirmModal.item.code})` : ''}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deletingItem}
                onClick={() => setDeleteConfirmModal({ isOpen: false, type: null, item: null, title: '', message: '' })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                disabled={deletingItem}
                onClick={handleConfirmDelete}
              >
                <Trash2 size={15} />
                {deletingItem ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default MarksPage;
