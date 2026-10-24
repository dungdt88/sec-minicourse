// FR-M-08: per-child PDF, team CSV and JSON.
import { useState } from 'react';
import { activeProfiles } from '../derive';
import { childPdf, download, exportCsv, exportJson } from '../exports';
import { useMentor } from '../MentorApp';

export function ExportsPage() {
  const { data, contents, active, notify } = useMentor();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <>
      <h1>Xuất dữ liệu</h1>
      <h2>Phiếu PDF của từng con</h2>
      <p className="lead">Câu hỏi, câu trả lời, thời gian trả lời và số lần sửa, theo từng màn, kèm kết quả Bài về nhà.</p>
      <div className="m-row">
        {activeProfiles(data).map((p) => (
          <button
            key={p.id}
            className="m-btn"
            disabled={busy != null}
            onClick={async () => {
              setBusy(p.id);
              try {
                download(`${p.displayName}-phieu-tra-loi.pdf`, await childPdf(data, p.id, contents, active));
              } catch (e) {
                notify(`Không tạo được PDF: ${(e as Error).message}`);
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === p.id ? 'Đang tạo…' : `📄 ${p.avatar} ${p.displayName}`}
          </button>
        ))}
      </div>
      <h2>Toàn đội</h2>
      <p className="lead">Hồ sơ (không có mã), lượt đố, mọi phiên bản câu trả lời, thời gian. Không có mã PIN nào trong file.</p>
      <div className="m-row">
        <button className="m-btn" onClick={() => exportCsv(data, contents, active)}>
          CSV (5 file)
        </button>
        <button className="m-btn" onClick={() => exportJson(data)}>
          JSON
        </button>
      </div>
    </>
  );
}
