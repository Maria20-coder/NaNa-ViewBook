import React, { useEffect, useRef, useState } from "react";
import useWritingEngine from "@/hooks/useWritingEngine";
import TopToolbar from "@/components/writer/TopToolbar";
import CleanSheet from "@/components/writer/CleanSheet";
import MarkupSheet from "@/components/writer/MarkupSheet";
import StatusFooter from "@/components/writer/StatusFooter";
import countWords from "@/lib/countWords";
import { exportZip, exportDocx, exportPptx } from "@/lib/exportBundle";
import { FONTS } from "@/lib/markupModel";

export default function ViewBook() {
  const engine = useWritingEngine();
  const [align, setAlign] = useState("left");
  const [markupVisible, setMarkupVisible] = useState(true);
  const selectionRef = useRef(null);

  // Keep the text selection when the font dropdown takes focus
  const rememberSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) selectionRef.current = sel.getRangeAt(0).cloneRange();
  };

  // Inline font rule: selected text gets the face, otherwise the canvas default changes
  const handleFontChange = (key) => {
    const range = selectionRef.current;
    if (range && !range.collapsed) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("fontName", false, FONTS[key].css);
    } else {
      engine.setFont(key);
    }
  };

  // Accidental close protection: ask before leaving with unsaved work
  useEffect(() => {
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);
  const [exporting, setExporting] = useState(false);
  const wordCount = countWords(engine.text);

  const handleDownload = async (kind) => {
    setExporting(true);
    try {
      if (kind === "zip") {
        await exportZip(engine.text, { segments: engine.segments, title: engine.title, wordCount });
      } else if (kind === "docx") {
        await exportDocx(engine.text, engine.title);
      } else {
        await exportPptx(engine.text, engine.title);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <TopToolbar
        font={engine.font}
        onFontChange={handleFontChange}
        onFontSelectMouseDown={rememberSelection}
        size={engine.size}
        onSizeChange={engine.setSize}
        align={align}
        onAlignChange={setAlign}
        onFormat={(cmd) => document.execCommand(cmd)}
        onDownload={handleDownload}
        exporting={exporting}
        markupVisible={markupVisible}
        onToggleMarkup={() => setMarkupVisible((v) => !v)}
        template={engine.template}
        onTemplateChange={engine.setTemplate}
        canvasBrightness={engine.canvasBrightness}
        onCanvasBrightnessChange={engine.setCanvasBrightness}
        proofBrightness={engine.proofBrightness}
        onProofBrightnessChange={engine.setProofBrightness}
      />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <section
          id="writing-canvas-zone"
          className="flex flex-1 flex-col overflow-y-auto p-4"
          style={{ filter: `brightness(${engine.canvasBrightness}%)` }}
        >
          <CleanSheet
            initialText={engine.text}
            font={engine.font}
            size={engine.size}
            align={align}
            title={engine.title}
            onTitleChange={engine.setTitle}
            onInput={engine.handleInput}
            onPaste={engine.markPaste}
            onKeyDown={engine.handleKeyDown}
            template={engine.template}
          />
        </section>
        {markupVisible && (
          <section
            id="proof-of-work-zone"
            className="flex flex-1 flex-col overflow-y-auto border-t border-slate-300 bg-slate-50 p-4 md:border-l md:border-t-0"
            style={{ filter: `brightness(${engine.proofBrightness}%)` }}
          >
            <MarkupSheet segments={engine.segments} font={engine.font} size={engine.size} align={align} template={engine.template} />
          </section>
        )}
      </div>
      <StatusFooter wordCount={wordCount} keystrokes={engine.keystrokes} corrections={engine.corrections} />
    </div>
  );
}
