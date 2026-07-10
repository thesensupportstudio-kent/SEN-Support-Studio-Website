import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_GREEN_PNG_BASE64 } from './logo-green.js';
import { TREE_ICON_GREEN_PNG_BASE64 } from './tree-icon-green.js';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 54;
const HEADER_HEIGHT = 176;
const TOP_BAR_HEIGHT = 14;
const BOTTOM_MARGIN = 76;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const CREAM = rgb(0xfb / 255, 0xfa / 255, 0xf5 / 255);
const GREEN = rgb(0x2d / 255, 0x54 / 255, 0x39 / 255);
const MUTED_GREEN = rgb(0x5b / 255, 0x8a / 255, 0x63 / 255);
const INK = rgb(0.08, 0.1, 0.08);

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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

function contentToLines(font, size, maxWidth, text) {
  const paragraphs = String(text || '').split(/\n{2,}/);
  let lines = [];
  paragraphs.forEach(function (para, i) {
    const paraLines = para.split(/\n/).reduce(function (acc, ln) {
      return acc.concat(wrapLine(font, size, ln, maxWidth));
    }, []);
    lines = lines.concat(paraLines);
    if (i < paragraphs.length - 1) lines.push('');
  });
  return lines;
}

async function createPdfContext(data) {
  const doc = await PDFDocument.create();
  doc.setTitle(data.clientName ? data.title + ' - ' + data.clientName : data.title);
  doc.setProducer('SEN Support Studio');

  const headingFont = await doc.embedFont(StandardFonts.TimesRomanBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const bodyBoldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await doc.embedPng(base64ToBytes(LOGO_GREEN_PNG_BASE64));
  const treeIcon = await doc.embedPng(base64ToBytes(TREE_ICON_GREEN_PNG_BASE64));

  const pages = [];
  let page;
  let y;

  function paintBackground(p) {
    p.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: CREAM });
  }

  function drawHeaderBand(p) {
    p.drawRectangle({ x: 0, y: PAGE_HEIGHT - HEADER_HEIGHT, width: PAGE_WIDTH, height: HEADER_HEIGHT, color: GREEN });
    const logoW = 260;
    const logoH = logoW * (logoImage.height / logoImage.width);
    p.drawImage(logoImage, {
      x: (PAGE_WIDTH - logoW) / 2,
      y: PAGE_HEIGHT - HEADER_HEIGHT + (HEADER_HEIGHT - logoH) / 2,
      width: logoW,
      height: logoH
    });
  }

  function addFullHeaderPage() {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    paintBackground(page);
    drawHeaderBand(page);
    y = PAGE_HEIGHT - HEADER_HEIGHT - 42;
    return page;
  }

  function addContinuationPage() {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    paintBackground(page);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - TOP_BAR_HEIGHT, width: PAGE_WIDTH, height: TOP_BAR_HEIGHT, color: GREEN });
    y = PAGE_HEIGHT - 50;
  }

  function ensureSpace(needed) {
    if (y - needed < BOTTOM_MARGIN) addContinuationPage();
  }

  function drawSection(heading, content) {
    ensureSpace(18 + 14);
    page.drawText(heading, { x: MARGIN_X, y, size: 13, font: headingFont, color: GREEN });
    y -= 18;

    const lines = contentToLines(bodyFont, 10.5, CONTENT_WIDTH, content);
    lines.forEach(function (line) {
      ensureSpace(14);
      if (line) page.drawText(line, { x: MARGIN_X, y, size: 10.5, font: bodyFont, color: INK });
      y -= 14;
    });
    y -= 12;
  }

  function drawBulletList(bullets) {
    const bulletIndent = 14;
    bullets.forEach(function (bullet) {
      const lines = contentToLines(bodyFont, 10.5, CONTENT_WIDTH - bulletIndent, bullet);
      lines.forEach(function (line, li) {
        ensureSpace(15);
        if (li === 0) {
          page.drawText('•', { x: MARGIN_X, y, size: 10.5, font: bodyFont, color: GREEN });
        }
        if (line) page.drawText(line, { x: MARGIN_X + bulletIndent, y, size: 10.5, font: bodyFont, color: INK });
        y -= 15;
      });
    });
    y -= 8;
  }

  function drawBulletSection(heading, bullets) {
    ensureSpace(20 + 15);
    page.drawText(heading, { x: MARGIN_X, y, size: 14, font: headingFont, color: GREEN });
    y -= 22;
    drawBulletList(bullets);
  }

  function drawFooters() {
    const lineY = 60;
    const iconH = 30;
    const iconW = iconH * (treeIcon.width / treeIcon.height);
    const textTop = lineY - 16;
    const textBottom = lineY - 29;

    pages.forEach(function (p, idx) {
      p.drawLine({
        start: { x: MARGIN_X, y: lineY },
        end: { x: PAGE_WIDTH - MARGIN_X, y: lineY },
        thickness: 1, color: GREEN
      });

      p.drawText('SEN SUPPORT', { x: MARGIN_X, y: textTop, size: 7.5, font: bodyBoldFont, color: GREEN });
      p.drawText('STUDIO', { x: MARGIN_X, y: textBottom, size: 7.5, font: bodyBoldFont, color: GREEN });

      const dividerX = MARGIN_X + 68;
      p.drawLine({
        start: { x: dividerX, y: textTop + 8 },
        end: { x: dividerX, y: textBottom - 1 },
        thickness: 0.75, color: MUTED_GREEN
      });

      const taglineX = dividerX + 12;
      p.drawText('STRONG ROOTS,', { x: taglineX, y: textTop, size: 7, font: bodyBoldFont, color: MUTED_GREEN });
      p.drawText('SPACE TO FLOURISH', { x: taglineX, y: textBottom, size: 7, font: bodyBoldFont, color: MUTED_GREEN });

      p.drawImage(treeIcon, {
        x: PAGE_WIDTH - MARGIN_X - iconW,
        y: textBottom - 2,
        width: iconW,
        height: iconH
      });

      if (pages.length > 1) {
        const label = 'Page ' + (idx + 1) + ' of ' + pages.length;
        const labelWidth = bodyFont.widthOfTextAtSize(label, 7.5);
        p.drawText(label, {
          x: PAGE_WIDTH - MARGIN_X - iconW - labelWidth - 12,
          y: textBottom,
          size: 7.5, font: bodyFont, color: MUTED_GREEN
        });
      }
    });
  }

  return {
    doc, headingFont, bodyFont, bodyBoldFont,
    getY: function () { return y; },
    setY: function (val) { y = val; },
    getPage: function () { return page; },
    addFullHeaderPage, addContinuationPage, ensureSpace, drawSection, drawBulletSection, drawFooters
  };
}

export async function buildReportPdf(data) {
  const ctx = await createPdfContext(data);
  ctx.addFullHeaderPage();

  ctx.getPage().drawText(data.title, { x: MARGIN_X, y: ctx.getY(), size: 19, font: ctx.headingFont, color: GREEN });
  ctx.setY(ctx.getY() - 26);

  ctx.getPage().drawText(data.clientLabel + ':  ' + data.clientName, { x: MARGIN_X, y: ctx.getY(), size: 11, font: ctx.bodyBoldFont, color: INK });
  ctx.setY(ctx.getY() - 15);
  ctx.getPage().drawText('Session date:  ' + data.sessionDate, { x: MARGIN_X, y: ctx.getY(), size: 11, font: ctx.bodyFont, color: INK });
  ctx.setY(ctx.getY() - 28);

  data.sections
    .filter(function (s) { return s && s.content; })
    .forEach(function (section) {
      ctx.drawSection(section.heading, section.content);
    });

  ctx.drawFooters();
  return ctx.doc.save();
}

export async function buildChildPagesPdf(data) {
  const ctx = await createPdfContext(data);

  data.childPages.forEach(function (child) {
    ctx.addFullHeaderPage();

    ctx.getPage().drawText(data.title, { x: MARGIN_X, y: ctx.getY(), size: 19, font: ctx.headingFont, color: GREEN });
    ctx.setY(ctx.getY() - 26);

    ctx.getPage().drawText(data.clientLabel + ':  ' + data.clientName, { x: MARGIN_X, y: ctx.getY(), size: 11, font: ctx.bodyFont, color: INK });
    ctx.setY(ctx.getY() - 15);
    ctx.getPage().drawText('Session date:  ' + data.sessionDate, { x: MARGIN_X, y: ctx.getY(), size: 11, font: ctx.bodyFont, color: INK });
    ctx.setY(ctx.getY() - 24);

    ctx.getPage().drawText('Pupil:  ' + child.pupilName, { x: MARGIN_X, y: ctx.getY(), size: 15, font: ctx.headingFont, color: GREEN });
    ctx.setY(ctx.getY() - 30);

    (child.sections || [])
      .filter(function (s) { return s && s.content; })
      .forEach(function (section) {
        ctx.drawSection(section.heading, section.content);
      });
  });

  ctx.drawFooters();
  return ctx.doc.save();
}

export async function buildResourcePdf(data) {
  const ctx = await createPdfContext(data);
  ctx.addFullHeaderPage();

  if (data.eyebrow) {
    ctx.getPage().drawText(data.eyebrow.toUpperCase(), { x: MARGIN_X, y: ctx.getY(), size: 10.5, font: ctx.bodyBoldFont, color: MUTED_GREEN });
    ctx.setY(ctx.getY() - 20);
  }

  ctx.getPage().drawText(data.title, { x: MARGIN_X, y: ctx.getY(), size: 24, font: ctx.headingFont, color: GREEN });
  ctx.setY(ctx.getY() - 30);

  if (data.intro) {
    const introLines = contentToLines(ctx.bodyFont, 11, CONTENT_WIDTH, data.intro);
    introLines.forEach(function (line) {
      ctx.ensureSpace(16);
      if (line) ctx.getPage().drawText(line, { x: MARGIN_X, y: ctx.getY(), size: 11, font: ctx.bodyFont, color: INK });
      ctx.setY(ctx.getY() - 16);
    });
    ctx.setY(ctx.getY() - 10);
  }

  (data.sections || []).forEach(function (section) {
    if (Array.isArray(section.bullets) && section.bullets.length) {
      ctx.drawBulletSection(section.heading, section.bullets);
    } else if (section.content) {
      ctx.drawSection(section.heading, section.content);
    }
  });

  if (data.closing) {
    ctx.ensureSpace(30);
    ctx.setY(ctx.getY() - 6);
    const closingLines = contentToLines(ctx.bodyFont, 10.5, CONTENT_WIDTH, data.closing);
    closingLines.forEach(function (line) {
      ctx.ensureSpace(15);
      if (line) ctx.getPage().drawText(line, { x: MARGIN_X, y: ctx.getY(), size: 10.5, font: ctx.bodyFont, color: MUTED_GREEN });
      ctx.setY(ctx.getY() - 15);
    });
  }

  ctx.drawFooters();
  return ctx.doc.save();
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
