export interface CardWarning {
  title: string;
  body: string;
  link?: { href: string; label: string };
}

/**
 * Per-card acceptance notices shown on the sell page and the trade form.
 * Keep the copy explicit — these are the cards users most often submit wrong.
 */
export function cardWarnings(name?: string | null, slug?: string | null): CardWarning[] {
  const n = (name || "").toLowerCase();
  const s = slug || "";
  const warnings: CardWarning[] = [];

  if (n.replace(/-/g, "").includes("xbox") || s === "xbox" || s === "x-box") {
    warnings.push({
      title: "Only Xbox gift cards are accepted.",
      body: "Xbox/Microsoft PC Game Pass and membership or subscription cards are not acceptable — trades submitted with them will be rejected.",
    });
  }

  if (n.includes("one4all") || s.includes("one4all")) {
    warnings.push({
      title: "Restaurant One4all cards are not acceptable.",
      body: "Only standard One4all multi-store gift cards are accepted. Restaurant One4all cards or codes are not acceptable — trades submitted with them will be rejected.",
    });
  }

  if (n.includes("starbucks") || s === "starbucks") {
    warnings.push({
      title: "Check your card balance before submitting.",
      body: "Visit the Starbucks website to check your gift card balance before uploading your card or code.",
      link: { href: "https://www.starbucks.com/gift#CheckBalance", label: "starbucks.com/gift#CheckBalance" },
    });
  }

  return warnings;
}
