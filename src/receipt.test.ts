// Chạy: npm test
import assert from 'node:assert/strict';
import { parseReceiptText } from './receipt';
import { today } from './format';

// Hóa đơn quán cà phê: có tiền khách đưa lớn hơn tổng.
let r = parseReceiptText(`HIGHLANDS COFFEE
123 Nguyễn Huệ, Q.1
ĐT: 02838123456
Ngày: 05/03/2024 14:32  Số HĐ: 00012345
Phin sữa đá     1    35.000
Bánh mì que     2    38.000
Tạm tính            73.000
VAT 8%               5.840
Tổng cộng           78.840
Tiền khách đưa     100.000
Tiền thối           21.160`);
assert.equal(r.total, 78840);
assert.equal(r.date, '2024-03-05');
assert.equal(r.merchant, 'HIGHLANDS COFFEE');
assert.equal(r.category, 'food');
assert.equal(r.readable, true);

// OCR tách nhãn và số thành hai dòng; số không có dấu phân cách.
r = parseReceiptText(`Cửa hàng xăng dầu số 5\nThanh toán\n250000\nMST: 0301234567`);
assert.equal(r.total, 250000);
assert.equal(r.category, 'transport');
assert.equal(r.date, today());

// Không có nhãn tổng: lấy số lớn nhất, không lấy số điện thoại hay tiền khách đưa.
r = parseReceiptText(`Tạp hóa Cô Ba\nHotline 0909123456\nMì gói 12,000\nDầu ăn 58,000\nKhách đưa 100,000`);
assert.equal(r.total, 58000);

// Ảnh không có số tiền.
r = parseReceiptText('Xin chào\nCảm ơn quý khách');
assert.equal(r.readable, false);
assert.equal(r.total, 0);

// Ngày trong tương lai hoặc sai thì dùng hôm nay.
assert.equal(parseReceiptText('Tổng 50.000\n31/02/2024').date, today());

console.log('receipt: ok');
