# Hồ 3D và cá cá nhân hoá

Vào **Hồ cá → Vẽ cá** để đặt tên, chọn màu thân và vẽ trên khung. Có ba cỡ bút, mã màu HEX riêng, tẩy, hoàn tác và làm lại nét. Mắt/miệng luôn ở lớp trên; nét vẽ được cắt trong hình cá.

**Xem thử cá trong hồ 3D** xem trực tiếp bản vẽ trên mô hình trước khi lưu. Cá đã lưu bơi được trong cả hồ 2D và 3D. Trong 3D, hình vẽ được ánh xạ lên hai bên thân và đuôi; vây phụ dùng màu thân. Hình thể 3D có độ cong nên nét vẽ có thể khác tỷ lệ với bản phẳng. Bộ sưu tập hỗ trợ sửa, cất/thả và xoá có xác nhận.

Tẩy mới lưu thao tác xoá thay vì cố định màu cũ, nên vùng tẩy luôn theo màu thân khi đổi nền. Bản vẽ từ phiên bản trước vẫn đọc được; các nét tẩy cũ được giữ nguyên như nét màu vì dữ liệu cũ không phân biệt tẩy với bút.

Bản nháp được lưu tự động sau 500 ms ngừng thay đổi, khôi phục khi mở lại và giữ khi chuyển tab. Trình vẽ có thông báo khi không lưu được bản nháp. Bộ sưu tập lưu cùng dữ liệu ứng dụng: tối đa 12 cá, 160 nét/cá, 600 điểm/nét và 750.000 ký tự JSON toàn bộ bộ sưu tập. Xoá toàn bộ dữ liệu ứng dụng cũng xoá bản nháp và cá cá nhân hoá.

## Cải tiến hồ 3D

- Mặt nước gợn, ánh sáng chuyển động trên nền cát, sỏi có phân bố cố định.
- Rong chuyển động riêng theo từng nhánh; ánh sáng và sương tạo chiều sâu.
- Cá uốn thân theo nhịp vẫy đuôi, bơi ở nhiều độ sâu; độ lệch pha riêng cho từng cá.
- Vật liệu thân có phản sáng nhẹ, thêm đường mang; bản vẽ dùng texture tạo bằng mã dùng được trên web/native, không phụ thuộc canvas DOM.
- Tạm dừng, chế độ nhẹ máy, góc nhìn và chuyển 2D/3D tiếp tục hoạt động. Texture và geometry được giải phóng khi đổi mẫu hoặc đóng cảnh.

## Kiểm tra

`npm run typecheck`, `npm test`, `npm run build:demo` và `node scripts/check-fish-studio.mjs`.

Test màu kiểm tra tẩy, đổi màu nền sau tẩy, dữ liệu không hợp lệ và nét ngoài biên. Kiểm tra Chrome dùng profile riêng với dữ liệu mẫu: vẽ, hoàn tác/làm lại, khôi phục bản nháp sau tải lại, xem thử 3D, lưu cá trong hồ 3D, chuyển 2D, sửa, tải lại, cất/thả/xoá; kiểm tra tràn ngang ở 390 và 1024 px.

Ảnh sinh trong `shots/fish-studio-390.png`, `shots/fish-studio-1024.png`, `shots/fish-preview-3d.png`, `shots/fish-custom-3d.png` (gitignore). Chưa kiểm chứng trực tiếp trên thiết bị iOS/Android hoặc hiệu năng GPU điện thoại. Đây là đồ hoạ thời gian thực bằng mô hình dựng mã, chưa phải chất lượng ảnh chụp.

## Hình thể cá 3D chi tiết

Ba mẫu cá vàng, cá hề và cá nóc dùng các tiết diện thân riêng, nội suy liên tục từ đầu đến cuống đuôi. Da được tạo bằng texture và bản đồ độ nổi: vảy xếp so le cho cá vàng/cá hề, đốm ô liu không đều và bụng nhạt cho cá nóc. Vây là lưới chia đoạn có tia vây, viền tối trên cá hề và biến dạng ở mép khi bơi. Cá vàng có hai màng đuôi; cá nóc dùng vây lưng nhỏ phía sau. Mắt có mống mắt tối, đồng tử và điểm phản sáng nhỏ, thêm miệng và đường nắp mang. Chọn cá để camera tiến gần và theo dõi; “Góc ban đầu” trở về toàn cảnh.

Nguồn tham khảo hình dáng cá nóc: [Zoo Basel](https://www.zoobasel.ch/de/aktuelles/news/778/der-kugelfisch-ein-aufgeblasener-kerl/). Không đưa ảnh bên ngoài vào ứng dụng; toàn bộ mô hình và texture được dựng bằng mã.

`node scripts/check-fish-realism.mjs` kiểm tra từng loài trong Chrome: cảnh 3D, chọn cá, đổi góc, tạm dừng/tiếp tục và chế độ nhẹ. Ảnh kiểm tra: `shots/realistic-fish-gold.png`, `shots/realistic-fish-clown.png`, `shots/realistic-fish-puffer.png`. Phần hồ 2D tiếp tục dùng bộ hình vector riêng.
