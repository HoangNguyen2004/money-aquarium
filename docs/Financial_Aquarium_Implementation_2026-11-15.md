# Financial Aquarium — phần triển khai ngày 15/11/2026

Nguồn định hướng: `Financial_Aquarium_Brainstorm_V1.md` do người dùng cung cấp. Đây là brainstorm, không phải quyết định triển khai toàn bộ. Phạm vi lần này là một luồng có thể dùng thử: ghi chép/rà soát → thức ăn → chăm cá; mục tiêu có khoản góp xác nhận → ngoại hình cư dân; nhịp chi tiêu → phản hồi nhẹ của hồ; cảnh 3D và đường lui 2D.

## Đã triển khai

| Mã ý tưởng | Phạm vi thực tế |
|---|---|
| A01–02, B08 | Nhịp chi tiêu dựa trên ngân sách dự kiến đến ngày hiện tại, loại giao dịch tương lai; không có ngân sách thì trạng thái trung tính; ảnh hưởng nhẹ tông nước, không chết cá/khóa tương tác. Có ghi rõ khoản chi cố định có thể làm chỉ báo tăng tạm thời. |
| A03–05 | Tạo/sửa mục tiêu, chọn cư dân đang sở hữu, ghi nhận khoản đã chuyển, lịch sử và hoàn tác. Một cư dân gắn tối đa một mục tiêu. Tiến độ = tổng khoản góp/target. Các mốc 25/50/100% tác động vây, màu vây và halo trong 3D. Cho ăn không tăng số tiền mục tiêu. |
| B01–03 | 6 phần thức ăn chào mừng; 3 phần cho giao dịch hợp lệ đầu ngày; 2 phần khi rà soát, kể cả ngày không phát sinh. Ledger dùng khóa ngày chống farm. Một lượt cho cả hồ ăn tốn 1 phần; tiến độ chăm sóc tăng tối đa một ngày/cư dân/ngày. Streak tính từ giao dịch hoặc rà soát; chưa thực hiện vé giữ streak. |
| C01 | Sổ tay đủ 20 records, lọc theo độ hiếm, ghi rõ loài chưa được triển khai bằng nhãn Sắp đến. Giữ 5 cư dân đã sở hữu, gồm tép ngoài danh mục 20, không làm mất dữ liệu cũ. Rùa tai vàng giữ nguyên thay vì biến thành rùa biển. |
| C03–04 | Chạm mesh hoặc nút tên để inspect, camera tiến lại nhẹ; 5 cư dân có hình thể và nhịp riêng. Cá dùng steering, giảm tốc, tìm mồi và phân tách nhẹ. |
| F02, F06–07 | Cảnh mesh 3D thực bằng React Three Fiber + Three.js, ánh sáng, fog, sàn, đá/cây và particles có chiều sâu. Có đổi góc, trở về góc mặc định, giảm particles/pixel ratio bằng Nhẹ máy, tạm dừng và chuyển 2D; lỗi canvas chuyển về 2D. Chưa có adaptive LOD/FPS tự động. |
| G01–03 | Luật tài chính, mục tiêu, reward, mô phỏng và rendering tách module; migration đồ ăn không reset cá/ví/tiến độ. Snapshot cũ không có goals vẫn đọc được. |

## Những phần chưa thực hiện

- Tài khoản, đồng bộ ngân hàng/cloud, server time, backend/idempotency đa thiết bị. Khoản góp do người dùng tự xác nhận, app không chuyển tiền và chưa đối soát ngân hàng.
- Khoản cố định dự kiến và ngoại lệ chi lớn: chỉ báo hiện dùng phép chia ngân sách theo ngày và có chú thích; không tự kết luận người dùng quản lý kém.
- Model GLB/rig artist, đủ 20 model hoàn thiện, các loài Neon/Betta/Manta làm mẫu theo đề xuất. Lượt này chuyển 5 cư dân đang có sang mesh dựng bằng mã, là nền 3D chạy được, chưa phải bộ asset art cuối cùng.
- Ấp trứng/rương, drop rate/pity, cá trùng, phối giống, hóa đơn/nợ/cá mập, âm thanh/haptics, gestures orbit/pinch, photo export và analytics.
- Café vẫn ngoài phạm vi theo yêu cầu đã chốt trước đó; không tự triển khai lại các mục H01–04.
- Fullscreen camera-only, bottom sheet inspect và 3D decoration gizmo chưa hoàn thiện; trang trí hiện chuyển sang 2D để đặt đúng vị trí và lưu lại.

## Dữ liệu và tương thích

- `Game.food` lưu tồn kho. `LedgerEntry.food` tùy chọn để giữ ledger cũ; không phát bù thức ăn vô hạn từ các ngày cũ đã nhận thưởng.
- `migrateGame()` cấp 6 phần chào mừng cho save cũ thiếu trường food đúng một lần; số 0 được giữ nguyên, không tự refill khi reload.
- `SavingGoal.contributions` là log có event ID; cùng event ID không cộng hai lần. Ghi nhận/hoàn tác không tạo income/expense và không tự thay đổi ngân sách.
- `Plan.savings` vẫn là dự kiến hàng tháng; `goals` là sổ xác nhận khoản góp thực tế do người dùng nhập. Không lấy phần ngân sách còn dư để điền goals.
- Khóa `cafeName` cũ vẫn giữ cho tương thích lưu trữ.

## Cấu trúc và stack

- `src/game/finance.ts`: nhịp chi tiêu và streak.
- `src/game/rules.ts`: reward, migration và tiêu thức ăn.
- `src/savings.ts`: kiểm tra mục tiêu, tổng khoản góp và tiến độ.
- `src/components/GoalsPanel.tsx`, `Bestiary.tsx`: thao tác mục tiêu, lịch sử và danh mục.
- `src/game/view/AquariumExperience.tsx`: chọn renderer, lazy-load và fallback.
- `src/game/view/three/`: mesh từng cư dân, camera, nước, ánh sáng và tương tác. Canvas có adapter web/native, `expo-gl` và `expo-asset` theo Expo SDK đang dùng.

Tham chiếu kỹ thuật: [React Three Fiber installation](https://r3f.docs.pmnd.rs/getting-started/installation), [Expo GLView](https://docs.expo.dev/versions/latest/sdk/gl-view/). Kiểm tra phiên bản thực tế qua `package-lock.json`, không giả định mọi API web đều chạy giống trên native.

Android/iOS cần build lại với native modules mới. Chưa xác minh trên thiết bị thật, không cam kết FPS/pin. Web 3D có lựa chọn Nhẹ máy và 2D dự phòng.


## Xác minh

- `npm run typecheck` và `npm test`: PASS; có thêm kiểm tra food ledger chống farm, giới hạn tăng trưởng, migration một lần, nhịp đầu/cuối tháng, streak, khoản góp có event ID, hoàn tác tiến độ, lưu/đọc mục tiêu và catalog 20 ID duy nhất.
- Web export dưới `/money-aquarium/`: PASS.
- Chrome 390px và 1024px: Canvas 3D thực sự khởi tạo, không rơi về fallback; cho ăn/pause/Chỉ ngắm; chuyển 2D, chọn cá, cửa hàng/kho; tạo goal 1 triệu, góp 300 nghìn = 30%, transaction/food không bị sửa; lọc 20 records và 1 loài sự kiện: PASS.
- Android JS/assets export: PASS. Đây không phải APK mới và không xác nhận GL chạy được trên điện thoại thật.
