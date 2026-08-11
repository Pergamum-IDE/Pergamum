import MarkdownIt from "markdown-it";
import type { PreviewRenderer } from "./previewRenderer";

const markdown = new MarkdownIt({
  html: false,
  linkify: true
});

export const markdownPreviewRenderer: PreviewRenderer = {
  render: (content) => markdown.render(content)
};
