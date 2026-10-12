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
  };
}

/**
 * Captions, shared captions and section titles. These already carried a small
 * vertical margin inline; it is kept here verbatim so nothing shifts.
 */
export const captionRichText = paragraphSerializer({ margin: "0.1em 0" });

/** Text blocks and the footer, whose paragraphs render unstyled. */
export const plainRichText = paragraphSerializer();
