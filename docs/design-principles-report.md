# 7. Nguyên tắc thiết kế
## 7.1. Áp dụng các khái niệm thiết kế
### 7.1.1. Coupling (Độ liên kết)
Thiết kế tập trung làm giảm tối đa sự phụ thuộc lẫn nhau giữa các module, đảm bảo tính dễ bảo trì và hạn chế tác động lan truyền khi hệ thống thay đổi.

#### 7.1.1.1. Common Coupling
- **Mô tả:** Xảy ra khi nhiều module cùng tham chiếu và cập nhật chung một cấu trúc dữ liệu hoặc vùng nhớ toàn cục.
- **Trong dự án:** Nhờ cơ chế đóng gói của TypeScript/ES Modules, mã nguồn không dùng vùng nhớ hoặc biến toàn cục dùng chung. Tuy nhiên, việc các API route trực tiếp thao tác SQL thô lên cùng một cơ sở dữ liệu tạo ra sự phụ thuộc gián tiếp qua cấu trúc bảng (schema coupling).
- **Đánh giá:** Nhóm nhận thấy thiết kế không vi phạm trực tiếp coupling này ở mức mã nguồn ứng dụng.

#### 7.1.1.2. Control Coupling 
- **Mô tả:** Xảy ra khi một thành phần truyền thông tin định hướng (như cờ điều khiển, cờ vai trò) để điều khiển trực tiếp logic phân nhánh bên trong thành phần khác.
- **Cách khắc phục:**  
  + Tách nhỏ các phương thức để xử lý tác vụ chuyên biệt.  
  + Áp dụng tính đa hình hoặc các mẫu thiết kế hành vi (Strategy, Factory).
- **Áp dụng thực tế của nhóm:**

STT | Module liên quan | Mô tả | Hướng cải thiện
--- | --- | --- | ---
1 | [auth-routes.ts](../backend/src/routes/auth-routes.ts) / [members-routes.ts](../backend/src/routes/members-routes.ts) | Phân nhánh logic nghiệp vụ dựa trên tham số vai trò (role) của người dùng | Xây dựng middleware kiểm tra quyền riêng hoặc chia nhỏ các phương thức xử lý cho từng đối tượng.
2 | [members-routes.ts](../backend/src/routes/members-routes.ts) | Thay đổi câu lệnh truy vấn SQL tùy thuộc vào tham số lọc truyền vào (userId, query) | Chia nhỏ endpoint thành các đường dẫn API con rõ ràng.

#### 7.1.1.3. Stamp coupling 
- **Mô tả:** Xảy ra khi các module giao tiếp thông qua một đối tượng dữ liệu phức tạp nhưng thực tế chỉ sử dụng một vài trường thông tin nhất định trong đối tượng đó.
- **Trong dự án:** Giao diện frontend thường gọi API nhận về toàn bộ thông tin của thực thể lớn (như Member, Package) nhưng chỉ sử dụng trường ID hoặc tên hiển thị để hiển thị. Ở backend, các hàm xử lý API nhận cả đối tượng Request lớn nhưng chỉ trích xuất một vài tham số cơ bản.
- **Hướng giải quyết của nhóm:** Định nghĩa các cấu trúc dữ liệu chuyển đổi (DTO) tối giản để trao đổi giữa các tầng Frontend và Backend.

#### 7.1.1.4. Data coupling 
- **Mô tả:** Định dạng liên kết lý tưởng nhất, trong đó các module trao đổi thông tin thuần túy bằng các tham số kiểu dữ liệu cơ bản (primitive) và khai thác tối đa các tham số đó.
- **Trong dự án:** Nhóm đã triển khai thành công ở các hàm tiện ích xử lý chuỗi mật khẩu hoặc các phương thức gọi API dùng chung tại [client.ts](../frontend/src/api/client.ts).

#### 7.1.1.5. Uncoupled
- Các module nghiệp vụ được kết nối logic chặt chẽ, thiết kế không có thành phần dư thừa hoàn toàn cô lập cần loại bỏ.

---

### 7.1.2. Cohesion (Độ kết dính)
Đánh giá mức độ tập trung thực hiện nhiệm vụ duy nhất của từng module chức năng.

#### 7.1.2.1. Coincidental cohesion 
- **Mô tả:** Các chức năng không liên quan được gộp chung vào một module chỉ vì sự tiện lợi hoặc ngẫu nhiên.
- **Trong dự án:** Nhận diện thấy ở một số file route khi chứa cả định nghĩa API, thuật toán mật khẩu và truy vấn cơ sở dữ liệu.
- **Giải pháp:** Tách các tiện ích độc lập (ví dụ mã hóa) ra các file helper dùng chung.

#### 7.1.2.2. Logical cohesion 
- **Mô tả:** Gom các tác vụ vào cùng một nơi dựa trên sự tương đồng về mặt logic kỹ thuật (như cùng gọi API, cùng xử lý I/O) thay vì tính năng nghiệp vụ.
- **Trong dự án:** File [client.ts](../frontend/src/api/client.ts) gom chung mọi phương thức HTTP request phục vụ các thực thể khác nhau.
- **Giải pháp:** Phân cấp logic theo đối tượng nghiệp vụ cụ thể thay vì gom nhóm theo công cụ xử lý.

#### 7.1.2.3. Informational cohesion 
- **Mô tả:** Các hàm/phương thức hoạt động độc lập nhưng cùng thao tác và cập nhật trên một nguồn dữ liệu/trạng thái chung của lớp.
- **Trong dự án:** Nhóm đạt được mức cohesion này ở các React Custom Hook quản lý dữ liệu dùng chung như [use-notifications.ts](../frontend/src/hooks/use-notifications.ts).

---

### Câu hỏi chưa giải quyết (Unresolved Questions)
1. Nhóm có nên chuyển đổi toàn bộ Backend sang cấu trúc phân lớp Controller - Service - Repository nhằm tối ưu hóa độ kết dính (Functional Cohesion) và giảm phụ thuộc dữ liệu dùng chung (Common/Stamp coupling) không?
