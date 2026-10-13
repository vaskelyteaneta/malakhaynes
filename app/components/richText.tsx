import React from "react";
import type { RichTextComponents } from "@prismicio/react";

/**
 * An empty paragraph — what you get by pressing Enter on a blank line in the
 * Prismic editor — carries no text, so the browser gives it zero height and
 * the blank line disappears on the page. The workaround was to type a "." or
 * a "-" purely to make the line exist.
 *
 * Rendering a <br> inside an otherwise-empty paragraph gives it one line box
 * of height, so a blank line in the editor is a blank line on the site. A
 * paragraph that does have text is untouched.
 */
function paragraphSerializer(style?: React.CSSProperties): RichTextComponents {
  return {
    paragraph: ({ node, children, key }) => (
      <p key={key} style={style}>
        {node.text.trim() === "" ? <br /> : children}
      </p>
    ),
    // Text pasted from Word, a PDF or a design tool often arrives with every
    // space turned into a non-breaking space. A non-breaking space forbids a
    // line break, so such a line becomes one unbreakable word and runs off the
    // side of its column instead of wrapping — the credits on /aquarelle had
    // 70 of them and not a single ordinary space. Render them as ordinary
    // spaces so the text wraps; a deliberate non-breaking space is not worth
    // the pages that silently overflow.
    span: ({ text, key }) =>
      text.includes("\u00a0") ? <React.Fragment key={key}>{text.replace(/\u00a0/g, " ")}</React.Fragment> : text,
  };
}

/**
 * Captions, shared captions and section titles. These already carried a small
 * vertical margin inline; it is kept here verbatim so nothing shifts.
 */
export const captionRichText = paragraphSerializer({ margin: "0.1em 0" });

/** Text blocks and the footer, whose paragraphs render unstyled. */
export const plainRichText = paragraphSerializer();
