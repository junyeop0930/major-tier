// 사용법: node tools/merge.js <추가 학과 파일>
// 추가 파일에는 NEW_MAJORS, NEW_SOURCES, EXIST_ALIAS 가 있어야 함.
// index.html 안의 자료(TIERS·MAJORS·META)에 합쳐서 다시 쓴다.
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const re = /<script>\nconst TIERS[\s\S]*?\n<\/script>/;
const block = html.match(re);
if (!block) throw new Error('자료 블록을 못 찾음');
const load = src => new Function(src + ';return {TIERS:typeof TIERS!=="undefined"?TIERS:null,MAJORS:typeof MAJORS!=="undefined"?MAJORS:null,META:typeof META!=="undefined"?META:null,NEW_MAJORS:typeof NEW_MAJORS!=="undefined"?NEW_MAJORS:null,NEW_SOURCES:typeof NEW_SOURCES!=="undefined"?NEW_SOURCES:null,EXIST_ALIAS:typeof EXIST_ALIAS!=="undefined"?EXIST_ALIAS:null,RENAME:typeof RENAME!=="undefined"?RENAME:null,REMOVE_ALIAS:typeof REMOVE_ALIAS!=="undefined"?REMOVE_ALIAS:null}')();
const cur = load(block[0].replace(/^<script>\n|\n<\/script>$/g, ''));
const add = load(fs.readFileSync(process.argv[2], 'utf8'));

const base = cur.META.sources.length;
const ids = new Set(cur.MAJORS.map(m => m.id));
add.NEW_MAJORS = add.NEW_MAJORS || []; add.NEW_SOURCES = add.NEW_SOURCES || [];
for (const m of add.NEW_MAJORS) {
  if (ids.has(m.id)) throw new Error('id 겹침: ' + m.id);
  for (const s of m.src || []) if (s >= base + add.NEW_SOURCES.length) throw new Error('없는 출처 번호: ' + m.id + ' ' + s);
  if (!['S', 'A', 'B', 'C', 'D'].includes(m.tier)) throw new Error('티어 오류: ' + m.id);
}
for (const [id, al] of Object.entries(add.EXIST_ALIAS || {})) {
  const m = cur.MAJORS.find(x => x.id === id);
  if (m) m.alias = [...new Set([...(m.alias || []), ...al])];
}
for (const [id, al] of Object.entries(add.REMOVE_ALIAS || {})) {
  const m = cur.MAJORS.find(x => x.id === id);
  if (m && m.alias) m.alias = m.alias.filter(a => !al.includes(a));
}
// 이름 바꾸기: 옛 이름은 검색용 alias로 남김
for (const [id, name] of Object.entries(add.RENAME || {})) {
  const m = cur.MAJORS.find(x => x.id === id);
  if (!m) throw new Error('없는 id: ' + id);
  if (m.name !== name) m.alias = [...new Set([...(m.alias || []), m.name])];
  m.name = name;
}
const MAJORS = [...cur.MAJORS, ...add.NEW_MAJORS];
const META = { ...cur.META, sources: [...cur.META.sources, ...add.NEW_SOURCES] };

const fmtMajor = m => '  ' + JSON.stringify(m).replace(/"([a-z]+)":/g, '$1:');
const out = '<script>\nconst TIERS = ' + JSON.stringify(cur.TIERS, null, 2) + ';\n\nconst MAJORS = [\n' +
  cur.TIERS.map(t => '  // ===== ' + t.id + ' =====\n' + MAJORS.filter(m => m.tier === t.id).map(fmtMajor).join(',\n')).join(',\n\n') +
  '\n];\n\nconst META = ' + JSON.stringify(META, null, 2) + ';\n</script>';
fs.writeFileSync(file, html.replace(re, () => out));
console.log('학과', MAJORS.length, '출처', META.sources.length);
