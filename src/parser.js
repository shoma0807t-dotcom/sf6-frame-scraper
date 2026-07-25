/**
 * src/parser.js
 * フレーム表のテーブルを解析し、技データを抽出するモジュール
 */

export async function parseFrameData(page, character) {
  // テーブルが表示されるまで最大30秒待機
  await page.waitForSelector('table', { state: 'visible', timeout: 30000 });

  // ブラウザコンテキスト内でDOMを解析
  const movesData = await page.evaluate((charInfo) => {
    const results = [];
    
    // ページ内のすべてのテーブルを取得（通常技、必殺技などで表が分かれているケースに対応）
    const tables = document.querySelectorAll/**
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
      // ヘッダー行を取得
      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headerRow) return;

      const headers = Array.from(headerRow.querySelectorAll('th, td')).map(th => th.textContent.trim());
      const findColumnIndex = (keyword) => headers.findIndex(h => h.includes(keyword));

      const colIndexes = {
        name: findColumnIndex('技名'),
        startup: findColumnIndex('発生'),
        active: findColumnIndex('持続'),
        recovery: findColumnIndex('全体') !== -1 ? findColumnIndex('全体') : findColumnIndex('硬直'),
        hit: findColumnIndex('ヒット'),
        guard: findColumnIndex('ガード')
      };

      if (colIndexes.name === -1) {
        colIndexes.name = 0;
      }

      // データ行を取得
      const rows = table.querySelectorAll('tbody tr');
      const dataRows = rows.length > 0 ? rows : Array.from(table.querySelectorAll('tr')).slice(1);

      dataRows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length === 0) return;

        const getCellText = (index) => {
          if (index === -1 || !cells[index]) return '';
          return cells[index].textContent.trim();
        };

        // 技名の抽出
        let moveName = '';
        const nameCell = cells[colIndexes.name];
        if (nameCell) {
          moveName = nameCell.textContent.replace(/\s+/g, '').trim();
        }

        if (!moveName) return;

        // 指定された新しいクラス名から直接要素を取得（末尾のハッシュやundefinedなどの変化に対応するため部分一致を使用）
        const startupEl = row.querySelector('.frame_startup_frame__Dc2Ph');
        const activeEl = row.querySelector('.frame_active_frame__6Sovc');
        const recoveryEl = row.querySelector('.frame_recovery_frame__CznJj');
        const hitEl = row.querySelector('[class*="frame_hit_frame__K7xOz"]');
        const guardEl = row.querySelector('[class*="frame_block_frame__SfHiW"]');
        const noteEl = row.querySelector('.frame_note__hfwBr');

        // 各データの組み立て（クラスから取れなければ従来のセル位置からフォールバック）
        const moveData = {
          characterName: charInfo.name,
          moveName: moveName,
          startup: startupEl ? startupEl.textContent.trim() : getCellText(colIndexes.startup),
          active: activeEl ? activeEl.textContent.trim() : getCellText(colIndexes.active),
          recovery: recoveryEl ? recoveryEl.textContent.trim() : getCellText(colIndexes.recovery),
          hit: hitEl ? hitEl.textContent.trim() : getCellText(colIndexes.hit),
          guard: guardEl ? guardEl.textContent.trim() : getCellText(colIndexes.guard),
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

    tables.forEach(table => {
      // ヘッダー行を取得 (theadがあるか、単なる最初のtrかを判定)
      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headerRow) return;

      // ヘッダーのテキストを配列化して列番号を特定
      const headers = Array.from(headerRow.querySelectorAll('th, td')).map(th => th.textContent.trim());

      // キーワードが含まれる列のインデックス（列番号）を動的に探す関数
      const findColumnIndex = (keyword) => {
        return headers.findIndex(h => h.includes(keyword));
      };

      const colIndexes = {
        name: findColumnIndex('技名'),
        startup: findColumnIndex('発生'),
        active: findColumnIndex('持続'),
        recovery: findColumnIndex('全体'),
        hit: findColumnIndex('ヒット'),
        guard: findColumnIndex('ガード')
      };

      // 「技名」というヘッダーが明記されていない場合は、一番左の列(0)を技名とみなすフォールバック
      if (colIndexes.name === -1) {
        colIndexes.name = 0;
      }

      // データ行を取得（tbody内のtr、またはヘッダー行を除いたtr）
      const rows = table.querySelectorAll('tbody tr');
      const dataRows = rows.length > 0 ? rows : Array.from(table.querySelectorAll('tr')).slice(1);

      dataRows.forEach(row => {
        const cells = row.querySelectorAll('td, th'); // 行ヘッダー(th)が使われている場合も考慮
        if (cells.length === 0) return;

        // セルからテキストを取得するヘルパー関数
        const getCellText = (index) => {
          if (index === -1 || !cells[index]) return '';
          return cells[index].textContent.trim();
        };

        // 技名の抽出処理
        let moveName = '';
        const nameCell = cells[colIndexes.name];
        if (nameCell) {
          // textContent は内部の <img> タグなどを無視して文字だけを抽出してくれます。
          // さらに正規表現で改行や余計な空白をすべて除去します。（例: "立ち 弱P" -> "立ち弱P"）
          moveName = nameCell.textContent.replace(/\s+/g, '').trim();
        }

        // 技名が空の行（レイアウト調整用の空行など）はスキップ
        if (!moveName) return;

        // JSONのフォーマットに合わせたデータの組み立て
        const moveData = {
          characterName: charInfo.name,
          moveName: moveName,
          startup: getCellText(colIndexes.startup),
          active: getCellText(colIndexes.active),
          recovery: getCellText(colIndexes.recovery),
          hit: getCellText(colIndexes.hit),
          guard: getCellText(colIndexes.guard),
          // 要件定義通り、今回は取得しない項目は空文字にする
          counterHit: '',
          punishCounter: ''
        };

        results.push(moveData);
      });
    });

    return results;
  }, character); // 評価関数に character オブジェクトを引き渡す

  return movesData;
}