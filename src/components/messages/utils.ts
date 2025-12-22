export const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const MS_PER_MIN = 60_000;
const MS_PER_HR = 60 * MS_PER_MIN;
const MS_PER_DAY = 24 * MS_PER_HR;

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();

  if (diffMs < MS_PER_MIN) return "Just now";
  if (diffMs < MS_PER_HR) {
    const m = Math.floor(diffMs / MS_PER_MIN);
    return `${m} min ago`;
  }
  if (diffMs < MS_PER_DAY) {
    const h = Math.floor(diffMs / MS_PER_HR);
    return `${h} hr${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diffMs / MS_PER_DAY);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export const isMockConversationId = (id: string) => id.startsWith("mock-");

export function safeSender(sender: any): "user" | "them" {
  return sender === "them" ? "them" : "user";
}
