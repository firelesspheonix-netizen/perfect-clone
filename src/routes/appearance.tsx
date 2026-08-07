import { createFileRoute } from "@tanstack/react-router";
import Appearance from "@/pages/Appearance";

export const Route = createFileRoute("/appearance")({
  head: () => ({
    meta: [
      { title: "Appearance Retouch | AI Character Image Studio" },
      {
        name: "description",
        content: "Retouch faces and appearance details of your generated character images.",
      },
      { property: "og:title", content: "Appearance Retouch | AI Character Image Studio" },
      {
        property: "og:description",
        content: "Retouch faces and appearance details of your generated character images.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Appearance,
});
