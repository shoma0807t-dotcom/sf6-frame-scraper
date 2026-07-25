/**
 * src/scrape.js
 * フレームデータ取得のメインプロセス
 */

import { chromium } from 'playwright';
import { getCharacterList } from './characters.js';
import { parseFrameData } from './parser.mjs';
import { saveJson } from './exporter.js'; // データの保存処理を委譲する想定
import { checkCache, saveCache } from './cache.js'; // キャッシュ管理モジュールを想定

// 並行処理の最大数（公式サイトへの負荷を考慮し3〜5程度を推奨）
const CONCURRENCY_LIMIT = 3;

// 実行時引数の解析
const args = process.argv.slice(2);
const targetCharIndex = args.indexOf('--character');
const targetChar = targetCharIndex !== -1 ? args[targetCharIndex + 1] : null;
const forceUpdate = args.includes('--force');

async function main() {
  console.log('スクレイピングを開始します...');
  const startTime = performance.now();

  const browser = await chromium.launch({ headless: false, slowMo: 50 }); // slowMoを入れると動作がゆっくりになり見やすくなります
  const context = await browser.newContext();

  try {
    // 1. キャラクター一覧の取得
    const mainPage = await context.newPage();
    let characters = await getCharacterList(mainPage);
    await mainPage.close();

    // --character オプションの処理
    if (targetChar) {
      characters = characters.filter(c => c.slug === targetChar);
      if (characters.length === 0) {
        throw new Error(`指定されたキャラクター "${targetChar}" が見つかりません。`);
      }
    }

    const allFrameData = [];
    const errors = [];
    let successCount = 0;

    // 2. キャラクターごとの処理関数
    const processCharacter = async (char) => {
      // キャッシュの確認（--forceがない場合）
      if (!forceUpdate) {
        const cachedData = await checkCache(char.slug);
        if (cachedData) {
          console.log(`${char.name}... (キャッシュ利用)`);
          allFrameData.push(...cachedData);
          successCount++;
          return;
        }
      }

      console.log(`実行中: ${char.name}...`);
      const page = await context.newPage();

      try {
        // ※実際のフレーム表URL構造に合わせて調整してください
        const frameUrl = `https://www.streetfighter.com/6/ja-jp/character/${char.slug}/frame`;
        
        const response = await page.goto(frameUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // HTTPステータスによるエラーハンドリング
        if (!response) throw new Error('Response is null');
        const status = response.status();
        if (status === 404) throw new Error('404 Not Found');
        if (status === 403) throw new Error('403 Forbidden');
        if (status >= 400) throw new Error(`HTTP Error ${status}`);

        // フレームデータの解析（parser.js）
        const charFrameData = await parseFrameData(page, char);
        
        if (!charFrameData || charFrameData.length === 0) {
          throw new Error('テーブルなし');
        }

        allFrameData.push(...charFrameData);
        await saveCache(char.slug, charFrameData); // 成功したらキャッシュへ保存
        successCount++;

      } catch (error) {
        // エラーの分類
        let errorType = '取得失敗';
        if (error.message.includes('Timeout')) errorType = 'Timeout';
        else if (error.message.includes('404')) errorType = '404';
        else if (error.message.includes('403')) errorType = '403';
        else if (error.message.includes('テーブルなし')) errorType = 'テーブルなし';

        console.error(`${char.name}... 失敗 [${errorType}]`);
        errors.push({ character: char.name, error: errorType, message: error.message });
      } finally {
        await page.close();
      }
    };

    // 3. 並行処理の制御（チャンクごとにPromise.allを実行）
    for (let i = 0; i < characters.length; i += CONCURRENCY_LIMIT) {
      const chunk = characters.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.all(chunk.map(processCharacter));
    }

    // 4. JSON化と出力
    // 更新日時はISO 8601 (JST) で出力
    const jstDate = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
    const outputPayload = {
      version: "Year3",
      updated: jstDate.toISOString().replace('Z', '+09:00'),
      frameRef: allFrameData
    };

    // 出力処理（exporter.js に委譲）
    await saveJson('output/frame-data.json', outputPayload);

    // 5. 実行結果のログ出力
    const durationSec = ((performance.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n完了`);
    console.log(`取得成功 ${successCount}`);
    if (errors.length > 0) {
      console.log(`失敗 ${errors.length}`);
      console.log('--- 失敗詳細 ---');
      errors.forEach(e => console.log(`- ${e.character}: ${e.error}`));
    }
    console.log(`${allFrameData.length}技取得`);
    console.log(`${durationSec}秒`);

  } catch (error) {
    console.error('致命的なエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// 実行
main();