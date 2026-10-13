#!/usr/bin/env node
/**
 * GATE5 UNIT Validator
 * new_4.html registry와 실제 파일을 교차 검증한다.
 *
 * 검증 항목:
 *   A. published/hold 상태는 file 속성 필수
 *   B. file 참조 파일이 public/theory/<file>에 실제 존재
 *   C. UNIT ID와 파일명 번호 일치 (id=05-02 → file=unit-05-02_...)
 *   D. 서로 다른 UNIT이 동일 파일 참조 (중복)
 *   E. pending인데 file 있으면 WARNING
 *   F. published인데 file 없으면 FAIL
 *   G. hold는 _HOLD_VERIFY_ 파일 참조
 *   H. published는 _FINAL_PUBLISH_ 파일 참조
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// new_4.html에서 UNITS 배열 추출
const html = readFileSync(join(ROOT, 'public/theory/new_4.html'), 'utf-8');
const match = html.match(/const UNITS\s*=\s*\[([\s\S]*?)\];/);
if (!match) {
  console.error('[FATAL] UNITS array not found in new_4.html');
  process.exit(1);
}

// JS 객체를 JSON으로 변환 (단따옴표 → 큰따옴표, trailing comma 제거)
let raw = '[' + match[1] + ']';
raw = raw
  .replace(/\/\/[^\n]*/g, '')           // 주석 제거
  .replace(/'/g, '"')                    // 단따옴표 → 큰따옴표
  .replace(/,(\s*[\]\}])/g, '$1')       // trailing comma 제거
  .replace(/(\w+):/g, '"$1":');         // key → "key"

let units;
try {
  units = JSON.parse(raw);
} catch (e) {
  console.error('[FATAL] Failed to parse UNITS array:', e.message);
  process.exit(1);
}

// 결과 집계
let pass = 0, fail = 0, warn = 0;
const fileRefMap = {}; // file → [id, ...] 중복 체크용
const results = [];

for (const unit of units) {
  const { id, title, status, file } = unit;
  const unitNum = id; // ex: '04-01'
  const issues = [];

  // E. pending인데 file 있으면 WARNING
  if (status === 'pending' && file) {
    issues.push(`WARN: pending 상태인데 file 속성 있음 → ${file}`);
    warn++;
  }

  // F. published인데 file 없으면 FAIL
  if (status === 'published' && !file) {
    issues.push('FAIL: published 상태인데 file 없음');
    fail++;
  }

  // A. hold인데 file 없으면 FAIL
  if (status === 'hold' && !file) {
    issues.push('FAIL: hold 상태인데 file 없음');
    fail++;
  }

  if (file) {
    // B. 실제 파일 존재 확인
    const filePath = join(ROOT, 'public/theory', file);
    if (!existsSync(filePath)) {
      issues.push(`FAIL: 파일 없음 → public/theory/${file}`);
      fail++;
    }

    // C. UNIT ID와 파일명 번호 일치
    const idParts = unitNum.split('-'); // ['04','01']
    const expectedPrefix = `unit-${idParts[0]}-${idParts[1]}`;
    if (!file.startsWith(expectedPrefix)) {
      issues.push(`FAIL: ID 불일치 → id=${unitNum}, file=${file} (기대: ${expectedPrefix}_...)`);
      fail++;
    }

    // G. hold → _HOLD_VERIFY_
    if (status === 'hold' && !file.includes('_HOLD_VERIFY_')) {
      issues.push(`FAIL: hold 파일이 _HOLD_VERIFY_ 미포함 → ${file}`);
      fail++;
    }

    // H. published → _FINAL_PUBLISH_
    if (status === 'published' && !file.includes('_FINAL_PUBLISH_')) {
      issues.push(`FAIL: published 파일이 _FINAL_PUBLISH_ 미포함 → ${file}`);
      fail++;
    }

    // D. 중복 참조
    if (!fileRefMap[file]) fileRefMap[file] = [];
    fileRefMap[file].push(unitNum);
  }

  const hasIssue = issues.some(i => i.startsWith('FAIL') || i.startsWith('WARN'));
  if (!hasIssue && (status === 'pending')) {
    // pending 정상
    results.push(`  ${unitNum}  (${status})  [SKIP - no file expected]`);
  } else if (!hasIssue) {
    pass++;
    results.push(`  ${unitNum}  ${status === 'hold' ? 'HOLD' : 'PASS'}  ${file}`);
  } else {
    results.push(`  ${unitNum}  ${issues.join('\n         ')}`);
  }
}

// D. 중복 참조 최종 체크
let dupFail = 0;
for (const [file, ids] of Object.entries(fileRefMap)) {
  if (ids.length > 1) {
    console.error(`FAIL: 중복 파일 참조 → ${file} ← ${ids.join(', ')}`);
    dupFail++;
    fail++;
  }
}

// ──────────────── 출력 ────────────────
console.log('\n[GATE5 UNIT VALIDATION]\n');
for (const r of results) console.log(r);

console.log('\n──────────────────────────────');
console.log(`FILE MISSING   : ${units.filter((u,_,__) => u.file && !existsSync(join(ROOT, 'public/theory', u.file))).length}`);
console.log(`ID MISMATCH    : ${units.filter(u => {
  if (!u.file) return false;
  const [p,n] = u.id.split('-');
  return !u.file.startsWith(`unit-${p}-${n}`);
}).length}`);
console.log(`DUPLICATE FILE : ${dupFail}`);
console.log(`STATUS ERROR   : ${fail - dupFail}`);
console.log(`WARNINGS       : ${warn}`);
console.log('──────────────────────────────');

if (fail > 0) {
  console.log('\nRESULT: FAIL\n');
  process.exit(1);
} else if (warn > 0) {
  console.log('\nRESULT: PASS (with warnings)\n');
} else {
  console.log('\nRESULT: PASS\n');
}
