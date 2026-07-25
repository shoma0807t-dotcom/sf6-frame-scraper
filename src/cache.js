/**
 * src/cache.js
 * キャラクターごとのフレームデータをキャッシュ・読み込みするモジュール
 */

import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = 'cache';

// JST（日本時間）での今日の日付文字列 (YYYY-MM-DD) を取得するヘルパー
function getTodayJST() {
  const now = new Date();
  const jstDate = new Date(now.getTime() + ((now.getTimezoneOffset() + (9 * 60)) * 60 * 1000));
  return jstDate.toISOString().split('T')[0];
}

export async function checkCache(slug) {
  const filePath = path.join(CACHE_DIR, `${slug}.json`);

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const cachedObj = JSON.parse(fileContent);

    // キャッシュの日付が今日(JST)と一致するか確認
    if (cachedObj.date === getTodayJST()) {
      return cachedObj.data;
    }
    
    // 日付が古い場合はキャッシュ無効として扱う
    return null;

  } catch (error) {
    // ファイルが存在しない (ENOENT) などのエラーはキャッシュなしとして正常に返す
    if (error.code === 'ENOENT') {
      return null;
    }
    console.warn(`キャッシュの読み込み中にエラーが発生しました (${slug}):`, error.message);
    return null;
  }
}

export async function saveCache(slug, data) {
  const filePath = path.join(CACHE_DIR, `${slug}.json`);

  try {
    // キャッシュディレクトリが存在しない場合は作成
    await fs.mkdir(CACHE_DIR, { recursive: true });

    // 日付情報とともにデータをラップして保存
    const cachePayload = {
      date: getTodayJST(),
      data: data
    };

    await fs.writeFile(filePath, JSON.stringify(cachePayload, null, 2), 'utf-8');

  } catch (error) {
    console.warn(`キャッシュの保存に失敗しました (${slug}):`, error.message);
    // キャッシュ保存の失敗はメイン処理を止めるべきではないため、throwはしない
  }
}