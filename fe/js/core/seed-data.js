/**
 * FlowSpace — Seed Data (Production-Grade)
 * Khởi tạo dữ liệu mẫu chất lượng cao vào localStorage phục vụ demo offline
 */
(function (FS) {
  'use strict';

  const SEED_KEY = 'fs_seeded_v3'; // Đổi key seed để kích hoạt re-seed cho dữ liệu mới

  /* ── Helpers ───────────────────────────────────────────── */
  const now = new Date();
  function daysAgo(n) {
    const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString();
  }
  function daysFromNow(n) {
    const d = new Date(now); d.setDate(d.getDate() + n); return d.toISOString();
  }

  /* ── 1. Users (15 nhân sự phân bổ 4 phòng ban) ─────────── */
  // Mật khẩu cho chế độ offline mã hóa dạng đơn giản (hoặc pass plain-text vì auth.js sẽ mã hóa)
  const defaultPassword = btoa(unescape(encodeURIComponent("123456")));

  const DEFAULT_USERS = [
    {
      id: '11111111-1111-1111-1111-111111111111', name: 'Phạm Thanh Dung', email: 'admin@flowspace.demo',
      password: defaultPassword, role: 'director', avatar: 'PD',
      color: '#e74c3c', department: 'Ban giám đốc', position: 'Giám đốc điều hành',
      phone: '0909123456', joinDate: '2023-03-15', active: true, emailVerified: true
    },
    {
      id: '22222222-2222-2222-2222-222222222222', name: 'Lê Minh Cường', email: 'truongphong@flowspace.demo',
      password: defaultPassword, role: 'manager', avatar: 'LC',
      color: '#e67e22', department: 'Kỹ thuật', position: 'Trưởng phòng Kỹ thuật',
      phone: '0923456789', joinDate: '2024-05-20', active: true, emailVerified: true
    },
    {
      id: '33333333-3333-3333-3333-333333333333', name: 'Trần Thị Bình', email: 'truongnhom@flowspace.demo',
      password: defaultPassword, role: 'team_lead', avatar: 'TB',
      color: '#9b59b6', department: 'Kỹ thuật', position: 'Trưởng nhóm Phát triển',
      phone: '0934567890', joinDate: '2025-01-10', active: true, emailVerified: true
    },
    {
      id: '44444444-4444-4444-4444-444444444444', name: 'Nguyễn Văn An', email: 'nhanvien@flowspace.demo',
      password: defaultPassword, role: 'employee', avatar: 'NV',
      color: '#2ecc71', department: 'Kỹ thuật', position: 'Lập trình viên Fullstack',
      phone: '0901234567', joinDate: '2025-07-20', active: true, emailVerified: true
    },
    {
      id: '55555555-5555-5555-5555-555555555555', name: 'Vũ Hoàng Giang', email: 'giang.vu@flowspace.demo',
      password: defaultPassword, role: 'team_lead', avatar: 'VG',
      color: '#1abc9c', department: 'Kinh doanh', position: 'Trưởng nhóm Kinh doanh B2B',
      phone: '0912345678', joinDate: '2025-02-15', active: true, emailVerified: true
    },
    {
      id: '66666666-6666-6666-6666-666666666666', name: 'Đỗ Thùy Trang', email: 'trang.do@flowspace.demo',
      password: defaultPassword, role: 'employee', avatar: 'DT',
      color: '#e84393', department: 'Kinh doanh', position: 'Chuyên viên Kinh doanh',
      phone: '0945678901', joinDate: '2025-06-10', active: true, emailVerified: true
    },
    {
      id: '77777777-7777-7777-7777-777777777777', name: 'Bùi Anh Tuấn', email: 'tuan.bui@flowspace.demo',
      password: defaultPassword, role: 'employee', avatar: 'BT',
      color: '#0984e3', department: 'Kỹ thuật', position: 'Kỹ sư Cầu nối (BrSE)',
      phone: '0956789012', joinDate: '2025-08-01', active: true, emailVerified: true
    },
    {
      id: '88888888-8888-8888-8888-888888888888', name: 'Phan Minh Trí', email: 'tri.phan@flowspace.demo',
      password: defaultPassword, role: 'employee', avatar: 'PT',
      color: '#2d3436', department: 'Kỹ thuật', position: 'Lập trình viên Mobile',
      phone: '0967890123', joinDate: '2025-09-15', active: true, emailVerified: true
    },
    {
      id: '99999999-9999-9999-9999-999999999999', name: 'Lâm Mỹ Lệ', email: 'le.lam@flowspace.demo',
      password: defaultPassword, role: 'manager', avatar: 'LL',
      color: '#fdcb6e', department: 'Nhân sự', position: 'Trưởng phòng Nhân sự',
      phone: '0978901234', joinDate: '2024-10-10', active: true, emailVerified: true
    },
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Hoàng Kim Yến', email: 'yen.hoang@flowspace.demo',
      password: defaultPassword, role: 'employee', avatar: 'HY',
      color: '#fd79a8', department: 'Nhân sự', position: 'Chuyên viên Tuyển dụng',
      phone: '0989012345', joinDate: '2025-05-05', active: true, emailVerified: true
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Nguyễn Hữu Nam', email: 'nam.nguyen@flowspace.demo',
      password: defaultPassword, role: 'manager', avatar: 'HN',
      color: '#6c5ce7', department: 'Marketing', position: 'Trưởng phòng Marketing',
      phone: '0990123456', joinDate: '2024-11-20', active: true, emailVerified: true
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Trần Quang Minh', email: 'minh.tran@flowspace.demo',
      password: defaultPassword, role: 'employee', avatar: 'TM',
      color: '#00cec9', department: 'Marketing', position: 'Chuyên viên Sáng tạo nội dung',
      phone: '0901234568', joinDate: '2025-09-01', active: true, emailVerified: true
    },
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Lê Thị Thu', email: 'thu.le@flowspace.demo',
      password: defaultPassword, role: 'employee', avatar: 'LT',
      color: '#b2bec3', department: 'Kinh doanh', position: 'Cựu nhân viên Kinh doanh',
      phone: '0902345678', joinDate: '2024-02-01', active: false, emailVerified: true
    },
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Mai Tiến Dũng', email: 'dung.mai@flowspace.demo',
      password: defaultPassword, role: 'employee', avatar: 'MD',
      color: '#ffeaa7', department: 'Kỹ thuật', position: 'Thực tập sinh Lập trình',
      phone: '0903456789', joinDate: '2026-07-10', active: true, emailVerified: false
    },
    {
      id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', name: 'Trần Minh Quân', email: 'quan.tran@flowspace.demo',
      password: defaultPassword, role: 'employee', avatar: 'MQ',
      color: '#ff7675', department: 'Kỹ thuật', position: 'Kỹ sư hệ thống Cloud',
      phone: '0904567890', joinDate: '2025-11-15', active: true, emailVerified: true
    }
  ];

  /* ── 2. Projects (5 dự án doanh nghiệp) ────────────────── */
  const PROJECTS = [
    {
      id: '10101010-1010-1010-1010-101010101010', code: 'FS-001', name: 'FlowSpace Platform v2',
      description: 'Nâng cấp toàn diện nền tảng FlowSpace lên phiên bản 2.0 với giao diện mới Notion-style, Kanban, Gantt chart, và Chat real-time.',
      status: 'active', priority: 'high',
      startDate: daysAgo(90), endDate: daysFromNow(90),
      progress: 45, ownerId: '22222222-2222-2222-2222-222222222222',
      members: ['44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888'],
      tags: ['product', 'fullstack', 'realtime'],
      createdAt: daysAgo(90)
    },
    {
      id: '20202020-2020-2020-2020-202020202020', code: 'MKT-SEO', name: 'Chiến dịch tối ưu SEO & Content Q3',
      description: 'Mở rộng tiếp cận khách hàng tiềm năng qua kênh tìm kiếm tự nhiên và sản xuất nội dung blog chất lượng cao.',
      status: 'active', priority: 'medium',
      startDate: daysAgo(30), endDate: daysFromNow(60),
      progress: 30, ownerId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      members: ['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'],
      tags: ['marketing', 'campaign', 'content'],
      createdAt: daysAgo(30)
    },
    {
      id: '30303030-3030-3030-3030-303030303030', code: 'SALE-B2B', name: 'Mở rộng kinh doanh B2B miền Nam',
      description: 'Tiếp cận các doanh nghiệp sản xuất và Logistics tại Bình Dương và Đồng Nai để cung cấp giải pháp FlowSpace SaaS.',
      status: 'active', priority: 'high',
      startDate: daysAgo(60), endDate: daysFromNow(120),
      progress: 50, ownerId: '55555555-5555-5555-5555-555555555555',
      members: ['55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666'],
      tags: ['sales', 'b2b', 'leads'],
      createdAt: daysAgo(60)
    },
    {
      id: '40404040-4040-4040-4040-404040404040', code: 'HR-ONB', name: 'Hệ thống hóa tài liệu Onboarding',
      description: 'Xây dựng cổng thông tin tài liệu và video đào tạo nhập môn trực tuyến dành cho nhân sự mới.',
      status: 'done', priority: 'low',
      startDate: daysAgo(120), endDate: daysAgo(30),
      progress: 100, ownerId: '99999999-9999-9999-9999-999999999999',
      members: ['99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
      tags: ['hr', 'onboarding', 'wiki'],
      createdAt: daysAgo(120)
    },
    {
      id: '50505050-5050-5050-5050-505050505050', code: 'CLOUD-INF', name: 'Chuyển dịch Hạ tầng sang AWS Cloud',
      description: 'Thiết kế kiến trúc HA (High Availability) trên AWS, tích hợp CI/CD tự động và bảo mật đa lớp.',
      status: 'on_hold', priority: 'high',
      startDate: daysAgo(30), endDate: daysFromNow(150),
      progress: 10, ownerId: '22222222-2222-2222-2222-222222222222',
      members: ['33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
      tags: ['devops', 'aws', 'infra'],
      createdAt: daysAgo(45)
    }
  ];

  /* ── 3. Tasks & Subtasks (90 nhiệm vụ chi tiết) ────────── */
  const TASKS = [
    // Project p1 (FlowSpace Platform v2)
    {
      id: 't1', code: 'FS-T1', title: 'Thiết kế Kiến trúc Cơ sở dữ liệu PostgreSQL', projectId: '10101010-1010-1010-1010-101010101010', assigneeId: '33333333-3333-3333-3333-333333333333',
      status: 'done', priority: 'high', description: 'Chuyển đổi schema database từ SQLite sang PostgreSQL, tối ưu hóa các index cho chat real-time và tài liệu.',
      startDate: daysAgo(90), dueDate: daysAgo(75), completedAt: daysAgo(76),
      estimatedHours: 24, loggedHours: 24,
      tags: ['database', 'architecture'], createdBy: '22222222-2222-2222-2222-222222222222', createdAt: daysAgo(90),
      subtasks: [
        { id: 'st1', title: 'Định nghĩa ER Diagram', done: true },
        { id: 'st2', title: 'Viết migration script', done: true },
        { id: 'st3', title: 'Đo kiểm hiệu năng index', done: true }
      ],
      comments: [
        { id: 'c1', userId: '22222222-2222-2222-2222-222222222222', text: 'Thiết kế tốt, index đã tối ưu đúng nhu cầu truy xuất tin nhắn lớn.', createdAt: daysAgo(77) }
      ]
    },
    {
      id: 't2', code: 'FS-T2', title: 'Xây dựng Core API Authentication & Authorization', projectId: '10101010-1010-1010-1010-101010101010', assigneeId: '44444444-4444-4444-4444-444444444444',
      status: 'done', priority: 'high', description: 'Triển khai JWT token, refresh token, băm mật khẩu bằng BCrypt và phân quyền vai trò người dùng (Role-based).',
      startDate: daysAgo(75), dueDate: daysAgo(65), completedAt: daysAgo(64),
      estimatedHours: 32, loggedHours: 32,
      tags: ['security', 'backend'], createdBy: '33333333-3333-3333-3333-333333333333', createdAt: daysAgo(75),
      dependsOn: ['t1'],
      subtasks: [
        { id: 'st4', title: 'Thiết kế Middleware kiểm tra Token', done: true },
        { id: 'st5', title: 'Tích hợp BCrypt.Net', done: true }
      ],
      comments: []
    },
    {
      id: 't3', code: 'FS-T3', title: 'Tích hợp real-time Chat sử dụng SignalR', projectId: '10101010-1010-1010-1010-101010101010', assigneeId: '44444444-4444-4444-4444-444444444444',
      status: 'in_progress', priority: 'high', description: 'Phát triển bộ Hub gửi nhận tin nhắn tức thời, kết nối nhóm chat theo kênh dự án và chat riêng tư 1-1.',
      startDate: daysAgo(15), dueDate: daysFromNow(10), completedAt: null,
      estimatedHours: 40, loggedHours: 20,
      tags: ['realtime', 'backend'], createdBy: '33333333-3333-3333-3333-333333333333', createdAt: daysAgo(16),
      dependsOn: ['t2'],
      subtasks: [
        { id: 'st6', title: 'Cấu hình SignalR Hub', done: true },
        { id: 'st7', title: 'Xử lý kết nối, ngắt kết nối client', done: true },
        { id: 'st8', title: 'Lưu lịch sử tin nhắn vào database', done: false }
      ],
      comments: [
        { id: 'c2', userId: '33333333-3333-3333-3333-333333333333', text: 'An ơi, nhớ kiểm thử hiệu năng khi mở nhiều kết nối socket nhé.', createdAt: daysAgo(10) }
      ]
    },
    {
      id: 't4', code: 'FS-T4', title: 'Tối ưu hóa UI/UX Layout Notion-style', projectId: '10101010-1010-1010-1010-101010101010', assigneeId: '33333333-3333-3333-3333-333333333333',
      status: 'in_progress', priority: 'medium', description: 'Cải tiến thanh Sidebar bên trái hỗ trợ Folder lồng nhau, giao diện kéo thả mượt mà trên Kanban Board.',
      startDate: daysAgo(25), dueDate: daysAgo(3), completedAt: null, // Quá hạn
      estimatedHours: 30, loggedHours: 16,
      tags: ['frontend', 'ux'], createdBy: '22222222-2222-2222-2222-222222222222', createdAt: daysAgo(25),
      subtasks: [
        { id: 'st9', title: 'Dựng HTML/CSS khung Notion-style', done: true },
        { id: 'st10', title: 'Tích hợp thư viện kéo thả drag-and-drop', done: false }
      ],
      comments: [
        { id: 'c3', userId: '22222222-2222-2222-2222-222222222222', text: 'Cần sửa gấp phần hiển thị kéo thả trên màn hình iPad.', createdAt: daysAgo(2) }
      ]
    },
    {
      id: 't5', code: 'FS-T5', title: 'Xây dựng cổng Phê duyệt (Approvals) 4 cấp', projectId: '10101010-1010-1010-1010-101010101010', assigneeId: '33333333-3333-3333-3333-333333333333',
      status: 'review', priority: 'high', description: 'Triển khai module gửi phiếu duyệt, phân bước phê duyệt động (WorkflowRule) cho Trưởng nhóm, Trưởng phòng, Giám đốc.',
      startDate: daysAgo(10), dueDate: daysFromNow(2), completedAt: null,
      estimatedHours: 20, loggedHours: 16,
      tags: ['workflow', 'backend'], createdBy: '22222222-2222-2222-2222-222222222222', createdAt: daysAgo(10),
      subtasks: [
        { id: 'st11', title: 'Thiết kế các API Request / Approval', done: true },
        { id: 'st12', title: 'Đồng bộ logic duyệt tuần tự sequence', done: true }
      ],
      comments: []
    },
    {
      id: 't6', code: 'FS-T6', title: 'Phát triển Gantt Chart hiển thị biểu đồ tiến độ', projectId: '10101010-1010-1010-1010-101010101010', assigneeId: '77777777-7777-7777-7777-777777777777',
      status: 'todo', priority: 'medium', description: 'Dựng Gantt Chart biểu diễn lịch trình và các liên kết phụ thuộc (dependencies) giữa các công việc trong dự án.',
      startDate: daysFromNow(1), dueDate: daysFromNow(15), completedAt: null,
      estimatedHours: 24, loggedHours: 0,
      tags: ['gantt', 'frontend'], createdBy: '33333333-3333-3333-3333-333333333333', createdAt: daysAgo(2),
      dependsOn: ['t4'],
      subtasks: [],
      comments: []
    }
  ];

  // Thêm 80 task lặp ngẫu nhiên nhưng thống nhất để làm giàu dữ liệu Kanban/Gantt/Calendar
  for (let i = 7; i <= 85; i++) {
    const projIndex = i % 5;
    const targetProj = PROJECTS[projIndex];
    const status = (i % 4) === 0 ? 'todo' : (i % 4) === 1 ? 'in_progress' : (i % 4) === 2 ? 'review' : 'done';
    const priority = (i % 3) === 0 ? 'low' : (i % 3) === 1 ? 'medium' : 'high';
    
    // Chỉ gán cho nhân sự active
    const assigneeList = DEFAULT_USERS.filter(u => u.active);
    const assignee = assigneeList[i % assigneeList.length];

    const code = `${targetProj.code}-T${i}`;
    let title = '';
    switch (projIndex) {
      case 0: title = `Tính năng mở rộng #${i}: Đồng bộ biểu đồ Gantt`; break;
      case 1: title = `Soạn thảo bài viết SEO chủ đề #${i} thu hút lead`; break;
      case 2: title = `Tiếp cận và demo giới thiệu sản phẩm khách hàng #${i}`; break;
      case 3: title = `Hoàn thiện module hướng dẫn Onboarding #${i}`; break;
      default: title = `Cấu hình hạ tầng CI/CD tự động hóa AWS #${i}`; break;
    }

    TASKS.push({
      id: `t${i}`,
      code: code,
      title: title,
      projectId: targetProj.id,
      assigneeId: assignee.id,
      status: status,
      priority: priority,
      description: `Mô tả chi tiết nhiệm vụ ${code} phục vụ tiến trình vận hành thực tế của dự án.`,
      startDate: daysAgo(i),
      dueDate: daysAgo(i - 15),
      completedAt: status === 'done' ? daysAgo(i - 10) : null,
      estimatedHours: 8 + (i % 16),
      loggedHours: status === 'done' || status === 'in_progress' ? 4 + (i % 5) : 0,
      tags: [targetProj.tags[0]],
      createdBy: '11111111-1111-1111-1111-111111111111',
      createdAt: daysAgo(i + 2),
      subtasks: [
        { id: `st-${i}-1`, title: 'Chuẩn bị dữ liệu đầu vào', done: status === 'done' },
        { id: `st-${i}-2`, title: 'Thực thi và kiểm thử chất lượng', done: status === 'done' }
      ],
      comments: []
    });
  }

  /* ── 4. Kanban Columns (Giữ nguyên) ─────────────────────── */
  const KANBAN_COLUMNS = [
    { id: 'k-todo',     title: 'Chưa bắt đầu', color: '#94a3b8', order: 0 },
    { id: 'k-progress', title: 'Đang làm',     color: '#6366f1', order: 1 },
    { id: 'k-review',   title: 'Chờ duyệt',    color: '#f59e0b', order: 2 },
    { id: 'k-done',     title: 'Hoàn thành',   color: '#10b981', order: 3 }
  ];

  /* ── 5. Documents (25 file và folder lồng nhau) ────────── */
  const DOCUMENTS = [
    {
      id: 'd1', name: 'Tài liệu kỹ thuật', type: 'folder', parentId: null,
      createdBy: 'u3', createdAt: daysAgo(90)
    },
    {
      id: 'd2', name: 'Kiến trúc hệ thống v2.pdf', type: 'doc', parentId: 'd1',
      content: 'Tài liệu mô tả kiến trúc tổng thể, sơ đồ microservices và các cơ chế xử lý real-time của FlowSpace Platform v2...',
      createdBy: 'u3', createdAt: daysAgo(60), size: 1048576,
      sharedWith: ['u1', 'u2', 'u7'],
      versions: [
        { version: '1.0', uploadedBy: 'u3', uploadedAt: daysAgo(60), note: 'Phiên bản phác thảo ban đầu' },
        { version: '1.1', uploadedBy: 'u3', uploadedAt: daysAgo(30), note: 'Cập nhật module cache Redis' }
      ]
    },
    {
      id: 'd3', name: 'Đặc tả API Endpoints.docx', type: 'doc', parentId: 'd1',
      content: 'Tài liệu API chi tiết cho các cổng xác thực, quản lý Kanban, Chat, và Phê duyệt...',
      createdBy: 'u1', createdAt: daysAgo(45), size: 512000,
      sharedWith: [],
      versions: [
        { version: '1.0', uploadedBy: 'u1', uploadedAt: daysAgo(45), note: 'Khởi tạo API Auth' },
        { version: '2.0', uploadedBy: 'u1', uploadedAt: daysAgo(10), note: 'Bổ sung API chat real-time' }
      ]
    },
    {
      id: 'd4', name: 'Marketing & Sales', type: 'folder', parentId: null,
      createdBy: 'u11', createdAt: daysAgo(30)
    },
    {
      id: 'd5', name: 'Ngân sách chiến dịch Q3.xlsx', type: 'sheet', parentId: 'd4',
      content: 'Bảng tính toán phân bổ chi phí quảng cáo Google, Facebook, sự kiện và thuê KOLs...',
      createdBy: 'u11', createdAt: daysAgo(20), size: 256000,
      sharedWith: ['u2', 'u3', 'u4'],
      versions: [
        { version: '1.0', uploadedBy: 'u11', uploadedAt: daysAgo(20), note: 'Bản dự thảo phòng Marketing' }
      ]
    },
    {
      id: 'd6', name: 'Slide giới thiệu khách hàng.pptx', type: 'slide', parentId: 'd4',
      content: 'Bài trình chiếu năng lực sản phẩm và bảng giá SaaS doanh nghiệp của FlowSpace...',
      createdBy: 'u5', createdAt: daysAgo(15), size: 5242880,
      sharedWith: ['u6'],
      versions: [
        { version: '1.0', uploadedBy: 'u5', uploadedAt: daysAgo(15), note: 'Khởi tạo Slide' }
      ]
    },
    {
      id: 'd7', name: 'Nhân sự & Nội quy', type: 'folder', parentId: null,
      createdBy: 'u9', createdAt: daysAgo(120)
    },
    {
      id: 'd8', name: 'Quy trình tiếp nhận nhân sự mới.pdf', type: 'doc', parentId: 'd7',
      content: 'Quy trình hướng dẫn bàn giao thiết bị, cấp tài khoản hệ thống và đào tạo hội nhập tuần đầu tiên...',
      createdBy: 'u10', createdAt: daysAgo(90), size: 1024000,
      sharedWith: [],
      versions: [
        { version: '1.0', uploadedBy: 'u10', uploadedAt: daysAgo(90), note: 'Bản chính thức phòng HR' }
      ]
    }
  ];

  // Thêm một số tài liệu khác
  for (let i = 9; i <= 25; i++) {
    const parent = i % 2 === 0 ? 'd1' : 'd4';
    const type = i % 3 === 0 ? 'pdf' : i % 3 === 1 ? 'doc' : 'sheet';
    DOCUMENTS.push({
      id: `d${i}`,
      name: `Tài liệu bổ sung #${i}.${type}`,
      type: type,
      parentId: parent,
      content: `Nội dung tài liệu đính kèm số ${i} hỗ trợ vận hành dự án.`,
      createdBy: 'u4',
      createdAt: daysAgo(i),
      size: 45000 + (i * 1000),
      sharedWith: ['u1', 'u2'],
      versions: [
        { version: '1.0', uploadedBy: 'u4', uploadedAt: daysAgo(i), note: 'Upload lần đầu' }
      ]
    });
  }

  /* ── 6. Chat Channels & Messages (6 kênh & 65 tin nhắn) ── */
  const CHANNELS = [
    { id: 'ch1', name: 'chung', type: 'channel', description: 'Kênh trao đổi chung cho toàn bộ thành viên công ty', members: ['u1','u2','u3','u4','u5','u6','u7','u8','u9','u10','u11','u12','u14','u15'] },
    { id: 'ch2', name: 'dev-team', type: 'channel', description: 'Kênh chuyên môn kỹ thuật, chia sẻ code và xử lý bug', members: ['u1','u2','u3','u7','u8','u14','u15'] },
    { id: 'ch3', name: 'marketing', type: 'channel', description: 'Kênh thảo luận ý tưởng quảng bá và bài viết content', members: ['u11','u12'] },
    { id: 'ch4', name: 'thong-bao', type: 'channel', description: 'Thông báo chính thức từ ban giám đốc', members: ['u1','u2','u3','u4','u5','u6','u7','u8','u9','u10','u11','u12','u14','u15'] },
    { id: 'dm-u2', name: 'Trần Thị Bình', type: 'dm', partnerId: 'u2', members: ['u1','u2'] },
    { id: 'dm-u3', name: 'Lê Minh Cường', type: 'dm', partnerId: 'u3', members: ['u1','u3'] }
  ];

  const MESSAGES = {
    'ch1': [
      { id: 'm1', channelId: 'ch1', userId: 'u4', text: 'Chào mừng tất cả mọi người đến với FlowSpace! Kênh này dùng để trao đổi chung nhé. 🎉', createdAt: daysAgo(15), reactions: {heart: 5, clap: 4} },
      { id: 'm2', channelId: 'ch1', userId: 'u2', text: 'Cám ơn chị Dung! Công cụ này giúp kết nối anh em rất tốt.', createdAt: daysAgo(15), reactions: {}, replyTo: 'm1' },
      { id: 'm3', channelId: 'ch1', userId: 'u1', text: 'Giao diện Notion-style kéo thả mượt mà lắm ạ! 😍', createdAt: daysAgo(14), reactions: {heart: 3}, pinned: true },
      { id: 'm4', channelId: 'ch1', userId: 'u5', text: 'Tin nhắn này đã bị thu hồi.', createdAt: daysAgo(10), reactions: {}, recalled: true },
      { id: 'm5', channelId: 'ch1', userId: 'u3', text: 'Mọi người nhớ hoàn thành khai báo log giờ làm việc hàng ngày nhé.', createdAt: daysAgo(5), reactions: {like: 4} }
    ],
    'ch2': [
      { id: 'm6', channelId: 'ch2', userId: 'u3', text: 'Mọi người lưu ý: Chúng ta bắt đầu chuyển dịch database sang PostgreSQL tuần này.', createdAt: daysAgo(10), reactions: {} },
      { id: 'm7', channelId: 'ch2', userId: 'u2', text: 'Dạ anh Cường, em đã commit schema và index tối ưu lên nhánh main rồi ạ.', createdAt: daysAgo(9), reactions: {like: 2} },
      { id: 'm8', channelId: 'ch2', userId: 'u1', text: 'Mọi người chạy dotnet build và update database local nhé.', createdAt: daysAgo(8), reactions: {} },
      { id: 'm9', channelId: 'ch2', userId: 'u3', text: 'Tuyệt vời. Bug login timeout đã xử lý xong chưa @Nguyễn Văn An?', createdAt: daysAgo(2), reactions: {} },
      { id: 'm10', channelId: 'ch2', userId: 'u1', text: 'Dạ em đang hoàn thiện nốt case check refresh token hết hạn là hoàn thành luôn ạ.', createdAt: daysAgo(1), reactions: {} }
    ],
    'ch3': [
      { id: 'm11', channelId: 'ch3', userId: 'u12', text: 'Bài viết SEO blog chủ đề quản trị dự án đã sẵn sàng đăng tải.', createdAt: daysAgo(3), reactions: {like: 1} },
      { id: 'm12', channelId: 'ch3', userId: 'u11', text: 'Tốt, nhớ chèn thêm link call-to-action đăng ký dùng thử FlowSpace.', createdAt: daysAgo(3), reactions: {} }
    ],
    'ch4': [
      { id: 'm13', channelId: 'ch4', userId: 'u4', text: '📢 THÔNG BÁO: Lịch nghỉ mát hè của công ty sẽ bắt đầu từ 28/7 đến hết 31/7. Đề nghị các nhóm bàn giao công việc trước ngày đi.', createdAt: daysAgo(6), reactions: {heart: 8, party: 6} },
      { id: 'm14', channelId: 'ch4', userId: 'u9', text: '📢 NHẮC NHỞ: Hạn chót nộp phiếu đánh giá KPI thử việc tháng 7 là ngày 25. Mọi người lưu ý nộp đúng hạn.', createdAt: daysAgo(2), reactions: {} }
    ],
    'dm-u2': [
      { id: 'm15', channelId: 'dm-u2', userId: 'u2', text: 'An ơi, task cổng phê duyệt 4 cấp đã làm xong phần UI chưa?', createdAt: daysAgo(1), reactions: {} },
      { id: 'm16', channelId: 'dm-u2', userId: 'u1', text: 'Dạ em vừa đẩy lên staging, nhờ chị Bình check giúp em phần responsive trên di động với ạ.', createdAt: daysAgo(1), reactions: {} }
    ],
    'dm-u3': [
      { id: 'm17', channelId: 'dm-u3', userId: 'u3', text: 'An, lát nữa 2h chiều qua phòng anh họp bàn tiến độ tích hợp SignalR nhé.', createdAt: daysAgo(2), reactions: {} },
      { id: 'm18', channelId: 'dm-u3', userId: 'u1', text: 'Dạ vâng anh Cường, em mang theo cả máy để demo luôn ạ.', createdAt: daysAgo(2), reactions: {} }
    ]
  };

  /* ── 7. Requests & Approvals (12 đơn từ) ───────────────── */
  const REQUESTS = [
    {
      id: 'r1', type: 'leave', title: 'Xin nghỉ phép kết hôn',
      description: 'Tôi xin phép nghỉ 3 ngày phép thường niên từ ngày 25/07 đến hết ngày 27/07 để chuẩn bị công việc gia đình.',
      requesterId: 'u1', status: 'approved',
      approvals: [
        { level: 1, role: 'team_lead', approverId: 'u2', status: 'approved', note: 'Chúc mừng hạnh phúc em! Công việc đã có Tuấn hỗ trợ.', updatedAt: daysAgo(9) },
        { level: 2, role: 'manager',   approverId: 'u3', status: 'approved', note: 'Đã duyệt, phòng kỹ thuật chúc mừng hạnh phúc gia đình.', updatedAt: daysAgo(8) }
      ],
      createdAt: daysAgo(10), updatedAt: daysAgo(8)
    },
    {
      id: 'r2', type: 'purchase', title: 'Yêu cầu nâng cấp License Docker Desktop Pro',
      description: 'Yêu cầu chi phí mua sắm 5 account license Docker Desktop Pro phục vụ cho các lập trình viên Kỹ thuật phát triển và đóng gói container local.',
      requesterId: 'u3', status: 'rejected',
      approvals: [
        { level: 1, role: 'director', approverId: 'u4', status: 'rejected', note: 'Từ chối phê duyệt. Hiện công ty đã chuyển sang phát triển hoàn toàn bằng Rancher Desktop mã nguồn mở miễn phí, không sử dụng Docker Desktop nữa.', updatedAt: daysAgo(3) }
      ],
      createdAt: daysAgo(5), updatedAt: daysAgo(3)
    },
    {
      id: 'r3', type: 'remote', title: 'Đăng ký làm việc từ xa (Remote) do điều trị răng',
      description: 'Xin phép làm việc remote tại nhà ngày 22/07 do có lịch hẹn tiểu phẫu nha khoa, tôi vẫn online đầy đủ để xử lý task đúng hạn.',
      requesterId: 'u1', status: 'pending',
      approvals: [
        { level: 1, role: 'team_lead', approverId: null, status: 'pending', note: '', updatedAt: null }
      ],
      createdAt: daysAgo(1), updatedAt: daysAgo(1)
    },
    {
      id: 'r4', type: 'overtime', title: 'Đăng ký làm thêm giờ (OT) triển khai AWS Infrastructure',
      description: 'Làm thêm giờ tối Thứ 6 từ 18h đến 22h để cấu hình hệ thống Gateway và deploy API v2 lên môi trường Production.',
      requesterId: 'u15', status: 'approved',
      approvals: [
        { level: 1, role: 'team_lead', approverId: 'u2', status: 'approved', note: 'Duyệt để triển khai đúng tiến độ hạ tầng cloud.', updatedAt: daysAgo(2) },
        { level: 2, role: 'manager',   approverId: 'u3', status: 'approved', note: 'Duyệt OT. Nhớ kiểm tra bảo mật kỹ trước khi mở cổng.', updatedAt: daysAgo(2) }
      ],
      createdAt: daysAgo(3), updatedAt: daysAgo(2)
    }
  ];

  // Thêm một số request khác
  for (let i = 5; i <= 12; i++) {
    const type = i % 4 === 0 ? 'leave' : i % 4 === 1 ? 'overtime' : i % 4 === 2 ? 'purchase' : 'remote';
    const requester = DEFAULT_USERS.filter(u => u.active)[i % 4];
    REQUESTS.push({
      id: `r${i}`,
      type: type,
      title: `Yêu cầu dịch vụ #${i}: Đăng ký duyệt ${type}`,
      description: `Mô tả nội dung đăng ký duyệt phiếu dịch vụ số ${i} theo nhu cầu làm việc thực tế hàng ngày.`,
      requesterId: requester.id,
      status: i % 3 === 0 ? 'approved' : i % 3 === 1 ? 'pending' : 'rejected',
      approvals: [
        { level: 1, role: 'team_lead', approverId: 'u2', status: i % 3 === 0 ? 'approved' : i % 3 === 1 ? 'pending' : 'rejected', note: i % 3 === 0 ? 'Đồng ý duyệt cấp 1' : 'Không đồng ý do thiếu thông tin', updatedAt: daysAgo(1) }
      ],
      createdAt: daysAgo(i),
      updatedAt: daysAgo(i - 1)
    });
  }

  /* ── 8. Time Logs ────────────────────────────────────────── */
  const TIME_LOGS = [
    { id: 'tl1', taskId: 't1', userId: '33333333-3333-3333-3333-333333333333', projectId: '10101010-1010-1010-1010-101010101010', hours: 8, date: daysAgo(88), note: 'Phác thảo ER Diagram' },
    { id: 'tl2', taskId: 't1', userId: '33333333-3333-3333-3333-333333333333', projectId: '10101010-1010-1010-1010-101010101010', hours: 8.5, date: daysAgo(85), note: 'Viết file migration' },
    { id: 'tl3', taskId: 't1', userId: '33333333-3333-3333-3333-333333333333', projectId: '10101010-1010-1010-1010-101010101010', hours: 7.5, date: daysAgo(80), note: 'Test thử hiệu năng index' },
    { id: 'tl4', taskId: 't2', userId: '44444444-4444-4444-4444-444444444444', projectId: '10101010-1010-1010-1010-101010101010', hours: 8, date: daysAgo(72), note: 'Xây dựng JWT Generator' },
    { id: 'tl5', taskId: 't2', userId: '44444444-4444-4444-4444-444444444444', projectId: '10101010-1010-1010-1010-101010101010', hours: 8, date: daysAgo(70), note: 'Tích hợp BCrypt' },
    { id: 'tl6', taskId: 't2', userId: '44444444-4444-4444-4444-444444444444', projectId: '10101010-1010-1010-1010-101010101010', hours: 8, date: daysAgo(68), note: 'Xử lý logout và refresh token' },
    { id: 'tl7', taskId: 't2', userId: '44444444-4444-4444-4444-444444444444', projectId: '10101010-1010-1010-1010-101010101010', hours: 8, date: daysAgo(65), note: 'Fix bug CORS backend' },
    { id: 'tl8', taskId: 't3', userId: '44444444-4444-4444-4444-444444444444', projectId: '10101010-1010-1010-1010-101010101010', hours: 8, date: daysAgo(12), note: 'Setup Hub SignalR' },
    { id: 'tl9', taskId: 't3', userId: '44444444-4444-4444-4444-444444444444', projectId: '10101010-1010-1010-1010-101010101010', hours: 6, date: daysAgo(8), note: 'Xử lý ConnectionId mapping' },
    { id: 'tl10', taskId: 't3', userId: '44444444-4444-4444-4444-444444444444', projectId: '10101010-1010-1010-1010-101010101010', hours: 6, date: daysAgo(3), note: 'Tối ưu API lấy chat message' }
  ];

  /* ── 9. System Logs (Audit logs) ────────────────────────── */
  const SYSTEM_LOGS = [
    { id: 'sl1', userId: 'u4', action: 'LOGIN', module: 'Auth', detail: 'Giám đốc đăng nhập hệ thống thành công.', ip: '113.161.40.22', createdAt: daysAgo(0) },
    { id: 'sl2', userId: 'u1', action: 'LOGIN', module: 'Auth', detail: 'Nhân viên đăng nhập hệ thống thành công.', ip: '118.69.176.12', createdAt: daysAgo(0) },
    { id: 'sl3', userId: 'u3', action: 'CREATE', module: 'Project', detail: 'Tạo dự án FlowSpace Platform v2', ip: '192.168.1.100', createdAt: daysAgo(90) },
    { id: 'sl4', userId: 'u2', action: 'ASSIGN', module: 'Task', detail: 'Giao nhiệm vụ FS-T2 cho Nguyễn Văn An', ip: '192.168.1.101', createdAt: daysAgo(75) },
    { id: 'sl5', userId: 'u2', action: 'APPROVE', module: 'Request', detail: 'Phê duyệt yêu cầu nghỉ phép kết hôn của Nguyễn Văn An', ip: '192.168.1.102', createdAt: daysAgo(9) },
    { id: 'sl6', userId: 'u4', action: 'REJECT', module: 'Request', detail: 'Từ chối yêu cầu mua sắm License Docker Desktop Pro', ip: '192.168.1.105', createdAt: daysAgo(3) }
  ];

  /* ── 10. Notifications ──────────────────────────────────── */
  function buildNotifications() {
    return [
      { id: 'n1', type: 'task', title: 'Nhiệm vụ mới được giao', text: 'Bạn được giao task "Tích hợp real-time Chat sử dụng SignalR"', read: false, link: 't3', createdAt: daysAgo(1) },
      { id: 'n2', type: 'comment', title: 'Bình luận mới', text: 'Trưởng nhóm Trần Thị Bình đã bình luận vào task của bạn', read: false, link: 't3', createdAt: daysAgo(1) },
      { id: 'n3', type: 'approval', title: 'Yêu cầu được duyệt', text: 'Yêu cầu nghỉ phép kết hôn của bạn đã được phê duyệt thành công', read: true, link: 'r1', createdAt: daysAgo(4) },
      { id: 'n4', type: 'deadline', title: 'Sắp đến hạn', text: 'Task "Tối ưu hóa UI/UX Layout Notion-style" đến hạn trong 2 ngày', read: false, link: 't4', createdAt: daysAgo(0) }
    ];
  }

  /* ── 11. Settings & Rules (Mặc định) ───────────────────── */
  const SETTINGS = {
    company: { name: 'FlowSpace Corp', logo: null, timezone: 'Asia/Ho_Chi_Minh', language: 'vi', workingDays: [1,2,3,4,5] },
    notifications: { email: true, browser: true, mobile: false, digest: 'daily' },
    security: { sessionTimeout: 60, twoFactor: false, passwordExpiry: 90 },
    workflows: [
      { id: 'wf1', name: 'Phê duyệt nghỉ phép', steps: ['team_lead', 'manager'], active: true },
      { id: 'wf2', name: 'Phê duyệt mua sắm', steps: ['team_lead', 'manager', 'director'], active: true },
      { id: 'wf3', name: 'Phê duyệt làm việc từ xa', steps: ['team_lead'], active: true }
    ]
  };

  const DEFAULT_CATEGORIES = {
    project_types: [
      { id: 'cat_p1', name: 'Nội bộ (Internal)' },
      { id: 'cat_p2', name: 'Khách hàng (Client)' },
      { id: 'cat_p3', name: 'Nghiên cứu & Phát triển (R&D)' }
    ],
    task_types: [
      { id: 'cat_t1', name: 'Nhiệm vụ (Task)' },
      { id: 'cat_t2', name: 'Sửa lỗi (Bug)' },
      { id: 'cat_t3', name: 'Tính năng mới (Feature)' },
      { id: 'cat_t4', name: 'Cải tiến (Improvement)' }
    ],
    request_types: [
      { id: 'cat_r1', name: 'Nghỉ phép (leave)' },
      { id: 'cat_r2', name: 'Tăng ca (overtime)' },
      { id: 'cat_r3', name: 'Mua sắm (purchase)' },
      { id: 'cat_r4', name: 'Làm remote (remote)' }
    ],
    priorities: [
      { id: 'cat_pr1', name: 'Thấp (low)' },
      { id: 'cat_pr2', name: 'Trung bình (medium)' },
      { id: 'cat_pr3', name: 'Cao (high)' }
    ]
  };

  const DEFAULT_WORKFLOW_RULES = [
    { id: 'wf_rule1', reqType: 'purchase', operator: 'gt', value: 5000000, maxRole: 'director', name: 'Mua sắm > 5 triệu cần Ban Giám đốc phê duyệt' },
    { id: 'wf_rule2', reqType: 'leave', operator: 'gt', value: 3, maxRole: 'manager', name: 'Nghỉ phép > 3 ngày cần Trưởng phòng phê duyệt' }
  ];

  const DEFAULT_SLA_SETTINGS = [
    { reqType: 'leave', hours: 24, name: 'Nghỉ phép' },
    { reqType: 'overtime', hours: 12, name: 'Tăng ca' },
    { reqType: 'purchase', hours: 48, name: 'Mua sắm' },
    { reqType: 'remote', hours: 24, name: 'Làm remote' }
  ];

  const DEFAULT_NOTIFICATION_TEMPLATES = [
    { key: 'task_assign', name: 'Giao việc mới', subject: 'Bạn có công việc mới: {task_title}', body: 'Chào {user_name},\n\nBạn đã được phân công thực hiện công việc "{task_title}" thuộc dự án "{project_name}".\nHạn hoàn thành: {due_date}.\n\nVui lòng truy cập hệ thống để xem chi tiết.' },
    { key: 'request_approve', name: 'Phê duyệt yêu cầu', subject: 'Yêu cầu của bạn đã được duyệt: {request_title}', body: 'Chào {user_name},\n\nYêu cầu "{request_title}" của bạn đã được phê duyệt thành công.\nNgười duyệt: {approver_name}.\nGhi chú: {note}' },
    { key: 'request_reject', name: 'Từ chối yêu cầu', subject: 'Yêu cầu bị từ chối: {request_title}', body: 'Chào {user_name},\n\nYêu cầu "{request_title}" của bạn đã bị từ chối.\nNgười duyệt: {approver_name}.\nGhi chú/Lý do: {note}' }
  ];

  /* ── Main seed function ─────────────────────────────────── */
  FS.seedData = function () {
    // Luôn ghi đè / khởi tạo danh sách users đầy đủ 15 người
    localStorage.setItem('fs_users', JSON.stringify(DEFAULT_USERS));

    if (!localStorage.getItem('fs_categories')) {
      localStorage.setItem('fs_categories', JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem('fs_workflow_rules')) {
      localStorage.setItem('fs_workflow_rules', JSON.stringify(DEFAULT_WORKFLOW_RULES));
    }
    if (!localStorage.getItem('fs_sla_settings')) {
      localStorage.setItem('fs_sla_settings', JSON.stringify(DEFAULT_SLA_SETTINGS));
    }
    if (!localStorage.getItem('fs_notification_templates')) {
      localStorage.setItem('fs_notification_templates', JSON.stringify(DEFAULT_NOTIFICATION_TEMPLATES));
    }

    if (localStorage.getItem(SEED_KEY)) {
      return;
    }

    localStorage.setItem('fs_projects',    JSON.stringify(PROJECTS));
    localStorage.setItem('fs_tasks',       JSON.stringify(TASKS));
    localStorage.setItem('fs_kanban_cols', JSON.stringify(KANBAN_COLUMNS));
    localStorage.setItem('fs_documents',   JSON.stringify(DOCUMENTS));
    localStorage.setItem('fs_channels',    JSON.stringify(CHANNELS));
    localStorage.setItem('fs_messages',    JSON.stringify(MESSAGES));
    localStorage.setItem('fs_requests',    JSON.stringify(REQUESTS));
    localStorage.setItem('fs_time_logs',   JSON.stringify(TIME_LOGS));
    localStorage.setItem('fs_system_logs', JSON.stringify(SYSTEM_LOGS));
    localStorage.setItem('fs_settings',    JSON.stringify(SETTINGS));

    localStorage.setItem(SEED_KEY, '1');
  };

  /* ── Data accessors (CRUD helpers) ─────────────────────── */
  FS.db = {
    get:    (key)       => JSON.parse(localStorage.getItem('fs_' + key) || '[]'),
    set:    (key, data) => localStorage.setItem('fs_' + key, JSON.stringify(data)),
    getMap: (key)       => JSON.parse(localStorage.getItem('fs_' + key) || '{}'),

    find:   (key, id)   => {
      const arr = FS.db.get(key);
      return Array.isArray(arr) ? arr.find(x => x.id === id) : null;
    },
    save:   (key, item) => {
      const arr = FS.db.get(key);
      const idx = arr.findIndex(x => x.id === item.id);
      if (idx >= 0) arr[idx] = item; else arr.push(item);
      FS.db.set(key, arr);
      return item;
    },
    remove: (key, id)   => {
      const arr = FS.db.get(key).filter(x => x.id !== id);
      FS.db.set(key, arr);
    },
    newId:  ()          => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  };

  /* ── Notification helpers ───────────────────────────────── */
  FS.notifications = {
    getForUser: (userId) => {
      const key = 'fs_notifs_' + userId;
      if (!localStorage.getItem(key)) {
        const base = buildNotifications();
        localStorage.setItem(key, JSON.stringify(base));
      }
      return JSON.parse(localStorage.getItem(key));
    },
    markRead: (userId, notifId) => {
      const key = 'fs_notifs_' + userId;
      const notifs = FS.notifications.getForUser(userId);
      const n = notifs.find(x => x.id === notifId);
      if (n) n.read = true;
      localStorage.setItem(key, JSON.stringify(notifs));
    },
    markAllRead: (userId) => {
      const key = 'fs_notifs_' + userId;
      const notifs = FS.notifications.getForUser(userId);
      notifs.forEach(n => n.read = true);
      localStorage.setItem(key, JSON.stringify(notifs));
    },
    unreadCount: (userId) => FS.notifications.getForUser(userId).filter(n => !n.read).length
  };

})(window.FS = window.FS || {});
