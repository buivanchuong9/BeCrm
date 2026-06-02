# BeCrm

## Master Build & Update Routine (Checklist)

Sau khi fix xong code, copy và chạy lần lượt bộ lệnh này (đây là quy trình chuẩn để cập nhật hệ thống):

```bash
# 1. Dừng container cũ (để tránh lỗi xung đột port khi rebuild)
sudo docker compose stop carefollow-be

# 2. Xóa cache và build lại từ đầu (đảm bảo code mới nhất được đưa vào)
sudo docker compose build --no-cache carefollow-be

# 3. Đồng bộ Database (Tránh lỗi 'Table not found' do code mới cần Schema mới)
# (Nếu ông có dữ liệu test, db push là an toàn nhất trong môi trường lab)
sudo docker compose run --rm carefollow-be npx prisma db push

# 4. Chạy lại container với cấu hình mới
sudo docker compose up -d carefollow-be

# 5. Kiểm tra log ngay lập tức để chắc chắn nó không crash nữa
sudo docker compose logs -f carefollow-be
```
