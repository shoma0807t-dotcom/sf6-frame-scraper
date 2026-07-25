/**
 * src/characters.js
 * 公式サイトからキャラクター一覧を動的に取得するモジュール
 */

export async function getCharacterList(page) {
  const TARGET_URL = 'https://www.streetfighter.com/6/ja-jp/character';

  try {
    // ページへ遷移し、ネットワークがアイドル状態になるまで待機
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

    // ページ内でDOM要素を解析してキャラクター情報を抽出
    const characters = await page.evaluate(() => {
      const charaList = [];
      
      // URLに '/character/' を含むaタグをすべて取得
      const links = document.querySelectorAll('a[href*="/character/"]');

      links.forEach(link => {
        const href = link.getAttribute('href');

        // 正規表現でslugを抽出 (例: /6/ja-jp/character/mai/ -> mai)
        const match = href.match(/\/character\/([^/?#]+)/);
        if (!match) return;

        const slug = match[1];

        // ヘッダーやフッターなどのナビゲーションリンクによる重複を防止
        if (charaList.some(c => c.slug === slug)) return;

        // 【注意】実際のHTML構造に合わせて日本語名の取得ロジックは調整が必要です。
        // ※公式サイトの構造上、テキスト要素がネストされていたり、
        // 画像のalt属性に名前が入っていたりするケースを想定したフォールバック処理です。
        let name = '';
        const nameElement = link.querySelector('.char-name, p, span, img[alt]'); 
        
        if (nameElement) {
          name = nameElement.alt || nameElement.textContent;
        } else {
          name = link.textContent;
        }

        // 改行や余計な空白を除去
        name = name.replace(/\s+/g, '').trim();

        // 取得できなければ一旦slugをそのまま入れる
        charaList.push({ 
          slug: slug, 
          name: name || slug 
        });
      });

      return charaList;
    });

    return characters;
  } catch (error) {
    throw new Error(`キャラクター一覧の取得に失敗しました: ${error.message}`);
  }
}