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

  function drawImageFit(p, img, x, y, maxW, maxH, align, opacity) {
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    let dx = x;
    if (align === 'center') dx = x + (maxW - w) / 2;
    const drawOpts = { x: dx, y: y + (maxH - h) / 2, width: w, height: h };
    if (opacity !== undefined) drawOpts.opacity = opacity;
    p.drawImage(img, drawOpts);
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
  function chapterDivider(num, title, blurb, subtopics) {
    const p = newPage();
    softCorners(p, { skipBottomRight: true });
    drawImageFit(p, treeImg, PAGE_W - 300, 20, 270, 270, 'center', 0.1);

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

    ty -= 10;
    const blurbLines = wrapLine(bodySemi, 13, blurb, CONTENT_W - 90);
    blurbLines.forEach(function (line) {
      p.drawText(line, { x: MARGIN + 80, y: ty, size: 13, font: bodySemi, color: MUTED_GREEN });
      ty -= 18;
    });

    // "sticky note" style subtopic card, in amber instead of the original yellow
    const cardY = ty - 34;
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

  // ================= BLOCK LAYOUT (paragraphs, labels, bullet lists) =================
  // Shared by contentPage for both measuring (draw=false) and rendering (draw=true),
  // so the page can pick the largest font size that still fits before drawing anything.
  function layoutBlocks(p, blocks, x, yStart, width, size, draw) {
    let y = yStart;
    const lineH = size * 1.5;
    const listSize = size - 0.5;
    const listLineH = listSize * 1.55;
    blocks.forEach(function (b) {
      if (b.p) {
        const lines = wrapLine(body, size, b.p, width);
        lines.forEach(function (line) {
          if (draw) p.drawText(line, { x, y, size, font: body, color: INK });
          y -= lineH;
        });
        y -= size * 0.7;
      } else if (b.label) {
        const lines = wrapLine(bodyBold, size, b.label, width);
        lines.forEach(function (line) {
          if (draw) p.drawText(line, { x, y, size, font: bodyBold, color: GREEN_DARK });
          y -= lineH;
        });
        y -= size * 0.35;
      } else if (b.list) {
        b.list.forEach(function (item) {
          const lines = wrapLine(body, listSize, item, width - 18);
          lines.forEach(function (line, li) {
            if (draw) {
              if (li === 0) p.drawEllipse({ x: x + 4, y: y + listSize * 0.35, xScale: 2.3, yScale: 2.3, color: MUTED_GREEN });
              p.drawText(line, { x: x + 14, y, size: listSize, font: body, color: INK });
            }
            y -= listLineH;
          });
          y -= listSize * 0.3;
        });
        y -= size * 0.5;
      }
    });
    return y;
  }

  // ================= CONTENT PAGE =================
  function contentPage(heading, blocks, opts) {
    const o = opts || {};
    const p = newPage();
    softCorners(p, { skipTopLeft: !!o.icon });

    let y = PAGE_H - 90;
    if (o.icon) {
      drawImageFit(p, icons[o.icon], PAGE_W - MARGIN - 60, y - 44, 60, 60);
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

    const bottomLimit = o.prompt ? 150 : 95;
    const available = y - bottomLimit;

    const sizes = [11.5, 11, 10.5, 10, 9.5, 9];
    let chosenSize = sizes[sizes.length - 1];
    for (const s of sizes) {
      const endY = layoutBlocks(p, blocks, MARGIN, y, CONTENT_W, s, false);
      if (y - endY <= available) { chosenSize = s; break; }
    }

    y = layoutBlocks(p, blocks, MARGIN, y, CONTENT_W, chosenSize, true);

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

  // ================= MYTHS VS FACTS =================
  function mythFactPage(introText, pairs) {
    const p = newPage();
    softCorners(p, { skipTopLeft: true });
    let y = PAGE_H - 90;
    p.drawText('Autism Myths vs. Facts', { x: MARGIN, y, size: 22, font: displayBold, color: GREEN });
    y -= 30;
    const introLines = wrapLine(body, 11, introText, CONTENT_W);
    introLines.forEach(function (line) {
      p.drawText(line, { x: MARGIN, y, size: 11, font: body, color: INK });
      y -= 16;
    });
    y -= 12;

    const chipH = 17;
    pairs.forEach(function (pair) {
      const mythLines = wrapLine(body, 10, pair.myth, CONTENT_W - 32);
      const factLines = wrapLine(bodyBold, 10, pair.fact, CONTENT_W - 32);
      const cardH = 16 + chipH + 6 + mythLines.length * 13.5 + 10 + chipH + 6 + factLines.length * 13.5 + 14;

      p.drawRectangle({ x: MARGIN, y: y - cardH, width: CONTENT_W, height: cardH, color: OFFWHITE, borderColor: PALE_GREEN, borderWidth: 1.25 });

      let cy = y - 18;
      const mythChipW = bodyBold.widthOfTextAtSize('MYTH', 9) + 18;
      p.drawRectangle({ x: MARGIN + 16, y: cy - 12, width: mythChipW, height: chipH, color: CREAM_DARK, borderColor: MUTED_GREEN, borderWidth: 1 });
      p.drawText('MYTH', { x: MARGIN + 16 + 9, y: cy - 8, size: 9, font: bodyBold, color: MUTED_GREEN });
      cy -= chipH + 9;
      mythLines.forEach(function (line) {
        p.drawText(line, { x: MARGIN + 16, y: cy, size: 10, font: body, color: MUTED_GREEN });
        cy -= 13.5;
      });
      cy -= 8;

      const factChipW = bodyBold.widthOfTextAtSize('FACT', 9) + 18;
      p.drawRectangle({ x: MARGIN + 16, y: cy - 12, width: factChipW, height: chipH, color: GREEN });
      p.drawText('FACT', { x: MARGIN + 16 + 9, y: cy - 8, size: 9, font: bodyBold, color: OFFWHITE });
      cy -= chipH + 9;
      factLines.forEach(function (line) {
        p.drawText(line, { x: MARGIN + 16, y: cy, size: 10, font: bodyBold, color: GREEN_DARK });
        cy -= 13.5;
      });

      y -= cardH + 12;
    });

    return p;
  }

  // ================= SENSE PAGE (hyper/hypo comparison columns) =================
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
    y -= 56;

    const colGap = 22;
    const colW = (CONTENT_W - colGap) / 2;
    const colTop = y;

    function column(x, label, items, tint) {
      let cy = colTop;
      p.drawRectangle({ x, y: cy - 4, width: colW, height: 30, color: tint, opacity: 0.92 });
      const labelLines = wrapLine(bodyBold, 9.5, label, colW - 16);
      let ly = cy + 12;
      labelLines.forEach(function (line) {
        p.drawText(line, { x: x + 8, y: ly, size: 9.5, font: bodyBold, color: OFFWHITE });
        ly -= 11;
      });
      cy -= 44;
      items.forEach(function (item) {
        const lines = wrapLine(body, 10.3, item, colW - 18);
        lines.forEach(function (line, li) {
          if (li === 0) p.drawEllipse({ x: x + 5, y: cy + 3.2, xScale: 2.3, yScale: 2.3, color: tint });
          p.drawText(line, { x: x + 14, y: cy, size: 10.3, font: body, color: INK });
          cy -= 14.5;
        });
        cy -= 6;
      });
      return cy;
    }

    const leftBottom = column(MARGIN, 'HYPERSENSITIVE (over-sensitive)', hyper, GREEN);
    const rightBottom = column(MARGIN + colW + colGap, 'HYPOSENSITIVE (under-sensitive)', hypo, AMBER);
    const bottom = Math.min(leftBottom, rightBottom);

    p.drawLine({
      start: { x: MARGIN + colW + colGap / 2, y: colTop + 26 },
      end: { x: MARGIN + colW + colGap / 2, y: Math.min(bottom + 10, colTop) },
      thickness: 1, color: PALE_GREEN
    });

    const promptY = bottom - 26;
    const promptText = 'Do any of these sound like you? Circle or highlight the ones that do.';
    const promptLines = wrapLine(bodyBold, 11.5, promptText, CONTENT_W - 24);
    const promptH = promptLines.length * 16 + 20;
    p.drawRectangle({ x: MARGIN, y: promptY - promptH, width: CONTENT_W, height: promptH, color: AMBER_LIGHT });
    let py = promptY - 16;
    promptLines.forEach(function (line) {
      p.drawText(line, { x: MARGIN + 12, y: py, size: 11.5, font: bodyBold, color: GREEN_DARK });
      py -= 16;
    });

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

    const eyebrow = 'Write or draw here';
    p.drawText(eyebrow, { x: MARGIN, y: PAGE_H - 82, size: 11.5, font: bodySemi, color: MUTED_GREEN });

    const promptLines = wrapLine(displayBold, 16.5, promptText || 'What did you think about the page before this one?', PAGE_W - MARGIN - 130);
    let py = PAGE_H - 106;
    promptLines.forEach(function (line) {
      p.drawText(line, { x: MARGIN, y: py, size: 16.5, font: displayBold, color: GREEN });
      py -= 22;
    });

    const top = py - 30;
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

  chapterDivider(1, 'Understanding my Brain',
    'Start here to learn how your amazing brain works, and what makes you, you.', [
      'What is Autism?', 'Autism Myths vs. Facts', 'Different Ways Autism Can Look and Feel', 'My Strengths as an Autistic Person'
    ]);

  contentPage('What is Autism?', [
    { p: 'Autism is a way of thinking, feeling, and experiencing the world that is different from how many other people do. Your brain is wired in a unique way, which means you might notice things that others miss, have strong interests in certain topics, or find some situations overwhelming. Autism can affect how you understand emotions, communicate with others, and deal with sensory experiences like sounds, lights, and textures.' },
    { p: 'Autism isn’t something that needs to be "fixed" - it’s just a different way of being. The world is made up of all kinds of brains, and yours is just as important as anyone else’s.' }
  ]);
  notesPage('What’s one thing about your brain that makes you, you?');

  mythFactPage(
    'There are a lot of misunderstandings about autism. Some people believe things that aren’t true, which can make it harder for autistic people to feel accepted. Let’s look at some common myths and the real facts about autism:',
    [
      { myth: 'Autistic people don’t have emotions.', fact: 'Autistic people feel emotions just as much (or even more than) others! Sometimes, it might be hard to show or explain feelings in a way that people understand or expect, but that doesn’t mean you don’t have them, or that you are not allowed to have big emotions.' },
      { myth: 'All autistic people are the same.', fact: 'Every autistic person is different! Some love talking, while others prefer quiet. Some enjoy routines, and others don’t mind change. Autism is a spectrum, which means it looks different for everyone.' },
      { myth: 'Autism is something to "fix".', fact: 'There is nothing wrong with being autistic - it’s part of who you are. The goal is never to change you, but to find ways to make life work for you.' },
      { myth: 'Autistic people can’t have friends or relationships.', fact: 'Autistic people can have great friendships and relationships! You might socialise in a different way or need more time to connect with people, but that doesn’t mean you can’t build strong relationships.' }
    ]
  );
  notesPage('Had you heard any of these myths before? How did the facts make you feel?');

  contentPage('Different Ways Autism Can Look and Feel', [
    { p: 'Autism isn’t one single experience - it looks and feels different for everyone. Some autistic people:' },
    { list: [
      'Love routines and predictability - knowing what will happen next feels safe and comfortable.',
      'Are very creative or love problem-solving - thinking differently can lead to amazing ideas.',
      'Have deep interests in specific topics - you might focus on something you love and learn everything about it.',
      'Need more time to process conversations or instructions - your brain might take a little longer to sort through information, which is completely okay.',
      'Experience sensory things more strongly - lights might feel too bright, sounds too loud, or certain textures uncomfortable.',
      'Communicate in different ways - you might prefer writing or using pictures instead of talking, or you may need extra time to put thoughts into words.'
    ] },
    { p: 'You might experience all of these things, just a few, or even different things not listed here. However you experience autism, it is valid and important.' }
  ], { prompt: 'What things, either listed here or not, do you experience?' });
  notesPage('Which of these feel true for you? Write or draw your own examples.');

  contentPage('My Strengths', [
    { p: 'Being autistic comes with amazing strengths! Here are some of the things that make autistic people unique:' },
    { list: [
      'Attention to detail - you might notice small things that other people miss, which can be a great skill in art, science, gaming, or problem-solving.',
      'Deep focus - when you’re interested in something, you can focus on it for hours and become an expert!',
      'Creativity and originality - many autistic people have unique ways of thinking, leading to brilliant ideas in writing, art, music, and technology.',
      'Strong memory - you might remember facts, numbers, patterns, or lyrics better than others.',
      'Honesty and loyalty - many autistic people are very honest, straightforward, and loyal friends.',
      'Thinking differently - you might come up with solutions or ideas that no one else would think of.',
      'Strong sense of justice - autistic people often care deeply about fairness and doing the right thing.'
    ] },
    { p: 'By understanding how your brain works, you can use your strengths to help you in school, friendships, and life.' }
  ], { prompt: 'What strengths do you think you have?' });
  notesPage('Which strengths sound like you? What would you add to the list?');

  chapterDivider(2, 'Sensory Processing and Regulation',
    'Discover how your senses work, and build your own toolkit for feeling comfortable.', [
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

  contentPage('What Helps Me Feel Safe and Comfortable', [
    { p: 'You may need certain things to feel comfortable and safe. Here are some ways people manage their sensory needs:' },
    { list: [
      'Wearing comfy clothes - some fabrics might feel too stretchy, tight, or loose, so choosing clothes that work for you can help.',
      'Using headphones or ear defenders - you can use headphones for more sound input, or ear defenders to block out unwanted sounds.',
      'Dimming lights or wearing sunglasses - bright or flickering lights can be uncomfortable, so adjusting lighting can help.',
      'Using fidget tools - the right fidget tools (tailored to your needs) can help with focus and make your body feel calmer.',
      'Chewing gum or eating crunchy foods - some people like strong tastes or chewing to help them focus and feel calm.',
      'Moving around - if your body needs movement, things like walking or stretching can help.'
    ] }
  ], { prompt: 'What things do you think may help you feel safe and comfortable?' });
  notesPage('What helps you feel safe and comfortable? Write or draw your ideas.');

  contentPage('Managing Overwhelm', [
    { p: 'Sometimes, too much sensory input can lead to sensory overload. This means your brain is receiving too much information at once, and it can feel overwhelming, exhausting, or even painful.' },
    { label: 'When this happens, you might feel:' },
    { list: [
      'Frustrated or angry',
      'Like you need to escape or hide',
      'Stuck and unable to think clearly',
      'Like your body is too full of energy, or completely frozen'
    ] },
    { label: 'When you start feeling overwhelmed, try these strategies:' },
    { list: [
      'Step away from the situation - find a quiet, safe space where you can calm down.',
      'Use your sensory toolkit - put on headphones, use a fidget tool, or wrap up in a soft blanket.',
      'Try deep pressure or movement - hug a pillow, squeeze a stress ball, or do a few big stretches.',
      'Use calming activities - listening to music or drawing can help you reset.',
      'Tell someone how you feel - if you can, let a trusted person know that you need a break or some support.'
    ] },
    { p: 'Knowing your sensory needs helps you take care of yourself. It’s okay to ask for adjustments and to do what helps you feel comfortable in different environments.' }
  ], { prompt: 'What makes you feel overwhelmed? Who and what can help you when you feel overwhelmed?' });
  notesPage('What makes you feel overwhelmed, and who or what helps?');

  contentPage('My Sensory Toolkit', [
    { p: 'A sensory toolkit is a collection of things that help you feel comfortable and regulate your senses. It’s different for everyone, but here are some ideas:' },
    { list: [
      'For sound sensitivity: noise-cancelling headphones, calming music, or a quiet space.',
      'For feeling overwhelmed: a weighted blanket or plushy, fidget tools, or deep breathing exercises.',
      'For movement: a stress ball, stretchy bands, or a small trampoline.',
      'For focus and comfort: sensory snack boxes, colouring books, or a soft fabric to touch.'
    ] },
    { p: 'Having a sensory toolkit means you have the things you need to feel better when the world feels too loud, too bright, or too overwhelming.' }
  ], { prompt: 'Create your own sensory toolkit - think about what makes you feel calm and relaxed.' });
  toolkitTitlePage(['My', 'Sensory Toolkit'], 'Write or draw the things that help you feel calm and comfortable.');

  chapterDivider(3, 'Emotions and Self-Regulation',
    'Learn to understand and manage your emotions, in your own way.', [
      'Understanding my Emotions', 'How to Explain my Feelings to Others', 'Strategies for Managing Anxiety and Overload', 'My Emotional Regulation Toolkit'
    ]);

  contentPage('Understanding my Emotions', [
    { p: 'Emotions are feelings like happiness, sadness, excitement, anger, or worry. Everyone experiences emotions, but some people feel them in a very strong, overwhelming way, or struggle to recognise and describe them.' },
    { label: 'Why does this happen?' },
    { p: 'Two things can affect how some people experience emotions: interoception and alexithymia.' },
    { p: 'Interoception is the sense that helps you notice what’s happening inside your body. It tells you if you’re hungry, thirsty, too hot, in pain, or feeling emotions. If your interoception signals are too weak, you might not notice you’re upset until you suddenly explode. If they are too strong, you might feel emotions so intensely that they take over.' },
    { p: 'Alexithymia is when it’s hard to put feelings into words. You might know something is wrong but struggle to explain what or why. Instead of saying "I’m feeling worried", you might just feel restless or sick without knowing why.' },
    { label: 'What does this look like in real life?' },
    { list: [
      'Feeling fine one moment and suddenly overwhelmed because emotions build up without you noticing.',
      'Getting angry or frustrated without knowing why - maybe because you’re actually hungry or tired.',
      'Having a hard time explaining feelings to others, or needing more time to figure them out.',
      'Feeling numb or disconnected from emotions, like they are distant or confusing.'
    ] },
    { label: 'What can help?' },
    { list: [
      'Using an emotions chart with faces and words to identify how you feel.',
      'Checking in with your body - are you hungry? Tired? Too hot or cold?',
      'Writing or drawing how you feel, even if you don’t have the right words yet.'
    ] }
  ]);
  notesPage('How do you usually notice you’re feeling an emotion?');

  contentPage('How to Explain my Feelings to Others', [
    { p: 'It’s okay to need help with your emotions, but others can’t help unless they know what’s wrong. Sometimes, explaining feelings can be really hard, especially if you find it hard to put feelings into words.' },
    { label: 'Ideas for ways you could communicate feelings:' },
    { list: [
      'Using simple phrases - "I feel bad but don’t know why", "Something is wrong".',
      'Using visuals - pointing to an emotion chart or using a colour system to show people how you feel.',
      'Using scripts - pre-written sentences like "I need space", or "I feel overwhelmed".',
      'Using a communication card - a small card that says "I need a break" or "I need help".'
    ] }
  ]);
  notesPage('Which of these ways of explaining feelings could you try?');

  contentPage('Strategies for Managing Anxiety and Overload', [
    { p: 'Anxiety is a feeling of worry or nervousness. Some people often feel anxious because the world is unpredictable, too overwhelming, or because they have social worries.' },
    { label: 'What does anxiety feel like?' },
    { list: [
      'A fast heartbeat or feeling shaky',
      'A tight chest or trouble breathing',
      'Feeling sick or dizzy',
      'Thoughts racing too fast',
      'Wanting to run away or hide'
    ] },
    { label: 'What can help?' },
    { list: [
      'Predictability - knowing what will happen next can ease anxiety. Using a visual timetable or checklist can help.',
      'Self-soothing - having a "calm kit" or "sensory toolkit" with sensory tools, music, ear defenders, or comforting items.',
      'Grounding techniques - using the "5-4-3-2-1" method: name 5 things you see, 4 things you touch, 3 things you hear, 2 things you smell, 1 thing you taste.',
      'Safe spaces - finding a quiet place to go when overwhelmed (a corner, a room, or cuddled in a blanket).'
    ] }
  ]);
  notesPage('What does anxiety feel like for you, and what helps?');

  contentPage('My Emotional Regulation Toolkit', [
    { p: 'An emotional regulation toolkit is a collection of strategies and items that help you manage your feelings when things feel too overwhelming, frustrating, or stressful. Everyone’s toolkit is unique, but here are some ideas:' },
    { list: [
      'When you feel anxious or overwhelmed: try a deep breathing exercise, listen to calming music, or use a weighted blanket.',
      'When you feel frustrated or angry: squeeze a stress ball, rip up paper, or do some physical movement like star jumps or stretching.',
      'When you need to feel calm and safe: wrap yourself in a soft blanket, hold a comfort item, or use grounding techniques like naming 5 things you see, 4 things you touch, 3 things you hear, 2 things you smell, 1 thing you taste.',
      'When you need a break from people or noise: use noise-cancelling headphones, find a quiet space, or use a "do not disturb" signal.',
      'When you struggle to express your feelings: use an emotions chart, write in a journal, or draw how you feel.'
    ] }
  ], { prompt: 'Have a go at building yours with things that work best for you!' });
  toolkitTitlePage(['My Emotion', 'Regulation Toolkit'], 'Write or draw the strategies and items that help you feel calm.');

  chapterDivider(4, 'Socialising and Communication',
    'Explore your communication style, boundaries, and friendships.', [
      'Understanding my Communication Style', 'How to Set Boundaries and Say No', 'How to Explain my Needs to Others', 'Friendships: What Works for Me?'
    ]);

  contentPage('Understanding my Communication Style', [
    { p: 'Socialising can be fun, interesting, confusing, exhausting, or even stressful - sometimes all at once! Some people experience socialising and communication differently to other people. This doesn’t mean something is wrong; it just means your brain processes social interactions in its own way.' },
    { p: 'Communication isn’t just about talking - it’s about how you process, understand, and respond to others. Some people may have a unique communication style that includes:' },
    { list: [
      'Literal thinking - if someone tells you something, you may believe it to be true without understanding any hidden messages or social cues. In the same way, if they do not tell you something, you may not know it to be true or assume it yourself. Literal thinkers can struggle to understand instructions unless they are given in a very clear, literal way.',
      'Processing time - needing more time to think before responding.',
      'Social energy - feeling drained after social interactions and needing recovery time.'
    ] },
    { label: 'What does this look like in real life?' },
    { list: [
      'Not noticing when people say things they don’t really mean (e.g. "Let’s hang out soon!" but they don’t plan to).',
      'Struggling with sarcasm, indirect hints, or vague language (e.g. "We’ll see" instead of a clear yes or no).',
      'Needing extra time to form a response, especially in fast conversations.',
      'Finding small talk uninteresting but enjoying deep, meaningful conversations.'
    ] },
    { label: 'What can help?' },
    { list: [
      'Asking for clarity - "Do you mean that literally?"',
      'Using scripts - pre-planned responses for common situations (e.g. "I need a moment to think before I answer").',
      'Choosing comfortable social settings - talking one-to-one instead of in big groups.',
      'Giving yourself processing time - saying "Let me think about that" instead of feeling pressured to answer quickly.'
    ] },
    { p: 'Your communication style is valid, and you deserve to be understood.' }
  ], { prompt: 'How do you like to communicate? What strategies would you like to try?' });
  notesPage('How do you like to communicate? What strategies would you like to try?');

  contentPage('How to Set Boundaries and Say No', [
    { p: 'A boundary is a limit you set to protect your energy, emotions, or personal space. It’s okay to say no to things that make you uncomfortable! Boundaries are healthy and you don’t need to feel guilty for having them.' },
    { label: 'When might you need to set a boundary?' },
    { list: [
      'If a friend expects too much from you.',
      'If someone is touching you (hugging, grabbing your arm) and you don’t like it.',
      'If a social event is too overwhelming and you need to leave.'
    ] },
    { label: 'How to say no:' },
    { list: [
      '"I don’t have the energy for that right now."',
      '"I need some space, but I’d love to talk later."',
      '"I’m not comfortable with that."',
      '"No, but thanks for asking."',
      '"I need to go now - thanks for understanding."'
    ] },
    { p: 'You have the right to say no without guilt. Your comfort matters.' }
  ]);
  notesPage('Is there a boundary you’d like to practise setting?');

  contentPage('How to Explain my Needs to Others', [
    { p: 'Sometimes, people don’t realise what you need unless you tell them. You deserve to have your needs understood and respected.' },
    { label: 'Needs you might need to explain:' },
    { list: [
      'Processing time - "I need a moment to think before I answer."',
      'Sensory sensitivity - "Loud noises make me anxious - can we turn the volume down?"',
      'Social energy limits - "I can hang out for an hour, but then I need alone time."',
      'Direct communication - "I don’t always pick up on hints. It helps if you say things directly."',
      'Needing structure - "I feel better when I know the plan in advance."'
    ] },
    { label: 'How to communicate your needs clearly:' },
    { list: [
      'Use simple, direct language - "I need quiet" or "I need space".',
      'Write things down - if talking is hard, texting or using a communication card can help.',
      'Use "I" statements - instead of "You’re too loud" say "I feel overwhelmed when it’s noisy".',
      'Advocate for your needs - if people don’t understand, it’s okay to repeat your needs.'
    ] },
    { label: 'Examples of scripts you can use:' },
    { list: [
      'When you need a break - "I’m feeling overwhelmed. I need a quiet space for a while."',
      'When people pressure you to talk - "I’m not in a talking mood right now, but I like listening."',
      'When you need clarity - "I don’t understand what you mean, can you explain in another way?"',
      'When someone crosses a boundary - "I’m not comfortable with that. Please stop."'
    ] },
    { p: 'You don’t have to change who you are - others can learn to understand you better.' }
  ]);
  notesPage('What’s one need you’d like people to understand better?');

  contentPage('Friendships: What Works for Me?', [
    { p: 'Friendships don’t have to look the same for everyone. Some people love having lots of friends, while others prefer one or two close friends.' },
    { label: 'People who may be good friends:' },
    { list: [
      'Friends who respect your boundaries and don’t pressure you to socialise when you’re tired, overwhelmed, or drained.',
      'People who share your interests and enjoy talking about them.',
      'Friends who accept your social style (e.g. not minding when you don’t want to talk, take longer to reply, or need space).',
      'People who understand you might show friendship differently - maybe through acts of kindness rather than words.'
    ] },
    { label: 'People who may not be good friends:' },
    { list: [
      'Friends who only talk to you when they need something but ignore you otherwise.',
      'People who make fun of your interests.',
      'Friends who make you feel guilty for needing space or not replying instantly.',
      'People who don’t respect your boundaries or make you feel uncomfortable.'
    ] },
    { label: 'What can help?' },
    { list: [
      'Thinking about how you like to connect - do you prefer texting, gaming, or meeting in person?',
      'Setting expectations - letting friends know if you need time alone after socialising, or if you don’t like certain types of conversations.'
    ] }
  ], { prompt: 'What and who do you think could help you with friendships?' });
  notesPage('What and who do you think could help you with friendships?');

  chapterDivider(5, 'School and Learning',
    'Find out how you learn best, and how to make school work for you.', [
      'How my Brain Learns Best', 'Homework and Study Strategies', 'Talking to Teachers about my Needs', 'Making School Work for Me'
    ]);

  contentPage('How My Brain Learns Best', [
    { p: 'Every brain learns differently, and understanding how your brain works can help you find the best ways to absorb and process information. Here are some key areas where your brain may experience differences:' },
    { list: [
      'Processing information - you may need extra time to absorb and respond to new information, especially in fast-paced lessons.',
      'Focus and attention - your focus might be deep and intense on topics you love, but you may struggle with subjects that don’t interest you.',
      'Executive functioning - skills like organising tasks, remembering due dates, and switching between subjects can be challenging.'
    ] },
    { label: 'What could help?' },
    { list: [
      'Breaking tasks into small steps - instead of "write a story", try "choose a topic > think of the characters > write or draw some ideas..."',
      'Use visual aids - mind maps, colour-coded notes, and charts can help with understanding and memory.',
      'Movement breaks - short breaks between tasks can help reset your focus.',
      'Consider other ways of learning - videos, hands-on activities, and discussions might work better than reading from a book.'
    ] },
    { p: 'Learning is not about fitting into a system - it’s about finding what works for YOU!' }
  ], { prompt: 'What do you think could help you learn?' });
  notesPage('What do you think could help you learn?');

  contentPage('Homework and Study Strategies', [
    { p: 'Homework can feel overwhelming - especially after spending all day at school using up your energy. Finding study strategies that match your brain’s strengths can help.' },
    { label: 'Homework hacks:' },
    { list: [
      'Work in short bursts - work in 10-20 minute chunks and have a break in between - whatever works best for you!',
      'Use your interests - if possible, connect your homework or study to topics you love.',
      'Have a "homework start" routine - set up a specific space and time to signal your brain that it’s study time.',
      'Reward yourself - small incentives (a break, a snack, or a favourite activity) can help with motivation.',
      'Ask for extensions if needed - if a task is too much, it’s okay to ask for extra time.'
    ] },
    { p: 'Studying doesn’t have to be a struggle - you can make it work for YOU!' }
  ], { prompt: 'What strategies do you think could help you?' });
  notesPage('What strategies do you think could help you?');

  contentPage('Talking to Teachers About My Needs', [
    { p: 'Sometimes, teachers may not understand what support you need unless you tell them. It’s okay to self-advocate and ask for help.' },
    { label: 'What to tell teachers:' },
    { list: [
      'How you learn best - "I understand better when I can see things visually."',
      'What makes school hard - "Fast-paced discussions are tricky for me because I need time to process."',
      'What helps you succeed - "Having written notes helps me follow along."',
      'What to avoid - "I get overwhelmed when I’m put on the spot to answer questions."'
    ] },
    { label: 'Ways to communicate your needs:' },
    { list: [
      'Write a note to your teacher if speaking in person is hard.',
      'Use an advocacy card with key information about your needs.',
      'Ask to speak with your teacher about your needs.'
    ] },
    { label: 'Advocacy script example:' },
    { p: '"I learn best when I can see things visually and have extra time to process information. Could I get written instructions along with verbal ones?"' },
    { p: 'You have the right to be supported and to learn in a way that works for you!' }
  ], { prompt: 'What would you like the teacher to know?' });
  notesPage('What would you like your teacher to know?');

  contentPage('Making School Work for Me', [
    { p: 'School environments can and should be adapted and adjusted to support you and the way you work in the classroom. Small changes can make a big difference!' },
    { label: 'Classroom adjustments that might help:' },
    { list: [
      'A quiet seating area - sitting near the edge of the classroom, away from distractions.',
      'Fidget tools - having something to hold can help focus and self-regulation.',
      'Using ear defenders - reducing background noise to focus better.',
      'Having written or pictured instructions - clear, step-by-step instructions instead of only verbal ones.',
      'Using a timer - to help manage focus and time on tasks.'
    ] },
    { label: 'How to advocate for these adjustments:' },
    { list: [
      'Ask a teacher or support staff for changes that can help you focus.',
      'Use advocacy scripts like "I learn best when I can have visual instructions instead of just verbal ones. Can I get a visual to help me?"',
      'Speak to a parent or carer about what adjustments you need.'
    ] },
    { p: 'School should be a place where you can thrive, not just survive!' }
  ], { prompt: 'What adjustments do you think would help support you?' });
  notesPage('What adjustments do you think would help support you?');

  chapterDivider(6, 'Self-Advocacy and Self-Esteem',
    'Build confidence, learn your rights, and find your voice.', [
      'Knowing my Rights and Asking for Support', 'Building Confidence in Who I Am', 'Finding Role Models', 'Writing my Own Advocacy Plan'
    ]);

  contentPage('Knowing My Rights and Asking for Support', [
    { p: 'You have the right to be supported, included, and treated with respect - whether at school, at work, or in daily life. Understanding these rights can help you feel empowered to speak up when you need to.' },
    { label: 'Your rights include:' },
    { list: [
      'The right to reasonable adjustments in school (e.g. extra time, quiet spaces, and assistive technology).',
      'The right to advocate for yourself and have your voice heard.',
      'The right to be treated with respect and not to be forced into uncomfortable situations.',
      'The right to support for your mental health and well-being.'
    ] },
    { label: 'How to ask for support:' },
    { list: [
      'Be clear about what you need - "I focus better when I can wear ear defenders."',
      'Use written communication, assistive technology, or communication boards if verbal conversations are overwhelming.',
      'Ask someone you trust to help advocate for you if needed.'
    ] },
    { p: 'You deserve support. Asking for what you need is not being difficult - it’s self-care.' }
  ]);
  notesPage('Is there something you’d like to ask for support with?');

  contentPage('Building Confidence in Who I Am', [
    { p: 'Feeling good about yourself isn’t always easy, especially if you’ve been made to feel "different" in the past. But being you is not a flaw - it’s a different way of experiencing the world, and that is something to celebrate.' },
    { label: 'Ways to build self-confidence:' },
    { list: [
      'Focus on your strengths - what are you good at? What makes you unique?',
      'Surround yourself with supportive people - being around those who understand and accept you makes a huge difference.',
      'Challenge negative self-talk - replace "I’m not good at this" with "I’m learning at my own pace".',
      'Take pride in your identity - you are great, and you have so many strengths!'
    ] },
    { p: 'You are valuable, just as you are. Your way of thinking and experiencing the world matters.' }
  ]);
  notesPage('What’s something you’re proud of about yourself?');

  roleModelsPage();
  notesPage('Why do these role models inspire you? Who else inspires you?');

  contentPage('Writing My Own Advocacy Plan', [
    { p: 'Creating an advocacy plan can help you feel more prepared to express your needs and rights in different situations.' },
    { label: 'Things to consider on your advocacy plan:' },
    { list: [
      'What are my biggest challenges? (e.g. loud environments, verbal instructions, unexpected changes).',
      'What strategies help me? (e.g. using a visual schedule, having written notes, fidget tools, sensory or calm boxes, taking breaks).',
      'How do I communicate my needs? (e.g. self-advocacy scripts, writing notes, asking a support person or family for help).',
      'Who can I ask for support? (e.g. teachers, family, friends).'
    ] },
    { label: 'Advocacy script example:' },
    { p: '"I work best when I have clear written instructions and extra processing time. Could I have a checklist to help me stay organised?"' },
    { p: 'Self-advocacy is a skill that grows with time. The more you practise, the easier it gets.' }
  ]);
  fieldsActivity('My Advocacy Plan', ['My Challenges', 'Strategies to Help', 'How I Communicate my Needs', 'Who Can Support Me', 'My Advocacy Script']);

  chapterDivider(7, 'My Personal Profile',
    'Bring it all together in your own personal profile.', [
      'My Strengths and Challenges', 'What Helps Me Thrive', 'How I Like to Communicate', 'What I Want People to Know About Me'
    ]);

  contentPage('My Strengths and Challenges', [
    { p: 'Everyone has things they’re great at, and things that can be tricky sometimes. Take a moment to use the prompts below and think about what makes you great and what might be more difficult for you.' },
    { label: 'Strength prompts:' },
    { list: [
      'I have a great memory for... (facts, numbers, music, details).',
      'I’m really creative and love... (drawing, writing, making things, problem-solving).',
      'I notice things that other people don’t, like...',
      'I’m honest, kind, and always try to...',
      'I can focus really well on...'
    ] },
    { label: 'Challenge prompts:' },
    { list: [
      'I find it hard to...',
      'Loud noises / lots of people / bright lights can make me feel...',
      'I sometimes struggle to understand...',
      'It can be difficult for me to start / finish...',
      'When plans change, I feel...'
    ] }
  ]);
  fieldsActivity('My Strengths and Challenges', ['My Strengths', 'My Challenges']);

  contentPage('What Helps Me Thrive', [
    { p: 'This section is about what makes life easier and more comfortable for you. What helps you feel safe, happy, and focused?' },
    { label: 'At school, I work best when...' },
    { list: [
      'I have a quiet space to work.',
      'My teacher gives me extra time to process things.',
      'I can use... (fidget tools, movement breaks, ear defenders).',
      'The classroom isn’t too bright / loud / crowded.'
    ] },
    { label: 'At home, I feel best when...' },
    { list: [
      'I have time to do...',
      'My family understands that I need...',
      'I get to spend time on my interests like...'
    ] },
    { label: 'When I’m overwhelmed, it helps when...' },
    { list: [
      'I can take a break and...',
      'People give me space / time to...',
      'Someone reminds me to...'
    ] }
  ]);
  fieldsActivity('What Helps Me Thrive', ['At school, I work best when...', 'At home, I feel best when...', 'When I’m overwhelmed, it helps when...']);

  contentPage('How I Like to Communicate', [
    { p: 'Everyone has their own way of communicating! What feels most natural to you?' },
    { label: 'Some ideas to get you started:' },
    { list: [
      'I like talking face-to-face / I prefer writing things down / I prefer using a communication board / I prefer using assistive technology.',
      'I need extra time to think before I respond.',
      'I find it easier to communicate when... (people use clear language, I have visuals).',
      'Sometimes, I don’t have words for how I feel, but I show it by...',
      'I prefer short / simple instructions because...',
      'If I don’t understand something, I like people to...'
    ] }
  ]);
  fieldsActivity('How I Like to Communicate', ['How I like to communicate']);

  contentPage('What I Want People to Know About Me', [
    { p: 'This is where you can tell others what’s important about YOU. What would you like teachers, friends, or family to understand?' },
    { label: 'Some ideas to get you started:' },
    { list: [
      'I am autistic, which means...',
      'I might seem quiet / shy / loud / confident, but really, I...',
      'Just because I don’t show my emotions the way others do, doesn’t mean I don’t feel them.',
      'If I’m overwhelmed, it helps if...',
      'My special interests are..., and I love talking about them!',
      'I want people to be patient with me because...',
      'I am proud of who I am because...'
    ] }
  ]);
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
