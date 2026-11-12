import JSZip from "jszip";
import { jsPDF } from "jspdf";

// All export logic below runs 100% locally in browser RAM — zero network uploads.

const esc = (s) =>
  (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

async function sha256Hex(str) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function titleFilename(title) {
  const slug = (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "manuscript";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Clean document PDF ----------
function cleanManuscriptPdf(text) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 72;
  const maxW = pageW - margin * 2;
  let y = margin;

  doc.setFont("times", "normal");
  doc.setFontSize(12);

  text.split("\n").forEach((rawLine) => {
    const lines = rawLine.trim() === "" ? [""] : doc.splitTextToSize(rawLine, maxW);
    lines.forEach((line) => {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 20;
    });
  });

  return doc.output("arraybuffer");
}

// ---------- Teacher's Markup PDF (deleted / pasted / typed segments) ----------
function teacherMarkupPdf(segments, title) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 72;
  const maxW = pageW - margin * 2;
  const lineHeight = 20;

  const drawWatermark = () => {
    doc.setFont("times", "italic");
    doc.setFontSize(28);
    doc.setTextColor(236, 236, 240);
    doc.text("NANA PROJECT EVALUATION", pageW / 2, pageH / 2, { angle: 40, align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(12);
  };

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(`Teacher's Markup View${title ? ` — ${title}` : ""}`, pageW / 2, margin, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Red strikethrough = deleted by author  ·  Yellow = pasted content  ·  Black = typed manually", pageW / 2, margin + 16, { align: "center" });
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(12);

  let y = margin + 48;
  let x = margin;

  const newLine = () => {
    if (y + lineHeight > pageH - margin) {
      drawWatermark();
      doc.addPage();
      y = margin;
    } else {
      y += lineHeight;
    }
    x = margin;
  };

  const emit = (token, kind) => {
    const w = doc.getTextWidth(token);
    if (x + w > margin + maxW) newLine();
    if (kind === "pasted") {
      doc.setFillColor(255, 235, 150);
      doc.rect(x - 1, y - 10, w + 2, lineHeight - 4, "F");
    }
    if (kind === "deleted") {
      doc.setTextColor(204, 32, 32);
      doc.text(token, x, y);
      doc.setDrawColor(204, 32, 32);
      doc.line(x, y - 3, x + w, y - 3);
      doc.setTextColor(40, 40, 40);
    } else {
      doc.text(token, x, y);
    }
    x += w;
  };

  (segments.length ? segments : [{ text: "", kind: "typed" }]).forEach((seg) => {
    const lines = (seg.text || "").split("\n");
    lines.forEach((ln, li) => {
      if (li > 0) newLine();
      if (!ln) return;
      ln.split(/(\s+)/).forEach((tok) => {
        if (tok) emit(tok, seg.kind);
      });
    });
  });

  drawWatermark();
  return doc.output("arraybuffer");
}

// ---------- ZIP: clean PDF + teacher markup PDF + tamper-evident token ----------
export async function exportZip(text, { segments, title, wordCount }) {
  const clean = cleanManuscriptPdf(text);
  const markup = teacherMarkupPdf(segments, title);
  const deletedCount = segments.filter((s) => s.kind === "deleted").length;
  const pastedCount = segments.filter((s) => s.kind === "pasted").length;

  const baseline = JSON.stringify({ manuscript: text, final_word_count: wordCount });
  const baselineSha256 = await sha256Hex(baseline);

  const zip = new JSZip();
  zip.file(`${titleFilename(title)}_Clean_Document.pdf`, clean);
  zip.file(`${titleFilename(title)}_Teachers_Markup.pdf`, markup);
  zip.file(
    "proof_token.nana.json",
    JSON.stringify(
      {
        app: "NaNa-ViewBook",
        generated_at: new Date().toISOString(),
        document_title: title || "Untitled Document",
        final_word_count: wordCount,
        deleted_fragments_count: deletedCount,
        pasted_fragments_count: pastedCount,
        tamper_evident: {
          algorithm: "SHA-256",
          baseline_sha256: baselineSha256,
          baseline_footprint: baseline,
        },
        network_uploads: 0,
        storage_mode: "local-browser-session-only",
      },
      null,
      2
    )
  );

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${titleFilename(title)}_Secure_Archive.zip`);
}

// ---------- Word (.docx), built by hand with JSZip ----------
export async function exportDocx(text, title) {
  const paragraphs = text
    .split("\n")
    .map((line) =>
      line ? `<w:p><w:r><w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>` : "<w:p/>"
    )
    .join("");

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
  );
  zip.folder("_rels").file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  );
  const word = zip.folder("word");
  word.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`
  );
  const docRels = word.folder("_rels");
  docRels.file(
    "document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  );

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  downloadBlob(blob, `${titleFilename(title)}.docx`);
}

// ---------- PowerPoint (.pptx), built by hand with JSZip ----------
function slideSections(text, title) {
  const slides = [];
  let current = null;
  text
    .split("\n")
    .map((l) => l.trim())
    .forEach((line) => {
      if (!line) return;
      if (/:$/.test(line)) {
        current = { title: line.replace(/:$/, ""), bullets: [] };
        slides.push(current);
      } else if (!current) {
        current = { title: line.length > 48 ? `${line.slice(0, 48)}…` : line, bullets: [] };
        slides.push(current);
      } else {
        current.bullets.push(line);
      }
    });
  if (!slides.length) slides.push({ title: title || "Document", bullets: [] });
  return slides;
}

const P_NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

function slideXml(title, bullets) {
  const bulletParas = bullets
    .map((b) => `<a:p><a:pPr marL="285750" indent="-285750"/><a:r><a:rPr lang="en-US" sz="1600"/><a:t>${esc(b)}</a:t></a:r></a:p>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${P_NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="838200" y="365125"/><a:ext cx="10515600" cy="1143000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="3200" b="1"/><a:t>${esc(title)}</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="838200" y="1758950"/><a:ext cx="10515600" cy="4495800"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${bulletParas || '<a:p/>'}</p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

export async function exportPptx(text, title) {
  const slides = slideSections(text, title);

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides
      .map(
        (_, i) =>
          `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
      )
      .join("")}</Types>`
  );
  zip.folder("_rels").file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`
  );

  const ppt = zip.folder("ppt");
  const slideIds = slides
    .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`)
    .join("");
  ppt.file(
    "presentation.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${P_NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`
  );
  ppt.folder("_rels").file(
    "presentation.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>${slides
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
      )
      .join("")}</Relationships>`
  );

  const master = ppt.folder("slideMasters");
  master.file(
    "slideMaster1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${P_NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="bg1" tx1="tx1" bg2="bg2" tx2="tx2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:sldMaster>`
  );
  master.folder("_rels").file(
    "slideMaster1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`
  );

  const layouts = ppt.folder("slideLayouts");
  layouts.file(
    "slideLayout1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${P_NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
  );
  layouts.folder("_rels").file(
    "slideLayout1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`
  );

  const slidesFolder = ppt.folder("slides");
  slides.forEach((s, i) => {
    slidesFolder.file(`slide${i + 1}.xml`, slideXml(s.title, s.bullets));
  });
  // slide rels (each slide references the blank layout)
  const slideRels = slidesFolder.folder("_rels");
  slides.forEach((_, i) => {
    slideRels.file(
      `slide${i + 1}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`
    );
  });

  ppt.folder("theme").file(
    "theme1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="NaNa"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`
  );

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  downloadBlob(blob, `${titleFilename(title)}.pptx`);
}
