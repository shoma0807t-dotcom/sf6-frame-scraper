/**
 * src/parser.js
 * フレーム表のテーブルを解析し、技データを抽出するモジュール
 */

export async function parseFrameData(page, character) {
  // テーブルまたはフレームデータの要素が表示されるまで最大30秒待機
  await page.waitForSelector('table, [class*="frame_"]', { state: 'visible', timeout: 30000 });

  // ブラウザコンテキスト内でDOMを解析
  const movesData = await page.evaluate((charInfo) => {
    const results = [];
    
    // ページ内のすべてのテーブルを取得
    const tables = document.querySelectorAll('table');

    tables.forEach(table => {
      // データ行を取得（tbody内のtr、またはすべてのtrからヘッダーっぽいものを除外）
      const rows = table.querySelectorAll('tbody tr');
      const dataRows = rows.length > 0 ? rows : Array.from(table.querySelectorAll('tr')).slice(1);

      dataRows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length === 0) return;

        // 技名の抽出（クラス名または一番最初のセルから取得）
        let moveName = '';
        const nameEl = row.querySelector('.frame_skill__tLJuM span, .frame_arts__ZU5YI') || cells[0];
        if (nameEl) {
          moveName = nameEl.textContent.replace(/\s+/g, '').trim();
        }

        if (!moveName) return;

        // ご提示いただいたHTMLの正確なクラス名から直接要素を取得
        const startupEl = row.querySelector('.frame_startup_frame__Dc2Ph');
        const activeEl = row.querySelector('.frame_active_frame__6Sovc');
        const recoveryEl = row.querySelector('.frame_recovery_frame__CznJj');
        const hitEl = row.querySelector('[class*="frame_hit_frame"]');
        const guardEl = row.querySelector('[class*="frame_block_frame"]');
        const noteEl = row.querySelector('.frame_note__hfwBr');

        // 各データの組み立て
        const moveData = {
          characterName: charInfo.name,
          moveName: moveName,
          startup: startupEl ? startupEl.textContent.trim() : '',
          active: activeEl ? activeEl.textContent.trim() : '',
          recovery: recoveryEl ? recoveryEl.textContent.trim() : '',
          hit: hitEl ? hitEl.textContent.trim() : '',
          guard: guardEl ? guardEl.textContent.trim() : '',
          counterHit: '',
          punishCounter: '',
          note: noteEl ? noteEl.textContent.trim() : ''
        };

        results.push(moveData);
      });
    });

    return results;
  }, character);

  return movesData;
}