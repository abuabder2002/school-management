package com.school.attendance.service;

import com.school.attendance.dto.AttendanceDTO;
import com.school.attendance.entity.Attendance;
import com.school.attendance.entity.Holiday;
import com.school.attendance.entity.LeaveRequest;
import com.school.attendance.repository.AttendanceRepository;
import com.school.attendance.repository.HolidayRepository;
import com.school.attendance.repository.LeaveRequestRepository;
import com.school.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Business logic for Attendance, Holidays, and Leave Requests.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final HolidayRepository holidayRepository;
    private final LeaveRequestRepository leaveRequestRepository;

    // ---- Attendance ----

    public AttendanceDTO markAttendance(AttendanceDTO dto) {
        Attendance attendance = Attendance.builder()
                .studentId(dto.getStudentId())
                .date(dto.getDate())
                .status(dto.getStatus())
                .build();
        Attendance saved = attendanceRepository.save(attendance);
        log.info("Marked attendance for student {} on {}: {}", dto.getStudentId(), dto.getDate(), dto.getStatus());
        return toDTO(saved);
    }

    public List<AttendanceDTO> getAttendanceByStudent(Long studentId) {
        return attendanceRepository.findByStudentId(studentId).stream()
                .map(this::toDTO)
                .toList();
    }

    public AttendanceDTO getTodayAttendance(Long studentId) {
        LocalDate today = LocalDate.now();
        Attendance attendance = attendanceRepository.findByStudentIdAndDate(studentId, today)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Attendance record not found for student " + studentId + " today"));
        return toDTO(attendance);
    }

    public List<AttendanceDTO> getTodayAttendanceAll() {
        LocalDate today = LocalDate.now();
        return attendanceRepository.findByDate(today).stream()
                .map(this::toDTO)
                .toList();
    }

    private AttendanceDTO toDTO(Attendance attendance) {
        return AttendanceDTO.builder()
                .id(attendance.getId())
                .studentId(attendance.getStudentId())
                .date(attendance.getDate())
                .status(attendance.getStatus())
                .build();
    }

    // ---- Holidays ----

    public List<Holiday> getAllHolidays() {
        return holidayRepository.findAllByOrderByDateAsc();
    }

    public Holiday createHoliday(Holiday holiday) {
        return holidayRepository.save(holiday);
    }

    public Holiday updateHoliday(Long id, Holiday updated) {
        Holiday existing = holidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday", "id", id));
        existing.setName(updated.getName());
        existing.setDate(updated.getDate());
        existing.setDescription(updated.getDescription());
        existing.setHolidayType(updated.getHolidayType());
        return holidayRepository.save(existing);
    }

    public void deleteHoliday(Long id) {
        if (!holidayRepository.existsById(id)) {
            throw new ResourceNotFoundException("Holiday", "id", id);
        }
        holidayRepository.deleteById(id);
    }

    // ---- Leave Requests ----

    public LeaveRequest submitLeave(Long studentId, Long parentId, LeaveRequest request) {
        request.setStudentId(studentId);
        request.setParentId(parentId);
        request.setStatus("PENDING");
        LeaveRequest saved = leaveRequestRepository.save(request);
        log.info("Leave request submitted for student {} by parent {}", studentId, parentId);
        return saved;
    }

    public List<LeaveRequest> getAllLeaveRequests() {
        return leaveRequestRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<LeaveRequest> getLeaveByParent(Long parentId) {
        return leaveRequestRepository.findByParentId(parentId);
    }

    public LeaveRequest approveLeave(Long id, String note) {
        LeaveRequest leave = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", "id", id));
        leave.setStatus("APPROVED");
        leave.setReviewNote(note);
        return leaveRequestRepository.save(leave);
    }

    public LeaveRequest rejectLeave(Long id, String note) {
        LeaveRequest leave = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", "id", id));
        leave.setStatus("REJECTED");
        leave.setReviewNote(note);
        return leaveRequestRepository.save(leave);
    }
}
