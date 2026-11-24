// 사용법: node tools/merge-extra.js <파일> [<파일> ...]
// 파일에는 EXTRA_* = { id: {learn, hs, hard, math, grad, license, why, parts} } 와 CONFUSE = [{a,b,text}] 가 있음.
// index.html 안 MAJORS의 각 학과에 칸을 덮어쓰고, CONFUSE는 META.confuse 로 넣는다.
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const re = /<script>\nconst TIERS[\s\S]*?\n<\/script>/;
const block = html.match(re);
if (!block) throw new Error('자료 블록을 못 찾음');
const cur = new Function(block[0].replace(/^<script>\n|\n<\/script>$/g, '') + ';return {TIERS,MAJORS,META}')();

const extra = {}; let confuse = null;
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, 'utf8');
  const names = [...src.matchAll(/const\s+(EXTRA_\w+|EXTRA|CONFUSE)\s*=/g)].map(m => m[1]);
  const got = new Function(src + ';return {' + names.join(',') + '}')();
  for (const n of names) { if (n === 'CONFUSE') confuse = got[n]; else Object.assign(extra, got[n]); }
}
const FIELDS = ['learn', 'hs', 'hard', 'math', 'grad', 'license', 'why', 'parts'];
const ids = new Set(cur.MAJORS.map(m => m.id));
for (const id of Object.keys(extra)) if (!ids.has(id)) throw new Error('없는 id: ' + id);
const missing = cur.MAJORS.filter(m => !extra[m.id]).map(m => m.id);
if (missing.length) console.warn('칸이 없는 학과:', missing.join(', '));
for (const m of cur.MAJORS) {
  const x = extra[m.id]; if (!x) continue;
  for (const k of FIELDS) if (x[k] !== undefined) m[k] = x[k];
  if (m.math && !['high', 'mid', 'low'].includes(m.math)) throw new Error('math 값 오류: ' + m.id);
  if ((m.why || []).some(w => /계열 취업률/.test(w))) throw new Error('계열 취업률 줄 남음: ' + m.id);
}
if (confuse) {
  for (const c of confuse) if (!ids.has(c.a) || !ids.has(c.b)) throw new Error('CONFUSE id 오류: ' + c.a + ' ' + c.b);
  cur.META.confuse = confuse;
}
const fmtMajor = m => '  ' + JSON.stringify(m).replace(/"([a-z]+)":/g, '$1:');
const out = '<script>\nconst TIERS = ' + JSON.stringify(cur.TIERS, null, 2) + ';\n\nconst MAJORS = [\n' +
  cur.TIERS.map(t => '  // ===== ' + t.id + ' =====\n' + cur.MAJORS.filter(m => m.tier === t.id).map(fmtMajor).join(',\n')).join(',\n\n') +
  '\n];\n\nconst META = ' + JSON.stringify(cur.META, null, 2) + ';\n</script>';
fs.writeFileSync(file, html.replace(re, () => out));
console.log('칸 넣은 학과', Object.keys(extra).length, '/ 헷갈리는 짝', (confuse || []).length);
