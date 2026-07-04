import { Node, mergeAttributes } from "@tiptap/core";

// KB video block: either an embedded YouTube/Vimeo player (iframe) or an
// uploaded MP4/WebM file (<video controls>). An atom block that serializes to
// self-contained HTML so it renders inline wherever the article is shown.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    kbVideo: {
      setVideoEmbed: (embedUrl: string) => ReturnType;
      setVideoFile: (src: string) => ReturnType;
    };
  }
}

export const KbVideo = Node.create({
  name: "kbVideo",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      embedUrl: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-embed-url"),
        renderHTML: (attributes) =>
          attributes.embedUrl ? { "data-embed-url": attributes.embedUrl } : {},
      },
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-src"),
        renderHTML: (attributes) =>
          attributes.src ? { "data-src": attributes.src } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-kb-video]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const embedUrl = node.attrs.embedUrl as string | null;
    const src = node.attrs.src as string | null;

    if (embedUrl) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-kb-video": "",
          class: "kb-video",
          style:
            "position:relative;width:100%;max-width:680px;margin:12px 0;aspect-ratio:16/9",
        }),
        [
          "iframe",
          {
            src: embedUrl,
            title: "Embedded video",
            style:
              "position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:8px",
            allow:
              "accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share",
            allowfullscreen: "true",
          },
        ],
      ];
    }

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-kb-video": "",
        class: "kb-video",
        style: "margin:12px 0",
      }),
      [
        "video",
        {
          controls: "true",
          playsinline: "true",
          src: src ?? "",
          style: "width:100%;max-width:680px;border-radius:8px",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (embedUrl) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { embedUrl } }),
      setVideoFile:
        (src) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { src } }),
    };
  },
});
