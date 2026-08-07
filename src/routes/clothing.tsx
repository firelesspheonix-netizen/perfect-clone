import { createFileRoute } from "@tanstack/react-router";
import ClothingEditor from "@/pages/ClothingEditor";

export const Route = createFileRoute("/clothing")({
  head: () => ({
    meta: [
      { title: "Clothing Editor | AI Character Image Studio" },
      {
        name: "description",
        content: "Edit and swap outfits on your character images with AI-powered clothing edits.",
      },
      { property: "og:title", content: "Clothing Editor | AI Character Image Studio" },
      {
        property: "og:description",
        content: "Edit and swap outfits on your character images with AI-powered clothing edits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClothingEditor,
});
