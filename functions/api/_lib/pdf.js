import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_GREEN_PNG_BASE64 } from './logo-green.js';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 54;
const HEADER_HEIGHT = 176;
const TOP_BAR_HEIGHT = 14;
const BOTTOM_MARGIN = 56;
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

export async function buildReportPdf(data) {
  const doc = await PDFDocument.create();
  doc.setTitle(data.title + ' - ' + data.clientName);
  doc.setProducer('SEN Support Studio');

  const headingFont = await doc.embedFont(StandardFonts.TimesRomanBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const bodyBoldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await doc.embedPng(base64ToBytes(LOGO_GREEN_PNG_BASE64));

  const pages = [];
  let page;
  let y;

  function paintBackground(p) {
    p.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: CREAM });
  }

  function addFirstPage() {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    paintBackground(page);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - HEADER_HEIGHT, width: PAGE_WIDTH, height: HEADER_HEIGHT, color: GREEN });

    const logoW = 132;
    const logoH = logoW * (logoImage.height / logoImage.width);
    page.drawImage(logoImage, {
      x: (PAGE_WIDTH - logoW) / 2,
      y: PAGE_HEIGHT - HEADER_HEIGHT + (HEADER_HEIGHT - logoH) / 2,
      width: logoW,
      height: logoH
    });

    y = PAGE_HEIGHT - HEADER_HEIGHT - 42;

    page.drawText(data.title, { x: MARGIN_X, y, size: 19, font: headingFont, color: GREEN });
    y -= 26;

    page.drawText(data.clientLabel + ':  ' + data.clientName, { x: MARGIN_X, y, size: 11, font: bodyBoldFont, color: INK });
    y -= 15;
    page.drawText('Session date:  ' + data.sessionDate, { x: MARGIN_X, y, size: 11, font: bodyFont, color: INK });
    y -= 28;
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

  addFirstPage();

  data.sections
    .filter(function (s) { return s && s.content; })
    .forEach(function (section) {
      ensureSpace(18 + 14);
      page.drawText(section.heading, { x: MARGIN_X, y, size: 13, font: headingFont, color: GREEN });
      y -= 18;

      const lines = contentToLines(bodyFont, 10.5, CONTENT_WIDTH, section.content);
      lines.forEach(function (line) {
        ensureSpace(14);
        if (line) page.drawText(line, { x: MARGIN_X, y, size: 10.5, font: bodyFont, color: INK });
        y -= 14;
      });
      y -= 12;
    });

  pages.forEach(function (p, idx) {
    p.drawText('SEN Support Studio  ·  Strong Roots, Space to Flourish', {
      x: MARGIN_X, y: 30, size: 8, font: bodyFont, color: MUTED_GREEN
    });
    const label = 'Page ' + (idx + 1) + ' of ' + pages.length;
    const labelWidth = bodyFont.widthOfTextAtSize(label, 8);
    p.drawText(label, { x: PAGE_WIDTH - MARGIN_X - labelWidth, y: 30, size: 8, font: bodyFont, color: MUTED_GREEN });
  });

  const pdfBytes = await doc.save();
  return pdfBytes;
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
