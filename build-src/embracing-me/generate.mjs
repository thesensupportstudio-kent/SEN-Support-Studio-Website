import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { LOGO_GREEN_PNG_BASE64 } from '../logo-green.js';
import { TREE_ICON_GREEN_PNG_BASE64 } from '../tree-icon-green.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- Brand tokens (matching site/css/styles.css) ----------
const CREAM = rgb(0xF8 / 255, 0xF1 / 255, 0xDE / 255);
const CREAM_DARK = rgb(0xEE / 255, 0xE3 / 255, 0xC8 / 255);
const GREEN = rgb(0x2D / 255, 0x54 / 255, 0x39 / 255);
const GREEN_DARK = rgb(0x1F / 255, 0x3D / 255, 0x29 / 255);
const PALE_GREEN = rgb(0xC7 / 255, 0xD9 / 255, 0xCA / 255);
const MUTED_GREEN = rgb(0x5B / 255, 0x8A / 255, 0x63 / 255);
const OFFWHITE = rgb(0xFB / 255, 0xFA / 255, 0xF5 / 255);
// New warm accent introduced for this workbook only - complements the
// green/cream brand palette (autumn-leaf amber) and gives child-facing
// pages the extra warmth/energy the core site palette doesn't need.
const AMBER = rgb(0xCE / 255, 0x8A / 255, 0x2E / 255);
const AMBER_LIGHT = rgb(0xF4 / 255, 0xE1 / 255, 0xBB / 255);
const INK = rgb(0.13, 0.16, 0.13);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function icon(name) {
  return readFileSync(join(__dirname, 'icons', name + '.png'));
}

function wrapLine(font, size, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines = [];
  let current = '';
  words.forEach(function (word) {
    const test = current ? current + ' ' + word : word;
    if (current && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function wrapParagraphs(font, size, maxWidth, text) {
  const paragraphs = String(text || '').split(/\n{2,}/);
  let lines = [];
  paragraphs.forEach(function (para, i) {
    const paraLines = wrapLine(font, size, para.replace(/\n/g, ' '), maxWidth);
    lines = lines.concat(paraLines);
    if (i < paragraphs.length - 1) lines.push('');
  });
  return lines;
}

async function main() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle('Embracing Me - A Guide to Understanding, Growing, and Thriving');
  doc.setProducer('SEN Support Studio');

  const display = await doc.embedFont(readFileSync(join(__dirname, 'fonts/baloo2-extrabold.ttf')));
  const displayBold = await doc.embedFont(readFileSync(join(__dirname, 'fonts/baloo2-bold.ttf')));
  const body = await doc.embedFont(readFileSync(join(__dirname, 'fonts/urbanist-regular.ttf')));
  const bodySemi = await doc.embedFont(readFileSync(join(__dirname, 'fonts/urbanist-semibold.ttf')));
  const bodyBold = await doc.embedFont(readFileSync(join(__dirname, 'fonts/urbanist-bold.ttf')));

  const logoImg = await doc.embedPng(base64ToBytes(LOGO_GREEN_PNG_BASE64));
  const treeImg = await doc.embedPng(base64ToBytes(TREE_ICON_GREEN_PNG_BASE64));
  const icons = {};
  for (const name of ['eyes', 'nose', 'megaphone', 'hand', 'smile', 'seesaw', 'jumping']) {
    icons[name] = await doc.embedPng(icon(name));
  }

  const pages = []; // track every page for footer pass

  function newPage() {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: CREAM });
    pages.push(p);
    return p;
  }

  // Soft organic corner accents used on content-style pages, replacing the
  // original's teal blob shapes with brand pale-green ones.
  function softCorners(p, opts) {
    const o = opts || {};
    if (!o.skipTopLeft) {
      p.drawEllipse({ x: -30, y: PAGE_H - 40, xScale: 90, yScale: 70, color: PALE_GREEN, opacity: 0.5 });
    }
    if (!o.skipBottomRight) {
      p.drawEllipse({ x: PAGE_W + 20, y: 30, xScale: 110, yScale: 90, color: PALE_GREEN, opacity: 0.45 });
    }
  }

  function drawImageFit(p, img, x, y, maxW, maxH, align) {
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    let dx = x;
    if (align === 'center') dx = x + (maxW - w) / 2;
    p.drawImage(img, { x: dx, y: y + (maxH - h) / 2, width: w, height: h });
    return { w, h };
  }

  // ---------- Footer (every page except the cover) ----------
  function drawFooter(p, pageNum, totalPages) {
    const lineY = 46;
    p.drawLine({ start: { x: MARGIN, y: lineY }, end: { x: PAGE_W - MARGIN, y: lineY }, thickness: 1.25, color: PALE_GREEN });
    const iconH = 20;
    const iconW = iconH * (treeImg.width / treeImg.height);
    p.drawImage(treeImg, { x: MARGIN, y: lineY - 30, width: iconW, height: iconH });
    p.drawText('SEN SUPPORT STUDIO', { x: MARGIN + iconW + 8, y: lineY - 24, size: 8, font: bodyBold, color: MUTED_GREEN });
    const label = 'Page ' + pageNum + ' of ' + totalPages;
    const lw = body.widthOfTextAtSize(label, 8);
    p.drawText(label, { x: PAGE_W - MARGIN - lw, y: lineY - 24, size: 8, font: body, color: MUTED_GREEN });
  }

  // ================= COVER =================
  {
    const p = newPage();
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: GREEN });
    p.drawRectangle({ x: 26, y: 26, width: PAGE_W - 52, height: PAGE_H - 52, color: CREAM });

    drawImageFit(p, treeImg, 0, PAGE_H - 300, PAGE_W, 170, 'center');

    p.drawText('Embracing Me', {
      x: (PAGE_W - display.widthOfTextAtSize('Embracing Me', 52)) / 2,
      y: PAGE_H - 400, size: 52, font: display, color: GREEN
    });

    const sub = 'A Guide to Understanding, Growing, and Thriving';
    const subLines = wrapLine(bodySemi, 15, sub, 380);
    let sy = PAGE_H - 440;
    subLines.forEach(function (line) {
      p.drawText(line, { x: (PAGE_W - bodySemi.widthOfTextAtSize(line, 15)) / 2, y: sy, size: 15, font: bodySemi, color: MUTED_GREEN });
      sy -= 20;
    });

    p.drawRectangle({ x: 90, y: 210, width: PAGE_W - 180, height: 90, color: OFFWHITE, borderColor: PALE_GREEN, borderWidth: 1.5 });
    p.drawText('NAME:', { x: 112, y: 265, size: 12, font: bodyBold, color: GREEN });
    p.drawLine({ start: { x: 175, y: 262 }, end: { x: PAGE_W - 112, y: 262 }, thickness: 1, color: PALE_GREEN });
    p.drawText('YEAR:', { x: 112, y: 230, size: 12, font: bodyBold, color: GREEN });
    p.drawLine({ start: { x: 175, y: 227 }, end: { x: PAGE_W - 112, y: 227 }, thickness: 1, color: PALE_GREEN });

    const tag = 'Strong roots, space to flourish.';
    p.drawText(tag, { x: (PAGE_W - bodySemi.widthOfTextAtSize(tag, 12)) / 2, y: 130, size: 12, font: bodySemi, color: MUTED_GREEN });

    drawImageFit(p, logoImg, 0, 60, PAGE_W, 44, 'center');
  }

  // ================= CONTENTS =================
  {
    const p = newPage();
    const title = 'Contents';
    p.drawText(title, { x: MARGIN, y: PAGE_H - 100, size: 34, font: display, color: GREEN });

    const chapters = [
      'Understanding My Brain',
      'Sensory Processing and Regulation',
      'Emotions and Self-Regulation',
      'Socialising and Communication',
      'School and Learning',
      'Self-Advocacy and Self-Esteem',
      'My Personal Profile'
    ];
    let y = PAGE_H - 160;
    const rowH = 60;
    chapters.forEach(function (title, i) {
      const barColor = i % 2 === 0 ? GREEN : AMBER;
      p.drawRectangle({ x: MARGIN, y: y - 40, width: CONTENT_W, height: 44, color: barColor, opacity: 0.12 });
      p.drawEllipse({ x: MARGIN + 26, y: y - 18, xScale: 22, yScale: 22, color: barColor });
      const num = String(i + 1);
      p.drawText(num, {
        x: MARGIN + 26 - displayBold.widthOfTextAtSize(num, 18) / 2, y: y - 24,
        size: 18, font: displayBold, color: OFFWHITE
      });
      p.drawText(title, { x: MARGIN + 62, y: y - 23, size: 14, font: bodyBold, color: GREEN_DARK });
      y -= rowH;
    });
  }

  // ================= CHAPTER DIVIDER =================
  function chapterDivider(num, title, subtopics) {
    const p = newPage();
    softCorners(p);

    p.drawEllipse({ x: MARGIN + 34, y: PAGE_H - 110, xScale: 34, yScale: 34, color: GREEN });
    const numStr = String(num);
    p.drawText(numStr, {
      x: MARGIN + 34 - displayBold.widthOfTextAtSize(numStr, 28) / 2, y: PAGE_H - 122,
      size: 28, font: displayBold, color: OFFWHITE
    });

    const titleLines = wrapLine(display, 34, title, CONTENT_W - 90);
    let ty = PAGE_H - 100;
    titleLines.forEach(function (line) {
      p.drawText(line, { x: MARGIN + 80, y: ty, size: 34, font: display, color: GREEN });
      ty -= 40;
    });

    // "sticky note" style subtopic card, in amber instead of the original yellow
    const cardY = ty - 40;
    const cardH = subtopics.length * 46 + 40;
    p.drawRectangle({ x: MARGIN, y: cardY - cardH, width: CONTENT_W, height: cardH, color: AMBER_LIGHT, borderColor: AMBER, borderWidth: 1.5 });
    p.drawLine({ start: { x: MARGIN + 24, y: cardY - 20 }, end: { x: MARGIN + 24, y: cardY - cardH + 20 }, thickness: 2, color: AMBER });
    let sy = cardY - 34;
    subtopics.forEach(function (topic) {
      const lines = wrapLine(bodySemi, 13.5, topic, CONTENT_W - 90);
      lines.forEach(function (line, li) {
        if (li === 0) p.drawEllipse({ x: MARGIN + 24, y: sy - 4, xScale: 3, yScale: 3, color: GREEN });
        p.drawText(line, { x: MARGIN + 40, y: sy - 8, size: 13.5, font: bodySemi, color: GREEN_DARK });
        sy -= 20;
      });
      sy -= 6;
    });

    return p;
  }

  // ================= CONTENT PAGE =================
  function contentPage(heading, bodyText, opts) {
    const o = opts || {};
    const p = newPage();
    softCorners(p, { skipTopLeft: !!o.icon });

    let y = PAGE_H - 90;
    if (o.icon) {
      const { h } = drawImageFit(p, icons[o.icon], PAGE_W - MARGIN - 60, y - 44, 60, 60);
      p.drawText(heading, { x: MARGIN, y: y - 8, size: 21, font: displayBold, color: GREEN });
    } else {
      const headingLines = wrapLine(displayBold, 21, heading, CONTENT_W);
      headingLines.forEach(function (line) {
        p.drawText(line, { x: MARGIN, y, size: 21, font: displayBold, color: GREEN });
        y -= 26;
      });
      y += 6;
    }
    y -= 34;

    const lines = wrapParagraphs(body, 11.5, CONTENT_W, bodyText);
    const lineH = 17;
    lines.forEach(function (line) {
      if (y < 90) { p.drawText('', {}); } // no-op guard, pages are sized to fit
      if (line) p.drawText(line, { x: MARGIN, y, size: 11.5, font: body, color: INK });
      y -= lineH;
    });

    if (o.prompt) {
      y -= 8;
      const promptLines = wrapLine(bodyBold, 12, o.prompt, CONTENT_W - 20);
      p.drawRectangle({ x: MARGIN, y: y - promptLines.length * 17 - 6, width: CONTENT_W, height: promptLines.length * 17 + 24, color: PALE_GREEN, opacity: 0.35 });
      let py = y + 8;
      promptLines.forEach(function (line) {
        p.drawText(line, { x: MARGIN + 12, y: py - 12, size: 12, font: bodyBold, color: GREEN_DARK });
        py -= 17;
      });
    }
    return p;
  }

  // ================= SENSE PAGE (hyper/hypo lists) =================
  function sensePage(senseTitle, senseSub, hyper, hypo, iconName) {
    const p = newPage();
    softCorners(p, { skipTopLeft: true });

    let y = PAGE_H - 90;
    p.drawText('How my senses work', { x: MARGIN, y, size: 13, font: bodySemi, color: MUTED_GREEN });
    y -= 28;

    if (iconName) drawImageFit(p, icons[iconName], PAGE_W - MARGIN - 56, y - 40, 56, 56);
    const titleText = senseSub || senseTitle;
    const titleMaxW = PAGE_W - MARGIN * 2 - (iconName ? 70 : 0);
    let titleSize = 25;
    while (titleSize > 16 && displayBold.widthOfTextAtSize(titleText, titleSize) > titleMaxW) titleSize -= 1;
    p.drawText(titleText, { x: MARGIN, y: y - 6, size: titleSize, font: displayBold, color: GREEN });
    y -= 50;

    function section(label, items, tint) {
      p.drawRectangle({ x: MARGIN, y: y - 4, width: 190, height: 20, color: tint, opacity: 0.9 });
      p.drawText(label, { x: MARGIN + 8, y: y + 1, size: 11.5, font: bodyBold, color: OFFWHITE });
      y -= 30;
      items.forEach(function (item) {
        const lines = wrapLine(body, 10.8, item, CONTENT_W - 20);
        lines.forEach(function (line, li) {
          if (li === 0) p.drawEllipse({ x: MARGIN + 5, y: y + 3, xScale: 2.6, yScale: 2.6, color: MUTED_GREEN });
          p.drawText(line, { x: MARGIN + 16, y, size: 10.8, font: body, color: INK });
          y -= 15.5;
        });
        y -= 3;
      });
      y -= 14;
    }

    section('HYPERSENSITIVE (over-sensitive)', hyper, GREEN);
    section('HYPOSENSITIVE (under-sensitive)', hypo, AMBER);

    return p;
  }

  // ================= SENSES INTRO (icon grid) =================
  function sensesIntroPage(headingText, bodyText, promptText) {
    const p = newPage();
    softCorners(p, { skipTopLeft: true });
    let y = PAGE_H - 90;
    p.drawText(headingText, { x: MARGIN, y, size: 21, font: displayBold, color: GREEN });
    y -= 34;
    const lines = wrapParagraphs(body, 11.5, CONTENT_W, bodyText);
    lines.forEach(function (line) {
      if (line) p.drawText(line, { x: MARGIN, y, size: 11.5, font: body, color: INK });
      y -= 17;
    });

    y -= 24;
    const iconNames = ['eyes', 'megaphone', 'hand', 'nose', 'smile', 'seesaw', 'jumping'];
    const labels = ['Sight', 'Sound', 'Touch', 'Smell', 'Taste', 'Balance', 'Body Awareness'];
    const cols = 4;
    const cellW = CONTENT_W / cols;
    iconNames.forEach(function (name, i) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = MARGIN + col * cellW;
      const cy = y - row * 130;
      p.drawEllipse({ x: cx + cellW / 2, y: cy - 40, xScale: 46, yScale: 46, color: OFFWHITE, borderColor: PALE_GREEN, borderWidth: 1.5 });
      drawImageFit(p, icons[name], cx + cellW / 2 - 34, cy - 74, 68, 68, 'center');
      const lbl = labels[i];
      p.drawText(lbl, { x: cx + (cellW - bodySemi.widthOfTextAtSize(lbl, 10.5)) / 2, y: cy - 100, size: 10.5, font: bodySemi, color: GREEN_DARK });
    });

    const promptY = y - 2 * 130 - 20;
    p.drawRectangle({ x: MARGIN, y: promptY - 26, width: CONTENT_W, height: 34, color: AMBER_LIGHT });
    p.drawText(promptText, { x: MARGIN + 12, y: promptY - 16, size: 11.5, font: bodyBold, color: GREEN_DARK });

    return p;
  }

  // ================= NOTES PAGE =================
  function notesPage(promptText) {
    const p = newPage();
    p.drawEllipse({ x: PAGE_W - 60, y: PAGE_H - 70, xScale: 42, yScale: 42, color: PALE_GREEN, opacity: 0.5 });
    drawImageFit(p, treeImg, PAGE_W - 96, PAGE_H - 106, 72, 72, 'center');

    const label = promptText || 'Write or draw here';
    p.drawText(label, { x: MARGIN, y: PAGE_H - 90, size: 15, font: displayBold, color: GREEN });

    const top = PAGE_H - 140;
    const bottom = 100;
    const gap = 34;
    let y = top;
    p.drawLine({ start: { x: MARGIN + 18, y: top + 10 }, end: { x: MARGIN + 18, y: bottom - 10 }, thickness: 1.5, color: AMBER });
    while (y > bottom) {
      p.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: PALE_GREEN });
      y -= gap;
    }
    return p;
  }

  // ================= TOOLKIT TITLE PAGE (no 3rd-party logos) =================
  function toolkitTitlePage(titleLines, promptText) {
    const p = newPage();
    softCorners(p);

    drawImageFit(p, treeImg, 0, PAGE_H - 200, PAGE_W, 100, 'center');

    let y = PAGE_H - 260;
    titleLines.forEach(function (line) {
      const w = display.widthOfTextAtSize(line, 38);
      p.drawText(line, { x: (PAGE_W - w) / 2, y, size: 38, font: display, color: GREEN });
      y -= 46;
    });

    if (promptText) {
      const lines = wrapLine(bodySemi, 12.5, promptText, CONTENT_W - 60);
      let py = y - 20;
      lines.forEach(function (line) {
        const w = bodySemi.widthOfTextAtSize(line, 12.5);
        p.drawText(line, { x: (PAGE_W - w) / 2, y: py, size: 12.5, font: bodySemi, color: MUTED_GREEN });
        py -= 18;
      });
      y = py - 20;
    }

    const top = y - 10;
    const bottom = 100;
    let ly = top;
    while (ly > bottom) {
      p.drawLine({ start: { x: MARGIN + 30, y: ly }, end: { x: PAGE_W - MARGIN - 30, y: ly }, thickness: 1, color: PALE_GREEN });
      ly -= 34;
    }
    return p;
  }

  // ================= SENSORY PROFILE ACTIVITY (8 cups) =================
  function sensoryProfileActivity() {
    const p = newPage();
    let y = PAGE_H - 90;
    p.drawText('My Sensory Profile', { x: MARGIN, y, size: 25, font: displayBold, color: GREEN });
    y -= 32;
    const introLines = wrapParagraphs(body, 11, CONTENT_W,
      'Colour in the cups to show if you are Hypersensitive (over-sensitive) or Hyposensitive (under-sensitive) to each sense.\n\nHypersensitive = water spilling out of the cup. Hyposensitive = only a little water in the cup.\n\nHaving your cups filled, but not overflowing, can help you feel calm and not overwhelmed.');
    introLines.forEach(function (line) {
      if (line) p.drawText(line, { x: MARGIN, y, size: 11, font: body, color: INK });
      y -= 16;
    });

    const labels = ['Sight', 'Sound', 'Touch', 'Smell', 'Taste', 'Balance and\nMovement', 'Body\nAwareness', 'Interoception'];
    const cols = 4;
    const cellW = CONTENT_W / cols;
    const cupW = 60, cupH = 90;
    const gridTop = y - 50;
    labels.forEach(function (label, i) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = MARGIN + col * cellW + cellW / 2;
      const cyTop = gridTop - row * 170;
      const x0 = cx - cupW / 2;
      const yTop = cyTop;
      const yBot = cyTop - cupH;
      const cupTL = { x: x0, y: yTop };
      const cupTR = { x: x0 + cupW, y: yTop };
      const cupBR = { x: x0 + cupW - 8, y: yBot };
      const cupBL = { x: x0 + 8, y: yBot };
      [
        [cupTL, cupTR],
        [cupTR, cupBR],
        [cupBR, cupBL],
        [cupBL, cupTL],
      ].forEach(function (seg) {
        p.drawLine({ start: seg[0], end: seg[1], thickness: 1.75, color: MUTED_GREEN });
      });
      const lines = label.split('\n');
      let ly = yBot - 16;
      lines.forEach(function (line) {
        const w = bodySemi.widthOfTextAtSize(line, 10.5);
        p.drawText(line, { x: cx - w / 2, y: ly, size: 10.5, font: bodySemi, color: GREEN_DARK });
        ly -= 13;
      });
    });

    return p;
  }

  // ================= ADVOCACY PLAN ACTIVITY =================
  function fieldsActivity(title, fields, opts) {
    const o = opts || {};
    const p = newPage();
    let y = PAGE_H - 90;
    p.drawText(title, { x: MARGIN, y, size: 24, font: displayBold, color: GREEN });
    y -= 30;

    if (o.showName !== false) {
      p.drawText('Name:', { x: MARGIN, y, size: 11.5, font: bodyBold, color: GREEN_DARK });
      p.drawLine({ start: { x: MARGIN + 48, y: y - 3 }, end: { x: PAGE_W - MARGIN, y: y - 3 }, thickness: 1, color: PALE_GREEN });
      y -= 34;
    }

    const bottom = 90;
    const spaceLeft = y - bottom;
    const blockH = spaceLeft / fields.length;
    fields.forEach(function (field, i) {
      const blockTop = y - i * blockH;
      p.drawText(field, { x: MARGIN, y: blockTop, size: 12.5, font: bodyBold, color: GREEN });
      let ly = blockTop - 22;
      const linesInBlock = Math.max(2, Math.floor((blockH - 26) / 24));
      for (let li = 0; li < linesInBlock; li++) {
        p.drawLine({ start: { x: MARGIN, y: ly }, end: { x: PAGE_W - MARGIN, y: ly }, thickness: 1, color: PALE_GREEN });
        ly -= 24;
      }
    });
    return p;
  }

  // ================= ROLE MODELS =================
  function roleModelsPage() {
    const p = newPage();
    softCorners(p, { skipTopLeft: true });
    let y = PAGE_H - 90;
    p.drawText('Role Models', { x: MARGIN, y, size: 25, font: displayBold, color: GREEN });
    y -= 32;
    const introLines = wrapParagraphs(body, 11.5, CONTENT_W,
      'Finding role models who experience the world in a similar way to you can show you that there are many ways to succeed and live a happy life.\n\nHere are some well-known people with brains a bit like yours:');
    introLines.forEach(function (line) {
      if (line) p.drawText(line, { x: MARGIN, y, size: 11.5, font: body, color: INK });
      y -= 16;
    });

    const people = [
      ['Satoshi Tajiri', 'Creator of Pokémon'],
      ['Clay Marzo', 'Professional Surfer'],
      ['Ellie Middleton', 'Author'],
      ['Greta Thunberg', 'Environmental Activist']
    ];
    const cardTop = y - 26;
    const cols = 2;
    const cardW = (CONTENT_W - 20) / cols;
    const cardH = 78;
    people.forEach(function (person, i) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = MARGIN + col * (cardW + 20);
      const cyTop = cardTop - row * (cardH + 18);
      const tint = i % 2 === 0 ? PALE_GREEN : AMBER_LIGHT;
      p.drawRectangle({ x: cx, y: cyTop - cardH, width: cardW, height: cardH, color: tint, opacity: 0.55 });
      p.drawText(person[0], { x: cx + 16, y: cyTop - 32, size: 13.5, font: bodyBold, color: GREEN_DARK });
      p.drawText(person[1], { x: cx + 16, y: cyTop - 50, size: 10.5, font: body, color: MUTED_GREEN });
    });

    const promptY = cardTop - 2 * (cardH + 18) - 24;
    p.drawRectangle({ x: MARGIN, y: promptY - 24, width: CONTENT_W, height: 34, color: AMBER_LIGHT });
    p.drawText('Who are your role models?', { x: MARGIN + 12, y: promptY - 14, size: 11.5, font: bodyBold, color: GREEN_DARK });

    const top = promptY - 40;
    let ly = top;
    while (ly > 90) {
      p.drawLine({ start: { x: MARGIN, y: ly }, end: { x: PAGE_W - MARGIN, y: ly }, thickness: 1, color: PALE_GREEN });
      ly -= 26;
    }
    return p;
  }

  // ============================================================
  // Build the whole book, in the exact original page order
  // ============================================================

  chapterDivider(1, 'Understanding my Brain', [
    'What is Autism?', 'Autism Myths vs. Facts', 'Different Ways Autism Can Look and Feel', 'My Strengths as an Autistic Person'
  ]);

  contentPage('What is Autism?',
    'Autism is a way of thinking, feeling, and experiencing the world that is different from how many other people do. Your brain is wired in a unique way, which means you might notice things that others miss, have strong interests in certain topics, or find some situations overwhelming. Autism can affect how you understand emotions, communicate with others, and deal with sensory experiences like sounds, lights, and textures.\n\nAutism isn’t something that needs to be "fixed" - it’s just a different way of being. The world is made up of all kinds of brains, and yours is just as important as anyone else’s.');
  notesPage();

  contentPage('Autism Myths vs. Facts',
    'There are a lot of misunderstandings about autism. Some people believe things that aren’t true, which can make it harder for autistic people to feel accepted. Let’s look at some common myths and the real facts about autism:\n\nMyth: Autistic people don’t have emotions.\nFact: Autistic people feel emotions just as much (or even more than) others! Sometimes, it might be hard to show or explain feelings in a way that people understand or expect, but that doesn’t mean you don’t have them, or that you are not allowed to have big emotions.\n\nMyth: All autistic people are the same.\nFact: Every autistic person is different! Some love talking, while others prefer quiet. Some enjoy routines, and others don’t mind change. Autism is a spectrum, which means it looks different for everyone.\n\nMyth: Autism is something to "fix".\nFact: There is nothing wrong with being autistic - it’s part of who you are. The goal is never to change you, but to find ways to make life work for you.\n\nMyth: Autistic people can’t have friends or relationships.\nFact: Autistic people can have great friendships and relationships! You might socialise in a different way or need more time to connect with people, but that doesn’t mean you can’t build strong relationships.');
  notesPage();

  contentPage('Different Ways Autism Can Look and Feel',
    'Autism isn’t one single experience - it looks and feels different for everyone. Some autistic people:\n\nLove routines and predictability - knowing what will happen next feels safe and comfortable.\nAre very creative or love problem-solving - thinking differently can lead to amazing ideas.\nHave deep interests in specific topics - you might focus on something you love and learn everything about it.\nNeed more time to process conversations or instructions - your brain might take a little longer to sort through information, which is completely okay.\nExperience sensory things more strongly - lights might feel too bright, sounds too loud, or certain textures uncomfortable.\nCommunicate in different ways - you might prefer writing or using pictures instead of talking, or you may need extra time to put thoughts into words.\n\nYou might experience all of these things, just a few, or even different things not listed here. However you experience autism, it is valid and important.',
    { prompt: 'What things, either listed here or not, do you experience?' });
  notesPage();

  contentPage('My Strengths',
    'Being autistic comes with amazing strengths! Here are some of the things that make autistic people unique:\n\nAttention to detail - you might notice small things that other people miss, which can be a great skill in art, science, gaming, or problem-solving.\nDeep focus - when you’re interested in something, you can focus on it for hours and become an expert!\nCreativity and originality - many autistic people have unique ways of thinking, leading to brilliant ideas in writing, art, music, and technology.\nStrong memory - you might remember facts, numbers, patterns, or lyrics better than others.\nHonesty and loyalty - many autistic people are very honest, straightforward, and loyal friends.\nThinking differently - you might come up with solutions or ideas that no one else would think of.\nStrong sense of justice - autistic people often care deeply about fairness and doing the right thing.\n\nBy understanding how your brain works, you can use your strengths to help you in school, friendships, and life.',
    { prompt: 'What strengths do you think you have?' });
  notesPage();

  chapterDivider(2, 'Sensory Processing and Regulation', [
    'How my Senses Work', 'What Helps Me Feel Safe and Comfortable', 'Managing Overwhelm', 'Creating my Sensory Toolkit'
  ]);

  sensesIntroPage('How my senses work',
    'Some people experience the world differently because their senses can be more sensitive (hypersensitive) or less sensitive (hyposensitive) than other people’s. This can affect how things feel, sound, taste, smell, and look. You might be hypersensitive in some areas and hyposensitive in others! Your mood, tiredness, and energy levels can also affect how sensitive you are to your senses.',
    'Highlight what sensory experiences you have on the following pages.');

  sensePage('Sight', 'Sight', [
    'Bright lights (like classroom lights, car headlights, or sunlight) might hurt your eyes.',
    'Flickering or flashing lights (like in supermarkets or on screens) might feel distracting or stressful.',
    'Busy patterns or too many colours can feel overwhelming or confusing.',
    'You might notice tiny details that others miss (like a small stain on someone’s clothes or flickering on a screen).'
  ], [
    'You might not notice small visual details (like someone’s facial expressions or a sign on the wall).',
    'You may enjoy bright lights and colours because they give you more sensory input.',
    'You might have trouble judging distances (like reaching for something and missing it or misjudging steps on stairs).',
    'Things might sometimes look blurry or out of focus unless you move closer.'
  ], 'eyes');

  sensePage('Sound', 'Sound', [
    'Loud noises (like alarms, sirens, school bells, or shouting) might feel painful.',
    'Background noise (like ticking clocks, buzzing lights, or people talking) can be hard to ignore.',
    'Sudden sounds (like a dog barking or someone clapping) might make you jump or feel anxious.',
    'You might prefer quiet spaces and feel exhausted after being in noisy environments.'
  ], [
    'You might not notice when someone calls your name or speaks to you.',
    'You might enjoy loud music, banging objects, or making noise because it helps you focus.',
    'You might talk loudly without realising it, or enjoy repeating certain sounds.',
    'You might find silence uncomfortable and prefer to have background noise (like a fan, TV, or music).'
  ], 'megaphone');

  sensePage('Touch', 'Touch', [
    'Certain fabrics, clothing tags, or seams might feel unbearable.',
    'Light touches (like someone brushing past you) might feel painful or overwhelming.',
    'You might not like hugs or physical contact unless it’s on your terms.',
    'Washing, brushing hair, or cutting nails might feel too intense or uncomfortable.'
  ], [
    'You might not notice small injuries (like cuts or bruises) until later.',
    'You might seek out deep pressure (like tight hugs, weighted blankets, or squeezing things).',
    'You might enjoy touching different textures, like soft fabrics or rough surfaces.',
    'You might have a high pain tolerance and not react much to things like hot or cold temperatures.'
  ], 'hand');

  sensePage('Smell', 'Smell', [
    'Strong smells (like perfume, cleaning products, or food) might feel overwhelming or even make you feel sick.',
    'You might be able to smell things that others don’t notice (like a distant flower or someone’s shampoo).',
    'Smells can distract or upset you, making it hard to focus.',
    'You might avoid certain places (like canteens, supermarkets, or public toilets) because of strong odours.'
  ], [
    'You might not notice bad smells (like spoiled food or smoke).',
    'You may enjoy strong scents and seek them out (like smelling objects or certain food repeatedly).',
    'You might not react to things that others find too smelly (like strong perfumes or air fresheners).'
  ], 'nose');

  sensePage('Taste', 'Taste', [
    'Some foods might taste too strong, spicy, or bitter, even if other people think they’re mild.',
    'Certain textures (like mushy, crunchy, or slimy foods) might be unbearable.',
    'You might prefer plain foods with simple flavours.',
    'You might find eating in noisy or busy places (like the school canteen or hall) stressful.'
  ], [
    'You might not notice strong flavours and prefer very spicy or salty foods.',
    'You may enjoy chewy or crunchy textures because they give you more sensory input.',
    'You might not notice when food is too hot or too cold.'
  ], 'smile');

  sensePage('Balance and Movement', 'Balance and Movement (Vestibular)', [
    'Fast movements (like running, spinning, or going on rides) might feel scary or overwhelming.',
    'You might feel dizzy or unsteady easily.',
    'Walking on uneven surfaces (like grass or sand) might make you feel uncomfortable or unsafe.',
    'You might feel anxious about climbing, jumping, or moving too quickly.'
  ], [
    'You might love spinning, swimming, or running in circles because it feels good.',
    'You may not feel dizzy even after spinning a lot.',
    'You might rock back and forth or move around a lot to help your body feel balanced.',
    'You may need to fidget, tap your foot, or bounce to stay focused.'
  ], 'seesaw');

  sensePage('Body Awareness', 'Body Awareness (Proprioception)', [
    'You might feel uncomfortable with certain types of movement, like stretching or bending.',
    'You may struggle with sports or activities that require balance.',
    'You might feel "too aware" of your body, which can make you feel stiff or uncomfortable.'
  ], [
    'You might bump into things or misjudge distances.',
    'You might prefer to sit on your feet or not notice when holding something tightly.',
    'You may enjoy strong physical activities like jumping, climbing, or lifting heavy objects.',
    'You might need to press hard when writing or prefer tight clothes for a sense of pressure.'
  ], 'jumping');

  sensePage('Interoception', 'My Body’s Internal Signals', [
    'Hunger and Thirst: hunger or thirst might feel overwhelming, making it hard to focus.',
    'Temperature: you might feel extremely hot or cold in normal temperatures.',
    'Pain and Injury: small pains (like a scratch, bruise, or tight clothing) might feel very intense.',
    'Toileting: the feeling of needing the toilet might feel very urgent or uncomfortable.'
  ], [
    'Hunger and Thirst: you might forget to eat or drink because you don’t feel hunger or thirst strongly.',
    'Temperature: you might not notice when you’re too hot or too cold until someone else points it out.',
    'Pain and Injury: you might not notice or react to injuries (like cuts, bruises, or burns).',
    'Toileting: you might not notice or forget to go, until it’s urgent, because you don’t feel the signals strongly.'
  ], null);

  sensoryProfileActivity();

  contentPage('What Helps Me Feel Safe and Comfortable',
    'You may need certain things to feel comfortable and safe. Here are some ways people manage their sensory needs:\n\nWearing comfy clothes - some fabrics might feel too stretchy, tight, or loose, so choosing clothes that work for you can help.\nUsing headphones or ear defenders - you can use headphones for more sound input, or ear defenders to block out unwanted sounds.\nDimming lights or wearing sunglasses - bright or flickering lights can be uncomfortable, so adjusting lighting can help.\nUsing fidget tools - the right fidget tools (tailored to your needs) can help with focus and make your body feel calmer.\nChewing gum or eating crunchy foods - some people like strong tastes or chewing to help them focus and feel calm.\nMoving around - if your body needs movement, things like walking or stretching can help.',
    { prompt: 'What things do you think may help you feel safe and comfortable?' });
  notesPage();

  contentPage('Managing Overwhelm',
    'Sometimes, too much sensory input can lead to sensory overload. This means your brain is receiving too much information at once, and it can feel overwhelming, exhausting, or even painful.\n\nWhen this happens, you might feel:\nFrustrated or angry\nLike you need to escape or hide\nStuck and unable to think clearly\nLike your body is too full of energy, or completely frozen\n\nWhen you start feeling overwhelmed, try these strategies:\nStep away from the situation - find a quiet, safe space where you can calm down.\nUse your sensory toolkit - put on headphones, use a fidget tool, or wrap up in a soft blanket.\nTry deep pressure or movement - hug a pillow, squeeze a stress ball, or do a few big stretches.\nUse calming activities - listening to music or drawing can help you reset.\nTell someone how you feel - if you can, let a trusted person know that you need a break or some support.\n\nKnowing your sensory needs helps you take care of yourself. It’s okay to ask for adjustments and to do what helps you feel comfortable in different environments.',
    { prompt: 'What makes you feel overwhelmed? Who and what can help you when you feel overwhelmed?' });
  notesPage();

  contentPage('My Sensory Toolkit',
    'A sensory toolkit is a collection of things that help you feel comfortable and regulate your senses. It’s different for everyone, but here are some ideas:\n\nFor sound sensitivity: noise-cancelling headphones, calming music, or a quiet space.\nFor feeling overwhelmed: a weighted blanket or plushy, fidget tools, or deep breathing exercises.\nFor movement: a stress ball, stretchy bands, or a small trampoline.\nFor focus and comfort: sensory snack boxes, colouring books, or a soft fabric to touch.\n\nHaving a sensory toolkit means you have the things you need to feel better when the world feels too loud, too bright, or too overwhelming.',
    { prompt: 'Create your own sensory toolkit - think about what makes you feel calm and relaxed.' });
  toolkitTitlePage(['My', 'Sensory Toolkit'], 'Write or draw the things that help you feel calm and comfortable.');

  chapterDivider(3, 'Emotions and Self-Regulation', [
    'Understanding my Emotions', 'How to Explain my Feelings to Others', 'Strategies for Managing Anxiety and Overload', 'My Emotional Regulation Toolkit'
  ]);

  contentPage('Understanding my Emotions',
    'Emotions are feelings like happiness, sadness, excitement, anger, or worry. Everyone experiences emotions, but some people feel them in a very strong, overwhelming way, or struggle to recognise and describe them.\n\nWhy does this happen?\nTwo things can affect how some people experience emotions: interoception and alexithymia.\nInteroception is the sense that helps you notice what’s happening inside your body. It tells you if you’re hungry, thirsty, too hot, in pain, or feeling emotions. If your interoception signals are too weak, you might not notice you’re upset until you suddenly explode. If they are too strong, you might feel emotions so intensely that they take over.\nAlexithymia is when it’s hard to put feelings into words. You might know something is wrong but struggle to explain what or why. Instead of saying "I’m feeling worried", you might just feel restless or sick without knowing why.\n\nWhat does this look like in real life?\nFeeling fine one moment and suddenly overwhelmed because emotions build up without you noticing.\nGetting angry or frustrated without knowing why - maybe because you’re actually hungry or tired.\nHaving a hard time explaining feelings to others, or needing more time to figure them out.\nFeeling numb or disconnected from emotions, like they are distant or confusing.\n\nWhat can help?\nUsing an emotions chart with faces and words to identify how you feel.\nChecking in with your body - are you hungry? Tired? Too hot or cold?\nWriting or drawing how you feel, even if you don’t have the right words yet.');
  notesPage();

  contentPage('How to Explain my Feelings to Others',
    'It’s okay to need help with your emotions, but others can’t help unless they know what’s wrong. Sometimes, explaining feelings can be really hard, especially if you find it hard to put feelings into words.\n\nIdeas for ways you could communicate feelings:\nUsing simple phrases - "I feel bad but don’t know why", "Something is wrong".\nUsing visuals - pointing to an emotion chart or using a colour system to show people how you feel.\nUsing scripts - pre-written sentences like "I need space", or "I feel overwhelmed".\nUsing a communication card - a small card that says "I need a break" or "I need help".');
  notesPage();

  contentPage('Strategies for Managing Anxiety and Overload',
    'Anxiety is a feeling of worry or nervousness. Some people often feel anxious because the world is unpredictable, too overwhelming, or because they have social worries.\n\nWhat does anxiety feel like?\nA fast heartbeat or feeling shaky\nA tight chest or trouble breathing\nFeeling sick or dizzy\nThoughts racing too fast\nWanting to run away or hide\n\nWhat can help?\nPredictability - knowing what will happen next can ease anxiety. Using a visual timetable or checklist can help.\nSelf-soothing - having a "calm kit" or "sensory toolkit" with sensory tools, music, ear defenders, or comforting items.\nGrounding techniques - using the "5-4-3-2-1" method: name 5 things you see, 4 things you touch, 3 things you hear, 2 things you smell, 1 thing you taste.\nSafe spaces - finding a quiet place to go when overwhelmed (a corner, a room, or cuddled in a blanket).');
  notesPage();

  contentPage('My Emotional Regulation Toolkit',
    'An emotional regulation toolkit is a collection of strategies and items that help you manage your feelings when things feel too overwhelming, frustrating, or stressful. Everyone’s toolkit is unique, but here are some ideas:\n\nWhen you feel anxious or overwhelmed: try a deep breathing exercise, listen to calming music, or use a weighted blanket.\nWhen you feel frustrated or angry: squeeze a stress ball, rip up paper, or do some physical movement like star jumps or stretching.\nWhen you need to feel calm and safe: wrap yourself in a soft blanket, hold a comfort item, or use grounding techniques like naming 5 things you see, 4 things you touch, 3 things you hear, 2 things you smell, 1 thing you taste.\nWhen you need a break from people or noise: use noise-cancelling headphones, find a quiet space, or use a "do not disturb" signal.\nWhen you struggle to express your feelings: use an emotions chart, write in a journal, or draw how you feel.\n\nYour emotional regulation toolkit gives you the tools to feel more in control when emotions feel too big.',
    { prompt: 'Have a go at building yours with things that work best for you!' });
  toolkitTitlePage(['My Emotion', 'Regulation Toolkit'], 'Write or draw the strategies and items that help you feel calm.');

  chapterDivider(4, 'Socialising and Communication', [
    'Understanding my Communication Style', 'How to Set Boundaries and Say No', 'How to Explain my Needs to Others', 'Friendships: What Works for Me?'
  ]);

  contentPage('Understanding my Communication Style',
    'Socialising can be fun, interesting, confusing, exhausting, or even stressful - sometimes all at once! Some people experience socialising and communication differently to other people. This doesn’t mean something is wrong; it just means your brain processes social interactions in its own way.\n\nCommunication isn’t just about talking - it’s about how you process, understand, and respond to others. Some people may have a unique communication style that includes:\nLiteral thinking - if someone tells you something, you may believe it to be true without understanding any hidden messages or social cues. In the same way, if they do not tell you something, you may not know it to be true or assume it yourself. Literal thinkers can struggle to understand instructions unless they are given in a very clear, literal way.\nProcessing time - needing more time to think before responding.\nSocial energy - feeling drained after social interactions and needing recovery time.\n\nWhat does this look like in real life?\nNot noticing when people say things they don’t really mean (e.g. "Let’s hang out soon!" but they don’t plan to).\nStruggling with sarcasm, indirect hints, or vague language (e.g. "We’ll see" instead of a clear yes or no).\nNeeding extra time to form a response, especially in fast conversations.\nFinding small talk uninteresting but enjoying deep, meaningful conversations.\n\nWhat can help?\nAsking for clarity - "Do you mean that literally?"\nUsing scripts - pre-planned responses for common situations (e.g. "I need a moment to think before I answer").\nChoosing comfortable social settings - talking one-to-one instead of in big groups.\nGiving yourself processing time - saying "Let me think about that" instead of feeling pressured to answer quickly.\n\nYour communication style is valid, and you deserve to be understood.',
    { prompt: 'How do you like to communicate? What strategies would you like to try?' });
  notesPage();

  contentPage('How to Set Boundaries and Say No',
    'A boundary is a limit you set to protect your energy, emotions, or personal space. It’s okay to say no to things that make you uncomfortable! Boundaries are healthy and you don’t need to feel guilty for having them.\n\nWhen might you need to set a boundary?\nIf a friend expects too much from you.\nIf someone is touching you (hugging, grabbing your arm) and you don’t like it.\nIf a social event is too overwhelming and you need to leave.\n\nHow to say no:\n"I don’t have the energy for that right now."\n"I need some space, but I’d love to talk later."\n"I’m not comfortable with that."\n"No, but thanks for asking."\n"I need to go now - thanks for understanding."\n\nYou have the right to say no without guilt. Your comfort matters.');
  notesPage();

  contentPage('How to Explain my Needs to Others',
    'Sometimes, people don’t realise what you need unless you tell them. You deserve to have your needs understood and respected.\n\nNeeds you might need to explain:\nProcessing time - "I need a moment to think before I answer."\nSensory sensitivity - "Loud noises make me anxious - can we turn the volume down?"\nSocial energy limits - "I can hang out for an hour, but then I need alone time."\nDirect communication - "I don’t always pick up on hints. It helps if you say things directly."\nNeeding structure - "I feel better when I know the plan in advance."\n\nHow to communicate your needs clearly:\nUse simple, direct language - "I need quiet" or "I need space".\nWrite things down - if talking is hard, texting or using a communication card can help.\nUse "I" statements - instead of "You’re too loud" say "I feel overwhelmed when it’s noisy".\nAdvocate for your needs - if people don’t understand, it’s okay to repeat your needs.\n\nExamples of scripts you can use:\nWhen you need a break - "I’m feeling overwhelmed. I need a quiet space for a while."\nWhen people pressure you to talk - "I’m not in a talking mood right now, but I like listening."\nWhen you need clarity - "I don’t understand what you mean, can you explain in another way?"\nWhen someone crosses a boundary - "I’m not comfortable with that. Please stop."\n\nYou don’t have to change who you are - others can learn to understand you better.');
  notesPage();

  contentPage('Friendships: What Works for Me?',
    'Friendships don’t have to look the same for everyone. Some people love having lots of friends, while others prefer one or two close friends.\n\nPeople who may be good friends:\nFriends who respect your boundaries and don’t pressure you to socialise when you’re tired, overwhelmed, or drained.\nPeople who share your interests and enjoy talking about them.\nFriends who accept your social style (e.g. not minding when you don’t want to talk, take longer to reply, or need space).\nPeople who understand you might show friendship differently - maybe through acts of kindness rather than words.\n\nPeople who may not be good friends:\nFriends who only talk to you when they need something but ignore you otherwise.\nPeople who make fun of your interests.\nFriends who make you feel guilty for needing space or not replying instantly.\nPeople who don’t respect your boundaries or make you feel uncomfortable.\n\nWhat can help?\nThinking about how you like to connect - do you prefer texting, gaming, or meeting in person?\nSetting expectations - letting friends know if you need time alone after socialising, or if you don’t like certain types of conversations.',
    { prompt: 'What and who do you think could help you with friendships?' });
  notesPage();

  chapterDivider(5, 'School and Learning', [
    'How my Brain Learns Best', 'Homework and Study Strategies', 'Talking to Teachers about my Needs', 'Making School Work for Me'
  ]);

  contentPage('How My Brain Learns Best',
    'Every brain learns differently, and understanding how your brain works can help you find the best ways to absorb and process information. Here are some key areas where your brain may experience differences:\n\nProcessing information - you may need extra time to absorb and respond to new information, especially in fast-paced lessons.\nFocus and attention - your focus might be deep and intense on topics you love, but you may struggle with subjects that don’t interest you.\nExecutive functioning - skills like organising tasks, remembering due dates, and switching between subjects can be challenging.\n\nWhat could help?\nBreaking tasks into small steps - instead of "write a story", try "choose a topic > think of the characters > write or draw some ideas..."\nUse visual aids - mind maps, colour-coded notes, and charts can help with understanding and memory.\nMovement breaks - short breaks between tasks can help reset your focus.\nConsider other ways of learning - videos, hands-on activities, and discussions might work better than reading from a book.\n\nLearning is not about fitting into a system - it’s about finding what works for YOU!',
    { prompt: 'What do you think could help you learn?' });
  notesPage();

  contentPage('Homework and Study Strategies',
    'Homework can feel overwhelming - especially after spending all day at school using up your energy. Finding study strategies that match your brain’s strengths can help.\n\nHomework hacks:\nWork in short bursts - work in 10-20 minute chunks and have a break in between - whatever works best for you!\nUse your interests - if possible, connect your homework or study to topics you love.\nHave a "homework start" routine - set up a specific space and time to signal your brain that it’s study time.\nReward yourself - small incentives (a break, a snack, or a favourite activity) can help with motivation.\nAsk for extensions if needed - if a task is too much, it’s okay to ask for extra time.\n\nStudying doesn’t have to be a struggle - you can make it work for YOU!',
    { prompt: 'What strategies do you think could help you?' });
  notesPage();

  contentPage('Talking to Teachers About My Needs',
    'Sometimes, teachers may not understand what support you need unless you tell them. It’s okay to self-advocate and ask for help.\n\nWhat to tell teachers:\nHow you learn best - "I understand better when I can see things visually."\nWhat makes school hard - "Fast-paced discussions are tricky for me because I need time to process."\nWhat helps you succeed - "Having written notes helps me follow along."\nWhat to avoid - "I get overwhelmed when I’m put on the spot to answer questions."\n\nWays to communicate your needs:\nWrite a note to your teacher if speaking in person is hard.\nUse an advocacy card with key information about your needs.\nAsk to speak with your teacher about your needs.\n\nAdvocacy script example:\n"I learn best when I can see things visually and have extra time to process information. Could I get written instructions along with verbal ones?"\n\nYou have the right to be supported and to learn in a way that works for you!',
    { prompt: 'What would you like the teacher to know?' });
  notesPage();

  contentPage('Making School Work for Me',
    'School environments can and should be adapted and adjusted to support you and the way you work in the classroom. Small changes can make a big difference!\n\nClassroom adjustments that might help:\nA quiet seating area - sitting near the edge of the classroom, away from distractions.\nFidget tools - having something to hold can help focus and self-regulation.\nUsing ear defenders - reducing background noise to focus better.\nHaving written or pictured instructions - clear, step-by-step instructions instead of only verbal ones.\nUsing a timer - to help manage focus and time on tasks.\n\nHow to advocate for these adjustments:\nAsk a teacher or support staff for changes that can help you focus.\nUse advocacy scripts like "I learn best when I can have visual instructions instead of just verbal ones. Can I get a visual to help me?"\nSpeak to a parent or carer about what adjustments you need.\n\nSchool should be a place where you can thrive, not just survive!',
    { prompt: 'What adjustments do you think would help support you?' });
  notesPage();

  chapterDivider(6, 'Self-Advocacy and Self-Esteem', [
    'Knowing my Rights and Asking for Support', 'Building Confidence in Who I Am', 'Finding Role Models', 'Writing my Own Advocacy Plan'
  ]);

  contentPage('Knowing My Rights and Asking for Support',
    'You have the right to be supported, included, and treated with respect - whether at school, at work, or in daily life. Understanding these rights can help you feel empowered to speak up when you need to.\n\nYour rights include:\nThe right to reasonable adjustments in school (e.g. extra time, quiet spaces, and assistive technology).\nThe right to advocate for yourself and have your voice heard.\nThe right to be treated with respect and not to be forced into uncomfortable situations.\nThe right to support for your mental health and well-being.\n\nHow to ask for support:\nBe clear about what you need - "I focus better when I can wear ear defenders."\nUse written communication, assistive technology, or communication boards if verbal conversations are overwhelming.\nAsk someone you trust to help advocate for you if needed.\n\nYou deserve support. Asking for what you need is not being difficult - it’s self-care.');
  notesPage();

  contentPage('Building Confidence in Who I Am',
    'Feeling good about yourself isn’t always easy, especially if you’ve been made to feel "different" in the past. But being you is not a flaw - it’s a different way of experiencing the world, and that is something to celebrate.\n\nWays to build self-confidence:\nFocus on your strengths - what are you good at? What makes you unique?\nSurround yourself with supportive people - being around those who understand and accept you makes a huge difference.\nChallenge negative self-talk - replace "I’m not good at this" with "I’m learning at my own pace".\nTake pride in your identity - you are great, and you have so many strengths!\n\nYou are valuable, just as you are. Your way of thinking and experiencing the world matters.');
  notesPage();

  roleModelsPage();
  notesPage();

  contentPage('Writing My Own Advocacy Plan',
    'Creating an advocacy plan can help you feel more prepared to express your needs and rights in different situations.\n\nThings to consider on your advocacy plan:\nWhat are my biggest challenges? (e.g. loud environments, verbal instructions, unexpected changes).\nWhat strategies help me? (e.g. using a visual schedule, having written notes, fidget tools, sensory or calm boxes, taking breaks).\nHow do I communicate my needs? (e.g. self-advocacy scripts, writing notes, asking a support person or family for help).\nWho can I ask for support? (e.g. teachers, family, friends).\n\nAdvocacy script example:\n"I work best when I have clear written instructions and extra processing time. Could I have a checklist to help me stay organised?"\n\nSelf-advocacy is a skill that grows with time. The more you practise, the easier it gets.');
  fieldsActivity('My Advocacy Plan', ['My Challenges', 'Strategies to Help', 'How I Communicate my Needs', 'Who Can Support Me', 'My Advocacy Script']);

  chapterDivider(7, 'My Personal Profile', [
    'My Strengths and Challenges', 'What Helps Me Thrive', 'How I Like to Communicate', 'What I Want People to Know About Me'
  ]);

  contentPage('My Strengths and Challenges',
    'Everyone has things they’re great at, and things that can be tricky sometimes. Take a moment to use the prompts below and think about what makes you great and what might be more difficult for you.\n\nStrength prompts:\nI have a great memory for... (facts, numbers, music, details).\nI’m really creative and love... (drawing, writing, making things, problem-solving).\nI notice things that other people don’t, like...\nI’m honest, kind, and always try to...\nI can focus really well on...\n\nChallenge prompts:\nI find it hard to...\nLoud noises / lots of people / bright lights can make me feel...\nI sometimes struggle to understand...\nIt can be difficult for me to start / finish...\nWhen plans change, I feel...');
  fieldsActivity('My Strengths and Challenges', ['My Strengths', 'My Challenges']);

  contentPage('What Helps Me Thrive',
    'This section is about what makes life easier and more comfortable for you. What helps you feel safe, happy, and focused?\n\nAt school, I work best when...\nI have a quiet space to work.\nMy teacher gives me extra time to process things.\nI can use... (fidget tools, movement breaks, ear defenders).\nThe classroom isn’t too bright / loud / crowded.\n\nAt home, I feel best when...\nI have time to do...\nMy family understands that I need...\nI get to spend time on my interests like...\n\nWhen I’m overwhelmed, it helps when...\nI can take a break and...\nPeople give me space / time to...\nSomeone reminds me to...');
  fieldsActivity('What Helps Me Thrive', ['At school, I work best when...', 'At home, I feel best when...', 'When I’m overwhelmed, it helps when...']);

  contentPage('How I Like to Communicate',
    'Everyone has their own way of communicating! What feels most natural to you?\n\nSome ideas to get you started:\nI like talking face-to-face / I prefer writing things down / I prefer using a communication board / I prefer using assistive technology.\nI need extra time to think before I respond.\nI find it easier to communicate when... (people use clear language, I have visuals).\nSometimes, I don’t have words for how I feel, but I show it by...\nI prefer short / simple instructions because...\nIf I don’t understand something, I like people to...');
  fieldsActivity('How I Like to Communicate', ['How I like to communicate']);

  contentPage('What I Want People to Know About Me',
    'This is where you can tell others what’s important about YOU. What would you like teachers, friends, or family to understand?\n\nSome ideas to get you started:\nI am autistic, which means...\nI might seem quiet / shy / loud / confident, but really, I...\nJust because I don’t show my emotions the way others do, doesn’t mean I don’t feel them.\nIf I’m overwhelmed, it helps if...\nMy special interests are..., and I love talking about them!\nI want people to be patient with me because...\nI am proud of who I am because...');
  fieldsActivity('What I Want People to Know About Me', ['What I want people to know about me']);

  // ---------- Footers on every page after the cover ----------
  const total = pages.length;
  for (let i = 1; i < pages.length; i++) {
    drawFooter(pages[i], i + 1, total);
  }

  const bytes = await doc.save();
  writeFileSync(join(__dirname, '../../site/assets/resources/Embracing-Me-Autism-Workbook.pdf'), bytes);
  console.log('Wrote Embracing-Me-Autism-Workbook.pdf, pages:', pages.length);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
