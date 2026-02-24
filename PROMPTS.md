# PROMPTS.md - Prompting Guide

Tài liệu ghi lại cách prompt

---

## 🚀 Prompts Tối Ưu (5 prompts)

### Prompt 1: Khởi tạo & Implement

```
Đọc đề bài @exam.md

Tạo file todo.md với các mục:
1. Logic xử lý file tối ưu memory/performance (ghi rõ pattern, thư viện)
2. CLI design
3. Unit tests
4. Docker
5. Documentation

Sau đó implement mục 1 theo class-based OOP.
Mỗi khi hoàn thành 1 mục, tự động cập nhật todo.md.
```
**NOTE** sau khi AI tạo ra được 1 bản thiết kế thì sẽ đọc lại và cập nhật cũng như thêm bớt các step để đúng ý mình muốn nhất

**Kết quả:** todo.md + core logic (types, parser, aggregator, processor, cli)

---

### Prompt 2: Unit Tests + Coverage

```
Viết unit tests cho core logic.
Yêu cầu 100% line coverage.
Fix lỗi nếu có.
Cập nhật todo.md.
```

**Kết quả:** 65 tests, 100% coverage

---

### Prompt 3: Docker

```
Tạo Dockerfile đơn giản (không cần production config).
Chạy thử với file @input/ad_data.csv
Cập nhật todo.md.
```

**Kết quả:** Dockerfile, test thành công

---

### Prompt 4: Documentation

```
Viết README.md với Docker-first approach.
Bao gồm: quick start, usage, performance benchmarks, architecture.
Cập nhật todo.md.
```

**Kết quả:** README.md hoàn chỉnh

---

### Prompt 5: PROMPTS.md

```
Tạo PROMPTS.md ghi lại các prompts đã tối ưu.
```

**Kết quả:** File này
