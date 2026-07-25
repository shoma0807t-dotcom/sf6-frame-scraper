/**
 * src/exporter.js
 * 抽出したデータをファイルとして出力するモジュール
 */

import fs from 'fs/promises';
import path from 'path';

export async function saveJson(filePath, data) {
  try {
    // ファイルパスからディレクトリ部分を取得
    const dir = path.dirname(filePath);

    // ディレクトリが存在しない場合は作成（recursive: true で深い階層も安全に作成）
    await fs.mkdir(dir, { recursive: true });

    // JSONを文字列化（インデント2スペースで可読性を確保）
    const jsonString = JSON.stringify(data, null, 2);

    // ファイルへ書き込み
    await fs.writeFile(filePath, jsonString, 'utf-8');

  } catch (error) {
    throw new Error(`JSONファイルの保存に失敗しました (${filePath}): ${error.message}`);
  }
}