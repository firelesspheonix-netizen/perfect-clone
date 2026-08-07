import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Character Image Studio" },
      {
        name: "description",
        content:
          "Build characters, tune generation settings and create photorealistic AI images in one studio.",
      },
      { property: "og:title", content: "AI Character Image Studio" },
      {
        property: "og:description",
        content:
          "Build characters, tune generation settings and create photorealistic AI images in one studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
